import fs from 'fs';
import path from 'path';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const getContactsTool: Tool = {
  name: 'get_contacts',
  description:
    'Get the list of current ACC members and HOA Board members with their contact information.',
  input_schema: {
    type: 'object' as const,
    properties: {},
  },
};

export async function getContacts(contactsDir: string): Promise<string> {
  const filePath = path.join(contactsDir, 'hoa-members.md');
  if (!fs.existsSync(filePath)) {
    return 'HOA members file not found';
  }
  return fs.readFileSync(filePath, 'utf-8');
}
