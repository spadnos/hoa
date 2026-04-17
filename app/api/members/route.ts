import { NextResponse } from 'next/server';
import { getMembers } from '@/src/tools/get-members';
import { getDb } from '@/src/db';

export async function GET() {
  const db = getDb();
  const members = await getMembers({}, db);
  return NextResponse.json(members);
}
