import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/src/db';
import { addLotAssociation } from '@/src/tools/manage-parties';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json();
  const { party_id, role, address, unit, is_primary_contact, mailing_address, start_date } = body;

  if (!party_id || !role) {
    return NextResponse.json({ error: 'party_id and role are required' }, { status: 400 });
  }

  const lotRow = db
    .prepare(`SELECT lot_number FROM lots WHERE id = ?`)
    .get(parseInt(id)) as { lot_number: number } | undefined;
  if (!lotRow) return NextResponse.json({ error: 'Lot not found' }, { status: 404 });

  const result = addLotAssociation(
    { lot_number: lotRow.lot_number, party_id, role, address, unit, is_primary_contact, mailing_address, start_date },
    db
  );
  return NextResponse.json(result, { status: 201 });
}
