import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import type { Db } from '../db';
import type { Member } from '../types';

export const getMembersTool: Tool = {
  name: 'get_members',
  description: 'Get HOA members (legal owners and/or residents) from the member directory. Filterable by lot number or role.',
  input_schema: {
    type: 'object' as const,
    properties: {
      lot: {
        type: 'number',
        description: 'Filter to a specific lot number (optional)',
      },
      role: {
        type: 'string',
        enum: ['legal_owner', 'resident'],
        description: 'Filter by role (optional)',
      },
    },
  },
};

export interface GetMembersInput {
  lot?: number;
  role?: 'legal_owner' | 'resident';
}

interface MemberRow {
  id: number;
  lot: number;
  name: string;
  role: string;
  is_primary_contact: number;
  email: string | null;
  phone: string | null;
  mailing_address: string | null;
  notes: string | null;
  created_at: string;
}

export async function getMembers(input: GetMembersInput, db: Db): Promise<Member[]> {
  let sql = `SELECT id, lot, name, role, is_primary_contact, email, phone, mailing_address, notes, created_at
             FROM members WHERE organization_id = 'emhoa'`;
  const params: unknown[] = [];

  if (input.lot !== undefined) {
    sql += ' AND lot = ?';
    params.push(input.lot);
  }
  if (input.role) {
    sql += ' AND role = ?';
    params.push(input.role);
  }

  sql += ' ORDER BY lot, role, id';

  const rows = db.prepare(sql).all(...params) as MemberRow[];
  return rows.map((r) => ({
    ...r,
    role: r.role as Member['role'],
    is_primary_contact: r.is_primary_contact === 1,
  }));
}
