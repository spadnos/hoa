import { NextResponse } from 'next/server';
import { getDb } from '@/src/db';

export interface LotSearchResult {
  lot_number: number;
  lot_id: number;
  address: string | null;
  address_id: number | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  owner_mailing_address: string | null;
}

export async function GET() {
  const db = getDb();

  const rows = db.prepare(`
    SELECT
      l.lot_number,
      l.id AS lot_id,
      la.address,
      la.id AS address_id,
      p.name AS owner_name,
      p.email AS owner_email,
      p.phone AS owner_phone,
      lassoc.mailing_address AS owner_mailing_address
    FROM lots l
    LEFT JOIN lot_addresses la ON la.lot_id = l.id
    LEFT JOIN lot_associations lassoc
      ON lassoc.lot_id = l.id
      AND lassoc.end_date IS NULL
      AND lassoc.role IN ('owner', 'trustee', 'corporate_owner')
      AND lassoc.is_primary_contact = 1
    LEFT JOIN parties p ON p.id = lassoc.party_id
    WHERE l.organization_id = 'emhoa'
    ORDER BY l.lot_number, la.address
  `).all() as LotSearchResult[];

  return NextResponse.json(rows);
}
