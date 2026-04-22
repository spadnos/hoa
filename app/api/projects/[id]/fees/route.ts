import { NextRequest, NextResponse } from 'next/server';
import { getDb, ORG_ID } from '@/src/db';
import { getSession } from '@/src/auth/session';
import { hasPermission } from '@/src/auth/permissions';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!hasPermission(session, 'acc_manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: projectId } = await params;
  const db = getDb();
  const orgId = session?.organizationId ?? ORG_ID;
  const body = await req.json();

  if (body.fee_id && body.paid === true) {
    const result = db
      .prepare(
        `UPDATE fees SET paid_at = datetime('now')
         WHERE id = ? AND project_id = ? AND organization_id = ?`
      )
      .run(body.fee_id, projectId, orgId);
    if (result.changes === 0) {
      return NextResponse.json({ error: 'Fee not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Fee marked as paid' });
  }

  if (body.fee_id && body.refunded === true) {
    const result = db
      .prepare(
        `UPDATE fees SET refunded_at = datetime('now')
         WHERE id = ? AND project_id = ? AND organization_id = ?`
      )
      .run(body.fee_id, projectId, orgId);
    if (result.changes === 0) {
      return NextResponse.json({ error: 'Fee not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Fee marked as refunded' });
  }

  if (body.description && body.amount && body.due_at) {
    db.prepare(
      `INSERT INTO fees (project_id, organization_id, description, amount, due_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(projectId, orgId, body.description, body.amount, body.due_at);
    return NextResponse.json({ message: 'Fee added' });
  }

  return NextResponse.json({ error: 'Provide fee_id + paid:true, or description + amount + due_at' }, { status: 400 });
}
