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
  lot_number: number;
  name: string;
  role: string;
  is_primary_contact: number;
  email: string | null;
  phone: string | null;
  mailing_address: string | null;
  notes: string | null;
  created_at: string;
}

export async function getMembers(input: GetMembersInput, db: Db, orgId: string): Promise<Member[]> {
  let sql = `
    SELECT p.id, l.lot_number as lot, p.name, la.role, la.is_primary_contact,
           p.email, p.phone, la.mailing_address, p.notes, p.created_at
    FROM lot_associations la
    JOIN parties p ON p.id = la.party_id
    JOIN lots l ON l.id = la.lot_id
    WHERE l.organization_id = ? AND la.end_date IS NULL
      AND la.role IN ('owner', 'resident')`;
  const params: unknown[] = [orgId];

  if (input.lot !== undefined) {
    sql += ' AND l.lot_number = ?';
    params.push(input.lot);
  }
  if (input.role) {
    const dbRole = input.role === 'legal_owner' ? 'owner' : 'resident';
    sql += ' AND la.role = ?';
    params.push(dbRole);
  }

  sql += ' ORDER BY l.lot_number, la.role, p.id';

  const rows = db.prepare(sql).all(...params) as MemberRow[];
  return rows.map((r) => ({
    id: r.id,
    lot: r.lot_number,
    name: r.name,
    role: (r.role === 'owner' ? 'legal_owner' : 'resident') as Member['role'],
    is_primary_contact: r.is_primary_contact === 1,
    email: r.email,
    phone: r.phone,
    mailing_address: r.mailing_address,
    notes: r.notes,
    created_at: r.created_at,
  }));
}
