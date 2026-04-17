import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import type { Db } from '../db';

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
  const groupName = input.section === 'acc' ? 'acc_member' : 'board_member';

  const existing = db
    .prepare(
      `SELECT id FROM contacts
       WHERE organization_id = 'emhoa' AND group_name = ? AND LOWER(name) = LOWER(?)`
    )
    .get(groupName, input.name);

  if (existing) {
    return `Contact "${input.name}" already exists in ${groupName}s`;
  }

  db.prepare(
    `INSERT INTO contacts (organization_id, name, role, group_name, email, phone)
     VALUES ('emhoa', ?, ?, ?, ?, ?)`
  ).run(input.name, input.role, groupName, input.email ?? null, input.phone ?? null);

  return { section: input.section, name: input.name };
}
