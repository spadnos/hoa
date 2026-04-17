import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/src/db';
import { getPartyById } from '@/src/tools/get-parties';
import { updateParty, deleteParty } from '@/src/tools/manage-parties';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const party = await getPartyById(parseInt(id), db);
  if (!party) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(party);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json();
  const result = updateParty(parseInt(id), body, db);
  return NextResponse.json(result);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const result = deleteParty(parseInt(id), db);
  return NextResponse.json(result);
}
