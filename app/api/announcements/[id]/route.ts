import { NextRequest, NextResponse } from 'next/server';
import { getDb, ORG_ID } from '@/src/db';
import { getSession } from '@/src/auth/session';
import { hasPermission } from '@/src/auth/permissions';
import type { Announcement } from '@/src/types';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasPermission(session, 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const db = getDb();
  const orgId = session?.organizationId ?? ORG_ID;
  const body = await req.json();

  const existing = db.prepare<unknown[], Announcement>(
    'SELECT * FROM announcements WHERE id = ? AND organization_id = ?'
  ).get(id, orgId);
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  if (body.title !== undefined) { fields.push('title = ?'); values.push(body.title); }
  if (body.body !== undefined) { fields.push('body = ?'); values.push(body.body); }
  if (body.audience !== undefined) { fields.push('audience = ?'); values.push(body.audience); }
  if (body.visible_from !== undefined) { fields.push('visible_from = ?'); values.push(body.visible_from); }
  if (body.visible_until !== undefined) { fields.push('visible_until = ?'); values.push(body.visible_until); }

  if (fields.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  db.prepare(`UPDATE announcements SET ${fields.join(', ')} WHERE id = ? AND organization_id = ?`)
    .run(...values, id, orgId);

  const updated = db.prepare<unknown[], Announcement>(
    'SELECT * FROM announcements WHERE id = ?'
  ).get(id);

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasPermission(session, 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const db = getDb();
  const orgId = session?.organizationId ?? ORG_ID;

  const result = db.prepare(
    'DELETE FROM announcements WHERE id = ? AND organization_id = ?'
  ).run(id, orgId);

  if (result.changes === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ message: 'Deleted' });
}
