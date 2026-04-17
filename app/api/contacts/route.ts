import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/src/db';
import { getContacts } from '@/src/tools/get-contacts';
import { addContact } from '@/src/tools/add-contact';

export async function GET() {
  const db = getDb();
  const contacts = await getContacts(db);
  return NextResponse.json(contacts);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { section, name, role, email, phone } = body;

  if (!section || !name || !role) {
    return NextResponse.json({ error: 'section, name, and role are required' }, { status: 400 });
  }

  const result = await addContact({ section, name, role, email, phone }, db);
  return NextResponse.json(result, { status: 201 });
}
