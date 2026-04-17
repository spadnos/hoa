import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/src/db';
import { endLotAssociation } from '@/src/tools/manage-parties';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json();

  if (body.end_date === 'today' || body.end === true) {
    const result = endLotAssociation(parseInt(id), db);
    return NextResponse.json(result);
  }

  if (body.end_date) {
    db.prepare(`UPDATE lot_associations SET end_date = ? WHERE id = ?`).run(body.end_date, parseInt(id));
    return NextResponse.json({ message: `Updated lot association ${id}` });
  }

  return NextResponse.json({ error: 'Provide end_date or end: true' }, { status: 400 });
}
