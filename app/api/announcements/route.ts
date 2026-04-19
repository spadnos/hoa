import { NextResponse } from 'next/server';
import { getDb, ORG_ID } from '@/src/db';
import { getSession } from '@/src/auth/session';
import { hasPermission } from '@/src/auth/permissions';
import type { Announcement } from '@/src/types';

export async function GET() {
  const [db, session] = [getDb(), await getSession()];
  const orgId = session?.organizationId ?? ORG_ID;

  const audienceTiers = hasPermission(session, 'admin')
    ? ['public', 'members', 'board']
    : hasPermission(session, 'homeowner')
    ? ['public', 'members']
    : ['public'];

  const placeholders = audienceTiers.map(() => '?').join(', ');
  const today = new Date().toISOString().slice(0, 10);
  const announcements = db.prepare<unknown[], Announcement>(
    `SELECT * FROM announcements
     WHERE organization_id = ?
       AND audience IN (${placeholders})
       AND visible_from <= ?
       AND (visible_until IS NULL OR visible_until >= ?)
     ORDER BY visible_from DESC`
  ).all(orgId, ...audienceTiers, today, today);

  return NextResponse.json(announcements);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasPermission(session, 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getDb();
  const orgId = session.organizationId;
  const body = await req.json();
  const { title, body: announcementBody, audience = 'members', visible_from, visible_until } = body;

  if (!title || !announcementBody) {
    return NextResponse.json({ error: 'title and body are required' }, { status: 400 });
  }

  const validAudiences = ['public', 'members', 'board'];
  if (!validAudiences.includes(audience)) {
    return NextResponse.json({ error: 'Invalid audience' }, { status: 400 });
  }

  const result = db.prepare(
    `INSERT INTO announcements (organization_id, title, body, posted_by_party_id, visible_from, visible_until, audience)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    orgId,
    title,
    announcementBody,
    session.partyId,
    visible_from ?? new Date().toISOString().slice(0, 10),
    visible_until ?? null,
    audience
  );

  const created = db.prepare<unknown[], Announcement>(
    'SELECT * FROM announcements WHERE id = ?'
  ).get(result.lastInsertRowid);

  return NextResponse.json(created, { status: 201 });
}
