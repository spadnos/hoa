import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import type { Db } from '../db';
import { getOrCreateParty, addLotAssociation } from './manage-parties';

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
  const partyId = getOrCreateParty(
    { name: input.name, email: input.email, phone: input.phone, notes: input.notes },
    db
  );

  const assoc = addLotAssociation(
    {
      lot_number: input.lot,
      party_id: partyId,
      role: input.role === 'legal_owner' ? 'owner' : 'resident',
      is_primary_contact: input.is_primary_contact ?? false,
      mailing_address: input.mailing_address,
    },
    db
  );

  return { id: partyId, message: `Added ${input.role} "${input.name}" for lot ${input.lot}` };
}
