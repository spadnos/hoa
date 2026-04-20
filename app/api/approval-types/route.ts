import { NextResponse } from 'next/server';
import { getDb, ORG_ID } from '@/src/db';
import { getSession } from '@/src/auth/session';
import { hasPermission } from '@/src/auth/permissions';
import { listApprovalTypes } from '@/src/tools/list-approval-types';

export async function GET() {
  const [db, session] = [getDb(), await getSession()];
  const orgId = session?.organizationId ?? ORG_ID;
  return NextResponse.json(listApprovalTypes(db, orgId));
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!hasPermission(session, 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getDb();
  const orgId = session!.organizationId;
  const body = await req.json();

  const { name, label, description, is_required_by_default, is_warning_indicator, sort_order } = body;
  if (!name?.trim() || !label?.trim()) {
    return NextResponse.json({ error: 'name and label are required' }, { status: 400 });
  }

  try {
    const result = db.prepare(
      `INSERT INTO approval_types
         (organization_id, name, label, description, sort_order, is_required_by_default, is_warning_indicator)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      orgId,
      name.trim(),
      label.trim(),
      description?.trim() ?? null,
      sort_order ?? 0,
      is_required_by_default ? 1 : 0,
      is_warning_indicator ? 1 : 0
    );
    return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      return NextResponse.json({ error: 'An approval type with that name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
