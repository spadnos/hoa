import type { Db } from '../db';

interface LotRow {
  id: number;
  organization_id: string;
  lot_number: number;
  notes: string | null;
}

interface LotAddressRow {
  id: number;
  lot_id: number;
  address: string;
  unit: string | null;
}

interface LotAssocRow {
  lot_id: number;
  party_id: number;
  role: string;
  is_primary_contact: number;
  name: string;
}

export interface LotEntry {
  id: number;
  lot_number: number;
  notes: string | null;
  addresses: { id: number; address: string; unit: string | null }[];
  associations: { party_id: number; name: string; role: string; is_primary_contact: boolean }[];
}

function buildLotEntry(
  row: LotRow,
  addressRows: LotAddressRow[],
  assocRows: LotAssocRow[]
): LotEntry {
  return {
    id: row.id,
    lot_number: row.lot_number,
    notes: row.notes,
    addresses: addressRows
      .filter((a) => a.lot_id === row.id)
      .map((a) => ({ id: a.id, address: a.address, unit: a.unit })),
    associations: assocRows
      .filter((a) => a.lot_id === row.id)
      .map((a) => ({
        party_id: a.party_id,
        name: a.name,
        role: a.role,
        is_primary_contact: a.is_primary_contact === 1,
      })),
  };
}

export function getLots(db: Db): LotEntry[] {
  const lotRows = db
    .prepare(`SELECT * FROM lots WHERE organization_id = 'emhoa' ORDER BY lot_number`)
    .all() as LotRow[];

  const addressRows = db
    .prepare(
      `SELECT la.* FROM lot_addresses la
       JOIN lots l ON l.id = la.lot_id
       WHERE l.organization_id = 'emhoa'`
    )
    .all() as LotAddressRow[];

  const assocRows = db
    .prepare(
      `SELECT la.lot_id, la.party_id, la.role, la.is_primary_contact, p.name
       FROM lot_associations la
       JOIN parties p ON p.id = la.party_id
       JOIN lots l ON l.id = la.lot_id
       WHERE la.end_date IS NULL AND l.organization_id = 'emhoa'`
    )
    .all() as LotAssocRow[];

  return lotRows.map((row) => buildLotEntry(row, addressRows, assocRows));
}

export function getLotById(id: number, db: Db): LotEntry | null {
  const row = db
    .prepare(`SELECT * FROM lots WHERE id = ? AND organization_id = 'emhoa'`)
    .get(id) as LotRow | undefined;

  if (!row) return null;

  const addressRows = db
    .prepare(`SELECT * FROM lot_addresses WHERE lot_id = ?`)
    .all(id) as LotAddressRow[];

  const assocRows = db
    .prepare(
      `SELECT la.lot_id, la.party_id, la.role, la.is_primary_contact, p.name
       FROM lot_associations la
       JOIN parties p ON p.id = la.party_id
       WHERE la.lot_id = ? AND la.end_date IS NULL`
    )
    .all(id) as LotAssocRow[];

  return buildLotEntry(row, addressRows, assocRows);
}
