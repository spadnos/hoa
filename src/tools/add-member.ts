import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import type { Db } from '../db';

export const addMemberTool: Tool = {
  name: 'add_member',
  description: 'Add a legal owner or resident to the HOA member directory for a specific lot.',
  input_schema: {
    type: 'object' as const,
    properties: {
      lot: { type: 'number', description: 'Lot number' },
      name: { type: 'string', description: 'Full name' },
      role: {
        type: 'string',
        enum: ['legal_owner', 'resident'],
        description: 'legal_owner for HOA records/billing, resident for neighbor directory',
      },
      is_primary_contact: {
        type: 'boolean',
        description: 'Mark as the primary contact for this lot and role (default false)',
      },
      email: { type: 'string', description: 'Email address (optional)' },
      phone: { type: 'string', description: 'Phone number (optional)' },
      mailing_address: { type: 'string', description: 'Mailing address if different from lot (optional)' },
      notes: { type: 'string', description: 'Internal notes (optional)' },
    },
    required: ['lot', 'name', 'role'],
  },
};

export interface AddMemberInput {
  lot: number;
  name: string;
  role: 'legal_owner' | 'resident';
  is_primary_contact?: boolean;
  email?: string;
  phone?: string;
  mailing_address?: string;
  notes?: string;
}

export async function addMember(input: AddMemberInput, db: Db): Promise<{ id: number; message: string }> {
  const result = db
    .prepare(
      `INSERT INTO members (organization_id, lot, name, role, is_primary_contact, email, phone, mailing_address, notes)
       VALUES ('emhoa', ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.lot,
      input.name,
      input.role,
      input.is_primary_contact ? 1 : 0,
      input.email ?? null,
      input.phone ?? null,
      input.mailing_address ?? null,
      input.notes ?? null
    );

  return { id: result.lastInsertRowid as number, message: `Added ${input.role} "${input.name}" for lot ${input.lot}` };
}
