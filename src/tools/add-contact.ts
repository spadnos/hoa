import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import type { Db } from '../db';
import { getOrCreateParty, addGroupMembership } from './manage-parties';

export const addContactTool: Tool = {
  name: 'add_contact',
  description:
    'Add a new contact to the HOA members list. ' +
    'Specify the section ("acc" for ACC Members, "board" for Board Members), ' +
    "along with the contact's name, role, and optional email and phone.",
  input_schema: {
    type: 'object' as const,
    properties: {
      section: {
        type: 'string',
        enum: ['acc', 'board'],
        description: '"acc" for ACC Members, "board" for Board Members',
      },
      name: { type: 'string', description: 'Full name of the contact' },
      role: { type: 'string', description: 'Role or title, e.g. "Chair", "President"' },
      email: { type: 'string', description: 'Email address (optional)' },
      phone: { type: 'string', description: 'Phone number (optional)' },
    },
    required: ['section', 'name', 'role'],
  },
};

export interface AddContactInput {
  section: 'acc' | 'board';
  name: string;
  role: string;
  email?: string;
  phone?: string;
}

export async function addContact(
  input: AddContactInput,
  db: Db
): Promise<{ section: string; name: string } | string> {
  const groupName = input.section === 'acc' ? 'acc' : 'board';

  const existing = db
    .prepare(
      `SELECT gm.id FROM group_memberships gm
       JOIN parties p ON p.id = gm.party_id
       WHERE p.organization_id = 'emhoa'
         AND gm.group_name = ?
         AND LOWER(p.name) = LOWER(?)
         AND gm.end_date IS NULL`
    )
    .get(groupName, input.name);

  if (existing) {
    return `Contact "${input.name}" already exists in ${groupName} members`;
  }

  const partyId = getOrCreateParty(
    { name: input.name, email: input.email, phone: input.phone },
    db
  );

  addGroupMembership({ party_id: partyId, group_name: groupName, title: input.role }, db);

  return { section: input.section, name: input.name };
}
