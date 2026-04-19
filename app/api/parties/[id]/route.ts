import { NextRequest, NextResponse } from 'next/server';
import { getDb, ORG_ID } from '@/src/db';
import { getSession } from '@/src/auth/session';
import { getPartyById } from '@/src/tools/get-parties';
import { updateParty, deleteParty } from '@/src/tools/manage-parties';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [db, session] = [getDb(), await getSession()];
  const party = await getPartyById(parseInt(id), db, session?.organizationId ?? ORG_ID);
  if (!party) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(party);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [db, session] = [getDb(), await getSession()];
  const body = await req.json();
  const result = updateParty(parseInt(id), body, db, session?.organizationId ?? ORG_ID);
  return NextResponse.json(result);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [db, session] = [getDb(), await getSession()];
  const result = deleteParty(parseInt(id), db, session?.organizationId ?? ORG_ID);
  return NextResponse.json(result);
}
