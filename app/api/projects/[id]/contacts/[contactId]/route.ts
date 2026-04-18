import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/src/db';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const { id: project_id, contactId } = await params;
  const db = getDb();

  const result = db
    .prepare(`DELETE FROM project_contacts WHERE id = ? AND project_id = ?`)
    .run(parseInt(contactId), project_id);

  if (result.changes === 0) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
