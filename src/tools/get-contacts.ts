import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { HoaMembers, HoaContact } from '../types';
import type { Db } from '../db';

export const getContactsTool: Tool = {
  name: 'get_contacts',
  description:
    'Get the list of current ACC members and HOA Board members with their contact information.',
  input_schema: {
    type: 'object' as const,
    properties: {},
  },
};

interface ContactRow {
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  group_name: string;
}

export async function getContacts(db: Db): Promise<HoaMembers> {
  const rows = db
    .prepare(
      `SELECT name, role, email, phone, group_name
       FROM contacts
       WHERE organization_id = 'emhoa'
       ORDER BY id`
    )
    .all() as ContactRow[];

  const toContact = (r: ContactRow): HoaContact => {
    const c: HoaContact = { name: r.name, role: r.role };
    if (r.email) c.email = r.email;
    if (r.phone) c.phone = r.phone;
    return c;
  };

  return {
    acc_members: rows.filter((r) => r.group_name === 'acc_member').map(toContact),
    board_members: rows.filter((r) => r.group_name === 'board_member').map(toContact),
  };
}
