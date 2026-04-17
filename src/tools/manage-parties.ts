import type { Db } from '../db';
import type { LotAssociationRole, OrgType } from '../types';

export interface CreatePartyInput {
  type: 'person' | 'organization';
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  org_type?: OrgType;
  website?: string;
}

export interface UpdatePartyInput {
  name?: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  org_type?: OrgType;
  website?: string | null;
}

export interface AddLotAssociationInput {
  lot_number: number;
  party_id: number;
  role: LotAssociationRole;
  address?: string;
  unit?: string | null;
  is_primary_contact?: boolean;
  mailing_address?: string | null;
  start_date?: string | null;
}

export interface AddGroupMembershipInput {
  party_id: number;
  group_name: string;
  title?: string;
  start_date?: string | null;
}

export interface AddPartyAffiliationInput {
  person_party_id: number;
  org_party_id: number;
  title?: string;
}

export function createParty(input: CreatePartyInput, db: Db): { id: number } {
  const result = db
    .prepare(
      `INSERT INTO parties (organization_id, type, name, email, phone, notes)
       VALUES ('emhoa', ?, ?, ?, ?, ?)`
    )
    .run(
      input.type,
      input.name,
      input.email ?? null,
      input.phone ?? null,
      input.notes ?? null
    );

  const id = result.lastInsertRowid as number;

  if (input.type === 'organization' && input.org_type) {
    db.prepare(
      `INSERT INTO party_orgs (party_id, org_type, website) VALUES (?, ?, ?)`
    ).run(id, input.org_type, input.website ?? null);
  }

  return { id };
}

export function updateParty(id: number, input: UpdatePartyInput, db: Db): { message: string } {
  const fields: string[] = [];
  const params: unknown[] = [];

  if (input.name !== undefined) { fields.push('name = ?'); params.push(input.name); }
  if ('email' in input) { fields.push('email = ?'); params.push(input.email ?? null); }
  if ('phone' in input) { fields.push('phone = ?'); params.push(input.phone ?? null); }
  if ('notes' in input) { fields.push('notes = ?'); params.push(input.notes ?? null); }

  if (fields.length > 0) {
    params.push(id);
    db.prepare(`UPDATE parties SET ${fields.join(', ')} WHERE id = ? AND organization_id = 'emhoa'`).run(...params);
  }

  if (input.org_type !== undefined || 'website' in input) {
    const orgFields: string[] = [];
    const orgParams: unknown[] = [];
    if (input.org_type !== undefined) { orgFields.push('org_type = ?'); orgParams.push(input.org_type); }
    if ('website' in input) { orgFields.push('website = ?'); orgParams.push(input.website ?? null); }
    if (orgFields.length > 0) {
      orgParams.push(id);
      db.prepare(
        `INSERT INTO party_orgs (party_id, org_type, website) VALUES (?, ?, ?)
         ON CONFLICT(party_id) DO UPDATE SET ${orgFields.join(', ')}`
      ).run(id, input.org_type ?? 'other', input.website ?? null, ...orgParams);
    }
  }

  return { message: `Updated party ${id}` };
}

export function deleteParty(id: number, db: Db): { message: string } {
  const result = db
    .prepare(`DELETE FROM parties WHERE id = ? AND organization_id = 'emhoa'`)
    .run(id);
  if (result.changes === 0) return { message: `Party ${id} not found` };
  return { message: `Deleted party ${id}` };
}

export function addLotAssociation(input: AddLotAssociationInput, db: Db): { id: number } {
  let lotRow = db
    .prepare(`SELECT id FROM lots WHERE organization_id = 'emhoa' AND lot_number = ?`)
    .get(input.lot_number) as { id: number } | undefined;

  if (!lotRow) {
    const r = db
      .prepare(`INSERT INTO lots (organization_id, lot_number) VALUES ('emhoa', ?)`)
      .run(input.lot_number);
    lotRow = { id: r.lastInsertRowid as number };
  }

  let lot_address_id: number | null = null;
  if (input.address) {
    let addrRow = db
      .prepare(
        `SELECT id FROM lot_addresses WHERE lot_id = ? AND address = ? AND (unit IS ? OR unit = ?)`
      )
      .get(lotRow.id, input.address, input.unit ?? null, input.unit ?? null) as { id: number } | undefined;

    if (!addrRow) {
      const r = db
        .prepare(`INSERT INTO lot_addresses (lot_id, address, unit) VALUES (?, ?, ?)`)
        .run(lotRow.id, input.address, input.unit ?? null);
      addrRow = { id: r.lastInsertRowid as number };
    }
    lot_address_id = addrRow.id;
  }

  const result = db
    .prepare(
      `INSERT INTO lot_associations (lot_id, lot_address_id, party_id, role, is_primary_contact, mailing_address, start_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      lotRow.id,
      lot_address_id,
      input.party_id,
      input.role,
      input.is_primary_contact ? 1 : 0,
      input.mailing_address ?? null,
      input.start_date ?? null
    );

  return { id: result.lastInsertRowid as number };
}

export function endLotAssociation(id: number, db: Db): { message: string } {
  const today = new Date().toISOString().split('T')[0];
  db.prepare(`UPDATE lot_associations SET end_date = ? WHERE id = ?`).run(today, id);
  return { message: `Ended lot association ${id}` };
}

export function addGroupMembership(input: AddGroupMembershipInput, db: Db): { id: number } {
  const result = db
    .prepare(
      `INSERT INTO group_memberships (party_id, group_name, title, start_date)
       VALUES (?, ?, ?, ?)`
    )
    .run(
      input.party_id,
      input.group_name,
      input.title ?? null,
      input.start_date ?? null
    );
  return { id: result.lastInsertRowid as number };
}

export function endGroupMembership(id: number, db: Db): { message: string } {
  const today = new Date().toISOString().split('T')[0];
  db.prepare(`UPDATE group_memberships SET end_date = ? WHERE id = ?`).run(today, id);
  return { message: `Ended group membership ${id}` };
}

export function addPartyAffiliation(input: AddPartyAffiliationInput, db: Db): { id: number } {
  const result = db
    .prepare(
      `INSERT INTO party_affiliations (person_party_id, org_party_id, title)
       VALUES (?, ?, ?)`
    )
    .run(input.person_party_id, input.org_party_id, input.title ?? null);
  return { id: result.lastInsertRowid as number };
}

export function removePartyAffiliation(id: number, db: Db): { message: string } {
  db.prepare(`DELETE FROM party_affiliations WHERE id = ?`).run(id);
  return { message: `Removed affiliation ${id}` };
}

export function getOrCreateParty(
  input: { name: string; email?: string | null; phone?: string | null; notes?: string | null },
  db: Db
): number {
  if (input.email) {
    const existing = db
      .prepare(`SELECT id FROM parties WHERE organization_id = 'emhoa' AND email = ? AND type = 'person'`)
      .get(input.email) as { id: number } | undefined;
    if (existing) return existing.id;
  }

  const existing = db
    .prepare(`SELECT id FROM parties WHERE organization_id = 'emhoa' AND name = ? AND type = 'person' AND email IS NULL`)
    .get(input.name) as { id: number } | undefined;
  if (existing && !input.email) return existing.id;

  const r = db
    .prepare(`INSERT INTO parties (organization_id, type, name, email, phone, notes) VALUES ('emhoa', 'person', ?, ?, ?, ?)`)
    .run(input.name, input.email ?? null, input.phone ?? null, input.notes ?? null);
  return r.lastInsertRowid as number;
}
