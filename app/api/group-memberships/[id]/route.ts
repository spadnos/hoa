import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/src/db';
import { endGroupMembership } from '@/src/tools/manage-parties';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json();

  if (body.end_date === 'today' || body.end === true) {
    const result = endGroupMembership(parseInt(id), db);
    return NextResponse.json(result);
  }

  if (body.end_date) {
    db.prepare(`UPDATE group_memberships SET end_date = ? WHERE id = ?`).run(body.end_date, parseInt(id));
    return NextResponse.json({ message: `Updated membership ${id}` });
  }

  if (typeof body.sort_order === 'number') {
    db.prepare(`UPDATE group_memberships SET sort_order = ? WHERE id = ?`).run(body.sort_order, parseInt(id));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Provide end_date, end: true, or sort_order' }, { status: 400 });
}
