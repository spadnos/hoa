import { NextResponse } from 'next/server';
import { listProjects } from '@/src/tools/list-projects';
import { createProject } from '@/src/tools/create-project';
import { getDb, ORG_ID } from '@/src/db';
import { getSession } from '@/src/auth/session';
import { hasPermission } from '@/src/auth/permissions';

export async function GET() {
  const [db, session] = [getDb(), await getSession()];
  const orgId = session?.organizationId ?? ORG_ID;
  const projects = await listProjects({}, db, orgId);
  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const orgId = session.organizationId;
  const body = await req.json();

  if (!hasPermission(session, 'acc_manage')) {
    const lotNumber = body.lot;
    const allowed = db.prepare(`
      SELECT 1 FROM lot_associations ua
      JOIN lots l ON l.id = ua.lot_id
      WHERE l.lot_number = ? AND ua.party_id = ? AND ua.end_date IS NULL
    `).get(lotNumber, session.partyId);
    if (!allowed) {
      return NextResponse.json({ error: 'You do not have permission to create a project for this lot.' }, { status: 403 });
    }
  }

  const result = await createProject(body, db, orgId);
  if (typeof result === 'string') {
    return NextResponse.json({ error: result }, { status: 400 });
  }
  return NextResponse.json(result, { status: 201 });
}
