import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { HoaMembers } from '../types';
import type { Db } from '../db';
import { getCurrentBoardAndACC } from './get-parties';

export const getContactsTool: Tool = {
  name: 'get_contacts',
  description:
    'Get the list of current ACC members and HOA Board members with their contact information.',
  input_schema: {
    type: 'object' as const,
    properties: {},
  },
};

export async function getContacts(db: Db): Promise<HoaMembers> {
  return getCurrentBoardAndACC(db);
}
