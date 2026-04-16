import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { HoaContact, HoaMembers } from '../types';

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
  contactsDir: string
): Promise<{ section: string; name: string } | string> {
  const filePath = path.join(contactsDir, 'hoa-members.md');
  if (!fs.existsSync(filePath)) return 'HOA members file not found';

  const { data, content } = matter(fs.readFileSync(filePath, 'utf-8'));
  const members: HoaMembers = { ...data } as HoaMembers;
  const key = input.section === 'acc' ? 'acc_members' : 'board_members';
  const list: HoaContact[] = members[key] ?? [];

  const before = list.length;
  members[key] = list.filter((c) => c.name.toLowerCase() !== input.name.toLowerCase());

  if (members[key].length === before) {
    return `Contact "${input.name}" not found in ${key}`;
  }

  fs.writeFileSync(filePath, matter.stringify(content, members));
  return { section: input.section, name: input.name };
}
