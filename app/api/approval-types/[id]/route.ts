import { NextResponse } from 'next/server';
import { getDb } from '@/src/db';
import { getSession } from '@/src/auth/session';
import { hasPermission } from '@/src/auth/permissions';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!hasPermission(session, 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const db = getDb();
  const orgId = session!.organizationId;
  const body = await req.json();

  const allowed = ['label', 'description', 'sort_order', 'is_required_by_default', 'is_warning_indicator', 'is_active'];
  const sets: string[] = [];
  const values: unknown[] = [];

  for (const key of allowed) {
    if (key in body) {
      sets.push(`${key} = ?`);
      const val = body[key];
      values.push(typeof val === 'boolean' ? (val ? 1 : 0) : val);
    }
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  values.push(id, orgId);
  const result = db.prepare(
    `UPDATE approval_types SET ${sets.join(', ')} WHERE id = ? AND organization_id = ?`
  ).run(...values);

  if (result.changes === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!hasPermission(session, 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const db = getDb();
  const orgId = session!.organizationId;

  const result = db.prepare(
    `UPDATE approval_types SET is_active = 0 WHERE id = ? AND organization_id = ?`
  ).run(id, orgId);

  if (result.changes === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
