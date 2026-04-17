import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import type { Db } from '../db';

export const editMemberTool: Tool = {
  name: 'edit_member',
  description: 'Update a member record in the HOA directory by ID.',
  input_schema: {
    type: 'object' as const,
    properties: {
      id: { type: 'number', description: 'Member record ID' },
      name: { type: 'string', description: 'Updated name (optional)' },
      role: {
        type: 'string',
        enum: ['legal_owner', 'resident'],
        description: 'Updated role (optional)',
      },
      is_primary_contact: { type: 'boolean', description: 'Update primary contact flag (optional)' },
      email: { type: 'string', description: 'Updated email (optional)' },
      phone: { type: 'string', description: 'Updated phone (optional)' },
      mailing_address: { type: 'string', description: 'Updated mailing address (optional)' },
      notes: { type: 'string', description: 'Updated notes (optional)' },
    },
    required: ['id'],
  },
};

export interface EditMemberInput {
  id: number;
  name?: string;
  role?: 'legal_owner' | 'resident';
  is_primary_contact?: boolean;
  email?: string;
  phone?: string;
  mailing_address?: string;
  notes?: string;
}

export async function editMember(input: EditMemberInput, db: Db): Promise<{ message: string }> {
  const fields: string[] = [];
  const params: unknown[] = [];

  if (input.name !== undefined) { fields.push('name = ?'); params.push(input.name); }
  if (input.role !== undefined) { fields.push('role = ?'); params.push(input.role); }
  if (input.is_primary_contact !== undefined) { fields.push('is_primary_contact = ?'); params.push(input.is_primary_contact ? 1 : 0); }
  if (input.email !== undefined) { fields.push('email = ?'); params.push(input.email); }
  if (input.phone !== undefined) { fields.push('phone = ?'); params.push(input.phone); }
  if (input.mailing_address !== undefined) { fields.push('mailing_address = ?'); params.push(input.mailing_address); }
  if (input.notes !== undefined) { fields.push('notes = ?'); params.push(input.notes); }

  if (fields.length === 0) return { message: 'No fields to update' };

  params.push(input.id);
  db.prepare(`UPDATE members SET ${fields.join(', ')} WHERE id = ? AND organization_id = 'emhoa'`).run(...params);

  return { message: `Updated member ${input.id}` };
}
