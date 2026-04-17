import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/src/db';
import { getDirectoryParties } from '@/src/tools/get-parties';
import { createParty } from '@/src/tools/manage-parties';

export async function GET() {
  const db = getDb();
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
