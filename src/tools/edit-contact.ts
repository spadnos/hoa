import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { HoaContact, HoaMembers } from '../types';

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
  contactsDir: string
): Promise<{ section: string; name: string } | string> {
  const filePath = path.join(contactsDir, 'hoa-members.md');
  if (!fs.existsSync(filePath)) return 'HOA members file not found';

  const { data, content } = matter(fs.readFileSync(filePath, 'utf-8'));
  const members: HoaMembers = { ...data } as HoaMembers;
  const key = input.section === 'acc' ? 'acc_members' : 'board_members';
  const list: HoaContact[] = members[key] ?? [];

  const idx = list.findIndex((c) => c.name.toLowerCase() === input.name.toLowerCase());
  if (idx === -1) return `Contact "${input.name}" not found in ${key}`;

  const updated = { ...list[idx], ...input.fields };
  members[key] = list.map((c, i) => (i === idx ? updated : c));

  fs.writeFileSync(filePath, matter.stringify(content, members));
  return { section: input.section, name: updated.name };
}
