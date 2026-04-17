import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import type { Db } from '../db';

export const removeContactTool: Tool = {
  name: 'remove_contact',
  description:
    'Remove a contact from the HOA members list. ' +
    'Identify the contact by section and name.',
  input_schema: {
    type: 'object' as const,
    properties: {
      section: {
        type: 'string',
        enum: ['acc', 'board'],
        description: '"acc" for ACC Members, "board" for Board Members',
      },
      name: { type: 'string', description: 'Name of the contact to remove' },
    },
    required: ['section', 'name'],
  },
};

export interface RemoveContactInput {
  section: 'acc' | 'board';
  name: string;
}

export async function removeContact(
  input: RemoveContactInput,
  db: Db
): Promise<{ section: string; name: string } | string> {
  const groupName = input.section === 'acc' ? 'acc' : 'board';
  const today = new Date().toISOString().split('T')[0];

  const result = db
    .prepare(
      `UPDATE group_memberships
       SET end_date = ?
       WHERE id IN (
         SELECT gm.id FROM group_memberships gm
         JOIN parties p ON p.id = gm.party_id
         WHERE p.organization_id = 'emhoa'
           AND gm.group_name = ?
           AND LOWER(p.name) = LOWER(?)
           AND gm.end_date IS NULL
       )`
    )
    .run(today, groupName, input.name);

  if (result.changes === 0) {
    return `Contact "${input.name}" not found in ${groupName} members`;
  }

  return { section: input.section, name: input.name };
}
