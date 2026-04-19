import { NextRequest, NextResponse } from 'next/server';
import { getDb, ORG_ID } from '@/src/db';
import { getSession } from '@/src/auth/session';
import { hasPermission } from '@/src/auth/permissions';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!hasPermission(session, 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getDb();
  const orgId = session?.organizationId ?? ORG_ID;
  const { name, label, description } = await req.json();

  if (!name || !label) {
    return NextResponse.json({ error: 'name and label are required' }, { status: 400 });
  }

  const slug = String(name).trim().toLowerCase().replace(/\s+/g, '_');

  const existing = db
    .prepare('SELECT name FROM groups WHERE name = ? AND organization_id = ?')
    .get(slug, orgId);

  if (existing) {
    return NextResponse.json({ error: 'A group with that name already exists' }, { status: 409 });
  }

  const maxOrder = (
    db
      .prepare('SELECT MAX(sort_order) as m FROM groups WHERE organization_id = ?')
      .get(orgId) as { m: number | null }
  ).m ?? 0;

  db.prepare(
    `INSERT INTO groups (name, organization_id, label, description, sort_order)
     VALUES (?, ?, ?, ?, ?)`
  ).run(slug, orgId, String(label).trim(), description?.trim() || null, maxOrder + 1);

  return NextResponse.json({ name: slug }, { status: 201 });
}
