import { NextRequest, NextResponse } from 'next/server';
import { getDb, ORG_ID } from '@/src/db';
import { getSession } from '@/src/auth/session';
import { getDirectoryParties } from '@/src/tools/get-parties';
import { createParty } from '@/src/tools/manage-parties';

export async function GET(req: NextRequest) {
  const [db, session] = [getDb(), await getSession()];
  const orgId = session?.organizationId ?? ORG_ID;
  const q = req.nextUrl.searchParams.get('q')?.trim();

  if (q && q.length >= 2) {
    const rows = db
      .prepare(
        `SELECT id, name, email, phone, type, notes
         FROM parties
         WHERE organization_id = ?
           AND (name LIKE ? OR email LIKE ?)
         ORDER BY name
         LIMIT 20`
      )
      .all(orgId, `%${q}%`, `%${q}%`);
    return NextResponse.json(rows);
  }

  const parties = await getDirectoryParties(db, orgId);
  return NextResponse.json(parties);
}

export async function POST(req: NextRequest) {
  const [db, session] = [getDb(), await getSession()];
  const orgId = session?.organizationId ?? ORG_ID;
  const body = await req.json();
  const { type, name, email, phone, notes, org_type, website } = body;

  if (!type || !name) {
    return NextResponse.json({ error: 'type and name are required' }, { status: 400 });
  }

  const { id } = createParty({ type, name, email, phone, notes, org_type, website }, db, orgId);
  return NextResponse.json({ id }, { status: 201 });
}
