import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/src/db';
import { addGroupMembership } from '@/src/tools/manage-parties';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json();
  const { group_name, title, start_date } = body;

  if (!group_name) {
    return NextResponse.json({ error: 'group_name is required' }, { status: 400 });
  }

  const result = addGroupMembership(
    { party_id: parseInt(id), group_name, title, start_date },
    db
  );
  return NextResponse.json(result, { status: 201 });
}
