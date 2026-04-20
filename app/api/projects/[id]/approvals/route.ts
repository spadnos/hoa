import { NextResponse } from 'next/server';
import { getDb, ORG_ID } from '@/src/db';
import { getSession } from '@/src/auth/session';
import { hasPermission } from '@/src/auth/permissions';
import { listProjectApprovals } from '@/src/tools/list-project-approvals';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [db, session] = [getDb(), await getSession()];
  const orgId = session?.organizationId ?? ORG_ID;
  return NextResponse.json(listProjectApprovals({ project_id: id }, db, orgId));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!hasPermission(session, 'acc_manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const db = getDb();
  const orgId = session!.organizationId;
  const body = await req.json();

  const { approval_type_id, status, notes } = body;
  if (!approval_type_id) {
    return NextResponse.json({ error: 'approval_type_id is required' }, { status: 400 });
  }

  const project = db.prepare(
    `SELECT id FROM projects WHERE id = ? AND organization_id = ?`
  ).get(id, orgId);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const type = db.prepare(
    `SELECT id FROM approval_types WHERE id = ? AND organization_id = ?`
  ).get(approval_type_id, orgId);
  if (!type) return NextResponse.json({ error: 'Approval type not found' }, { status: 404 });

  const result = db.prepare(
    `INSERT INTO project_approvals
       (project_id, organization_id, approval_type_id, status, notes, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(project_id, approval_type_id)
     DO UPDATE SET status     = excluded.status,
                   notes      = excluded.notes,
                   updated_at = datetime('now')`
  ).run(id, orgId, approval_type_id, status ?? null, notes ?? null);

  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}
