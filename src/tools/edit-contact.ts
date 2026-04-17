import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { HoaContact } from '../types';
import type { Db } from '../db';

export const editContactTool: Tool = {
  name: 'edit_contact',
  description:
    'Edit an existing contact in the HOA members list. ' +
    'Identify the contact by section and current name. ' +
    'Pass only the fields you want to change.',
  input_schema: {
    type: 'object' as const,
    properties: {
      section: {
        type: 'string',
        enum: ['acc', 'board'],
        description: '"acc" for ACC Members, "board" for Board Members',
      },
      name: { type: 'string', description: 'Current name of the contact to edit' },
      fields: {
        type: 'object',
        description: 'Fields to update: name, role, email, phone (all optional)',
        properties: {
          name: { type: 'string' },
          role: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
        },
      },
    },
    required: ['section', 'name', 'fields'],
  },
};

export interface EditContactInput {
  section: 'acc' | 'board';
  name: string;
  fields: Partial<HoaContact>;
}

export async function editContact(
  input: EditContactInput,
  db: Db
): Promise<{ section: string; name: string } | string> {
  const groupName = input.section === 'acc' ? 'acc_member' : 'board_member';

  const row = db
    .prepare(
      `SELECT id FROM contacts
       WHERE organization_id = 'emhoa' AND group_name = ? AND LOWER(name) = LOWER(?)`
    )
    .get(groupName, input.name) as { id: number } | undefined;

  if (!row) return `Contact "${input.name}" not found in ${groupName}s`;

  const { name, role, email, phone } = input.fields;
  const sets: string[] = [];
  const values: unknown[] = [];

  if (name !== undefined) {
    sets.push('name = ?');
    values.push(name);
  }
  if (role !== undefined) {
    sets.push('role = ?');
    values.push(role);
  }
  if (email !== undefined) {
    sets.push('email = ?');
    values.push(email);
  }
  if (phone !== undefined) {
    sets.push('phone = ?');
    values.push(phone);
  }

  if (sets.length > 0) {
    values.push(row.id);
    db.prepare(`UPDATE contacts SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  }

  const finalName = (input.fields.name ?? input.name) as string;
  return { section: input.section, name: finalName };
}
