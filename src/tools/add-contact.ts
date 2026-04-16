import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { HoaContact, HoaMembers } from '../types';

export const addContactTool: Tool = {
  name: 'add_contact',
  description:
    'Add a new contact to the HOA members list. ' +
    'Specify the section ("acc" for ACC Members, "board" for Board Members), ' +
    'along with the contact\'s name, role, and optional email and phone.',
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
  contactsDir: string
): Promise<{ section: string; name: string } | string> {
  const filePath = path.join(contactsDir, 'hoa-members.md');
  if (!fs.existsSync(filePath)) return 'HOA members file not found';

  const { data, content } = matter(fs.readFileSync(filePath, 'utf-8'));
  const members: HoaMembers = { ...data } as HoaMembers;
  const key = input.section === 'acc' ? 'acc_members' : 'board_members';
  const list: HoaContact[] = [...(members[key] ?? [])];

  if (list.some((c) => c.name.toLowerCase() === input.name.toLowerCase())) {
    return `Contact "${input.name}" already exists in ${key}`;
  }

  const newContact: HoaContact = { name: input.name, role: input.role };
  if (input.email) newContact.email = input.email;
  if (input.phone) newContact.phone = input.phone;

  list.push(newContact);
  members[key] = list;

  fs.writeFileSync(filePath, matter.stringify(content, members));
  return { section: input.section, name: input.name };
}
