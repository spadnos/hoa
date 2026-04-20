import { NextResponse } from 'next/server';
import { getDb } from '@/src/db';
import { getSession } from '@/src/auth/session';
import { hasPermission } from '@/src/auth/permissions';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; approvalId: string }> }
) {
  const session = await getSession();
  if (!hasPermission(session, 'acc_manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id, approvalId } = await params;
  const db = getDb();
  const orgId = session!.organizationId;
  const body = await req.json();
  const { status, notes } = body;

  const result = db.prepare(
    `UPDATE project_approvals
     SET status = ?, notes = ?, updated_at = datetime('now')
     WHERE id = ? AND project_id = ? AND organization_id = ?`
  ).run(status ?? null, notes ?? null, approvalId, id, orgId);

  if (result.changes === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
