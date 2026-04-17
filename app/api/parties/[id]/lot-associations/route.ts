import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/src/db';
import { addLotAssociation } from '@/src/tools/manage-parties';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json();
  const { lot_number, role, address, unit, is_primary_contact, mailing_address, start_date } = body;

  if (!lot_number || !role) {
    return NextResponse.json({ error: 'lot_number and role are required' }, { status: 400 });
  }

  const result = addLotAssociation(
    { lot_number, party_id: parseInt(id), role, address, unit, is_primary_contact, mailing_address, start_date },
    db
  );
  return NextResponse.json(result, { status: 201 });
}
