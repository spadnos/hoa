import { ProjectType, ProjectStatus } from '../types';
import type { Db } from '../db';

export interface UserProjectSummary {
  id: string;
  lot: number;
  address: string | null;
  type: ProjectType;
  status: ProjectStatus;
}

interface SummaryRow {
  id: string;
  lot_number: number;
  address: string | null;
  type: ProjectType;
  status: ProjectStatus;
}

export async function listUserProjects(
  db: Db,
  partyId: number,
  isManager: boolean,
  orgId: string
): Promise<UserProjectSummary[]> {
  let sql: string;
  let params: unknown[];

  if (isManager) {
    sql = `
      SELECT p.id, l.lot_number, la.address, p.type, p.status
      FROM projects p
      JOIN lots l ON l.id = p.lot_id
      LEFT JOIN lot_addresses la ON la.id = p.lot_address_id
      WHERE p.organization_id = ?
        AND p.status != 'complete'
      ORDER BY p.id`;
    params = [orgId];
  } else {
    sql = `
      SELECT p.id, l.lot_number, la.address, p.type, p.status
      FROM projects p
      JOIN lots l ON l.id = p.lot_id
      LEFT JOIN lot_addresses la ON la.id = p.lot_address_id
      WHERE p.organization_id = ?
        AND p.status != 'complete'
        AND (
          EXISTS (
            SELECT 1 FROM lot_associations loa
            WHERE loa.party_id = ? AND loa.lot_id = p.lot_id AND loa.end_date IS NULL
          )
          OR p.owner_party_id = ?
          OR p.designer_party_id = ?
          OR p.contractor_party_id = ?
          OR EXISTS (
            SELECT 1 FROM project_contacts pc
            WHERE pc.project_id = p.id AND pc.party_id = ?
          )
        )
      ORDER BY p.id`;
    params = [orgId, partyId, partyId, partyId, partyId, partyId];
  }

  const rows = db.prepare(sql).all(...params) as SummaryRow[];

  return rows.map((row) => ({
    id: row.id,
    lot: row.lot_number,
    address: row.address ?? null,
    type: row.type,
    status: row.status,
  }));
}
