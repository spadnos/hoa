import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import type { Db } from '../db';

export const editMemberTool: Tool = {
  name: 'edit_member',
  description: 'Update a member record in the HOA directory by party ID.',
  input_schema: {
    type: 'object' as const,
    properties: {
      id: { type: 'number', description: 'Party ID' },
      name: { type: 'string', description: 'Updated name (optional)' },
      role: {
        type: 'string',
        enum: ['legal_owner', 'resident'],
        description: 'Updated role for the lot association (optional)',
      },
      is_primary_contact: { type: 'boolean', description: 'Update primary contact flag (optional)' },
      email: { type: 'string', description: 'Updated email (optional)' },
      phone: { type: 'string', description: 'Updated phone (optional)' },
      mailing_address: { type: 'string', description: 'Updated mailing address (optional)' },
      notes: { type: 'string', description: 'Updated notes (optional)' },
      lot: { type: 'number', description: 'Lot number to scope association update (optional)' },
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
  lot?: number;
}

export async function editMember(input: EditMemberInput, db: Db): Promise<{ message: string }> {
  const partyFields: string[] = [];
  const partyParams: unknown[] = [];

  if (input.name !== undefined) { partyFields.push('name = ?'); partyParams.push(input.name); }
  if (input.email !== undefined) { partyFields.push('email = ?'); partyParams.push(input.email); }
  if (input.phone !== undefined) { partyFields.push('phone = ?'); partyParams.push(input.phone); }
  if (input.notes !== undefined) { partyFields.push('notes = ?'); partyParams.push(input.notes); }

  if (partyFields.length > 0) {
    partyParams.push(input.id);
    db.prepare(`UPDATE parties SET ${partyFields.join(', ')} WHERE id = ? AND organization_id = 'emhoa'`).run(...partyParams);
  }

  if (input.role !== undefined || input.is_primary_contact !== undefined || input.mailing_address !== undefined) {
    const assocFields: string[] = [];
    const assocParams: unknown[] = [];

    if (input.role !== undefined) {
      const dbRole = input.role === 'legal_owner' ? 'owner' : 'resident';
      assocFields.push('role = ?');
      assocParams.push(dbRole);
    }
    if (input.is_primary_contact !== undefined) {
      assocFields.push('is_primary_contact = ?');
      assocParams.push(input.is_primary_contact ? 1 : 0);
    }
    if (input.mailing_address !== undefined) {
      assocFields.push('mailing_address = ?');
      assocParams.push(input.mailing_address);
    }

    if (assocFields.length > 0) {
      let assocSql = `UPDATE lot_associations SET ${assocFields.join(', ')}
                      WHERE party_id = ? AND end_date IS NULL`;
      assocParams.push(input.id);
      if (input.lot !== undefined) {
        assocSql += ` AND lot_id = (SELECT id FROM lots WHERE organization_id = 'emhoa' AND lot_number = ?)`;
        assocParams.push(input.lot);
      }
      db.prepare(assocSql).run(...assocParams);
    }
  }

  return { message: `Updated member ${input.id}` };
}
