import { NextResponse } from 'next/server';
import { getContacts } from '@/src/tools/get-contacts';
import { getDb } from '@/src/db';

export async function GET() {
  const db = getDb();
  const contacts = await getContacts(db);
  return NextResponse.json(contacts);
}
