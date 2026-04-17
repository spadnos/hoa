import type { Db } from '../db';
import type {
  DirectoryParty,
  GroupMembership,
  HoaContact,
  HoaMembers,
  LotAssociation,
  OrgType,
  Party,
  PartyAffiliation,
} from '../types';

interface PartyRow {
  id: number;
  organization_id: string;
  type: 'person' | 'organization';
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  org_type: string | null;
  website: string | null;
}

interface LotAssocRow {
  id: number;
  lot_id: number;
  lot_address_id: number | null;
  party_id: number;
  role: string;
  is_primary_contact: number;
  mailing_address: string | null;
  start_date: string | null;
  end_date: string | null;
  lot_number: number;
  address: string | null;
  unit: string | null;
}

interface GroupMembershipRow {
  id: number;
  party_id: number;
  group_name: string;
  title: string | null;
  start_date: string | null;
  end_date: string | null;
}

interface AffiliationRow {
  id: number;
  person_party_id: number;
  org_party_id: number;
  title: string | null;
  org_name: string;
  person_name: string;
  person_email: string | null;
  person_phone: string | null;
  person_notes: string | null;
  person_created_at: string;
}

function buildDirectoryParty(
  row: PartyRow,
  assocRows: LotAssocRow[],
  membershipRows: GroupMembershipRow[],
  affiliationRows: AffiliationRow[]
): DirectoryParty {
  const assocs = assocRows.filter((a) => a.party_id === row.id).map((a) => ({
    ...a,
    role: a.role as LotAssociation['role'],
    is_primary_contact: a.is_primary_contact === 1,
  }));

  const memberships = membershipRows
    .filter((m) => m.party_id === row.id)
    .map((m) => ({ ...m } as GroupMembership));

  const affiliations = affiliationRows
    .filter((a) => a.person_party_id === row.id)
    .map((a) => ({ ...a, org_name: a.org_name }));

  const affiliated_persons = affiliationRows
    .filter((a) => a.org_party_id === row.id)
    .map((a) => ({
      ...a,
      person: {
        id: a.person_party_id,
        organization_id: row.organization_id,
        type: 'person' as const,
        name: a.person_name,
        email: a.person_email,
        phone: a.person_phone,
        notes: a.person_notes,
        created_at: a.person_created_at,
      } as Party,
    }));

  return {
    id: row.id,
    organization_id: row.organization_id,
    type: row.type,
    name: row.name,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    created_at: row.created_at,
    org_type: (row.org_type as OrgType) ?? undefined,
    website: row.website,
    lot_associations: assocs,
    current_memberships: memberships,
    affiliations,
    affiliated_persons,
  };
}

export async function getDirectoryParties(db: Db): Promise<DirectoryParty[]> {
  const partyRows = db
    .prepare(
      `SELECT p.*, po.org_type, po.website
       FROM parties p
       LEFT JOIN party_orgs po ON po.party_id = p.id
       WHERE p.organization_id = 'emhoa'
         AND (
           EXISTS (SELECT 1 FROM lot_associations la WHERE la.party_id = p.id AND la.end_date IS NULL)
           OR EXISTS (SELECT 1 FROM group_memberships gm WHERE gm.party_id = p.id AND gm.end_date IS NULL)
         )
       ORDER BY p.name`
    )
    .all() as PartyRow[];

  const assocRows = db
    .prepare(
      `SELECT la.*, l.lot_number, la2.address, la2.unit
       FROM lot_associations la
       JOIN lots l ON l.id = la.lot_id
       LEFT JOIN lot_addresses la2 ON la2.id = la.lot_address_id
       WHERE la.end_date IS NULL AND l.organization_id = 'emhoa'`
    )
    .all() as LotAssocRow[];

  const membershipRows = db
    .prepare(
      `SELECT gm.*
       FROM group_memberships gm
       JOIN parties p ON p.id = gm.party_id
       WHERE gm.end_date IS NULL AND p.organization_id = 'emhoa'`
    )
    .all() as GroupMembershipRow[];

  const affiliationRows = db
    .prepare(
      `SELECT pa.*, op.name as org_name,
              pp.name as person_name, pp.email as person_email, pp.phone as person_phone,
              pp.notes as person_notes, pp.created_at as person_created_at
       FROM party_affiliations pa
       JOIN parties op ON op.id = pa.org_party_id
       JOIN parties pp ON pp.id = pa.person_party_id
       WHERE op.organization_id = 'emhoa'`
    )
    .all() as AffiliationRow[];

  return partyRows.map((row) =>
    buildDirectoryParty(row, assocRows, membershipRows, affiliationRows)
  );
}

export async function getPartyById(id: number, db: Db): Promise<DirectoryParty | null> {
  const row = db
    .prepare(
      `SELECT p.*, po.org_type, po.website
       FROM parties p
       LEFT JOIN party_orgs po ON po.party_id = p.id
       WHERE p.id = ? AND p.organization_id = 'emhoa'`
    )
    .get(id) as PartyRow | undefined;

  if (!row) return null;

  const assocRows = db
    .prepare(
      `SELECT la.*, l.lot_number, la2.address, la2.unit
       FROM lot_associations la
       JOIN lots l ON l.id = la.lot_id
       LEFT JOIN lot_addresses la2 ON la2.id = la.lot_address_id
       WHERE la.party_id = ?`
    )
    .all(id) as LotAssocRow[];

  const membershipRows = db
    .prepare(`SELECT * FROM group_memberships WHERE party_id = ? ORDER BY start_date DESC, id DESC`)
    .all(id) as GroupMembershipRow[];

  const affiliationRows = db
    .prepare(
      `SELECT pa.*, op.name as org_name,
              pp.name as person_name, pp.email as person_email, pp.phone as person_phone,
              pp.notes as person_notes, pp.created_at as person_created_at
       FROM party_affiliations pa
       JOIN parties op ON op.id = pa.org_party_id
       JOIN parties pp ON pp.id = pa.person_party_id
       WHERE pa.person_party_id = ? OR pa.org_party_id = ?`
    )
    .all(id, id) as AffiliationRow[];

  return buildDirectoryParty(row, assocRows, membershipRows, affiliationRows);
}

export async function getCurrentBoardAndACC(db: Db): Promise<HoaMembers> {
  const rows = db
    .prepare(
      `SELECT p.id, p.name, p.email, p.phone, gm.title as role, gm.group_name
       FROM group_memberships gm
       JOIN parties p ON p.id = gm.party_id
       WHERE p.organization_id = 'emhoa'
         AND gm.group_name IN ('acc', 'board')
         AND gm.end_date IS NULL
       ORDER BY gm.group_name, p.name`
    )
    .all() as Array<{ id: number; name: string; email: string | null; phone: string | null; role: string; group_name: string }>;

  const toContact = (r: { id: number; name: string; email: string | null; phone: string | null; role: string }): HoaContact => {
    const c: HoaContact = { id: r.id, name: r.name, role: r.role };
    if (r.email) c.email = r.email;
    if (r.phone) c.phone = r.phone;
    return c;
  };

  return {
    acc_members: rows.filter((r) => r.group_name === 'acc').map(toContact),
    board_members: rows.filter((r) => r.group_name === 'board').map(toContact),
  };
}
