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
  db: Db,
  orgId: string
): Promise<{ section: string; name: string } | string> {
  const groupName = input.section === 'acc' ? 'acc' : 'board';

  const row = db
    .prepare(
      `SELECT p.id as party_id, gm.id as membership_id
       FROM group_memberships gm
       JOIN parties p ON p.id = gm.party_id
       WHERE p.organization_id = ?
         AND gm.group_name = ?
         AND LOWER(p.name) = LOWER(?)
         AND gm.end_date IS NULL`
    )
    .get(orgId, groupName, input.name) as { party_id: number; membership_id: number } | undefined;

  if (!row) return `Contact "${input.name}" not found in ${groupName} members`;

  const { name, role, email, phone } = input.fields;

  if (name !== undefined || email !== undefined || phone !== undefined) {
    const sets: string[] = [];
    const values: unknown[] = [];
    if (name !== undefined) { sets.push('name = ?'); values.push(name); }
    if (email !== undefined) { sets.push('email = ?'); values.push(email); }
    if (phone !== undefined) { sets.push('phone = ?'); values.push(phone); }
    values.push(row.party_id);
    db.prepare(`UPDATE parties SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  }

  if (role !== undefined) {
    db.prepare(`UPDATE group_memberships SET title = ? WHERE id = ?`).run(role, row.membership_id);
  }

  const finalName = (input.fields.name ?? input.name) as string;
  return { section: input.section, name: finalName };
}
