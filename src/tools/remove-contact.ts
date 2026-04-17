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
  const groupName = input.section === 'acc' ? 'acc_member' : 'board_member';

  const result = db
    .prepare(
      `DELETE FROM contacts
       WHERE organization_id = 'emhoa' AND group_name = ? AND LOWER(name) = LOWER(?)`
    )
    .run(groupName, input.name);

  if (result.changes === 0) {
    return `Contact "${input.name}" not found in ${groupName}s`;
  }

  return { section: input.section, name: input.name };
}
