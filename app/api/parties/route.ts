import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/src/db';
import { getDirectoryParties } from '@/src/tools/get-parties';
import { createParty } from '@/src/tools/manage-parties';

export async function GET(req: NextRequest) {
  const db = getDb();
  const q = req.nextUrl.searchParams.get('q')?.trim();

  if (q && q.length >= 2) {
    const rows = db
      .prepare(
        `SELECT id, name, email, phone, type, notes
         FROM parties
         WHERE organization_id = 'emhoa'
           AND (name LIKE ? OR email LIKE ?)
         ORDER BY name
         LIMIT 20`
      )
      .all(`%${q}%`, `%${q}%`);
    return NextResponse.json(rows);
  }

  const parties = await getDirectoryParties(db);
  return NextResponse.json(parties);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { type, name, email, phone, notes, org_type, website } = body;

  if (!type || !name) {
    return NextResponse.json({ error: 'type and name are required' }, { status: 400 });
  }

  const { id } = createParty({ type, name, email, phone, notes, org_type, website }, db);
  return NextResponse.json({ id }, { status: 201 });
}
