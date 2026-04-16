import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { HoaMembers } from '../types';

export const getContactsTool: Tool = {
  name: 'get_contacts',
  description:
    'Get the list of current ACC members and HOA Board members with their contact information.',
  input_schema: {
    type: 'object' as const,
    properties: {},
  },
};

export async function getContacts(contactsDir: string): Promise<HoaMembers | string> {
  const filePath = path.join(contactsDir, 'hoa-members.md');
  if (!fs.existsSync(filePath)) {
    return 'HOA members file not found';
  }
  const { data } = matter(fs.readFileSync(filePath, 'utf-8'));
  return data as HoaMembers;
}
