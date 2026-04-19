import { NextRequest, NextResponse } from 'next/server';
import { getDb, ORG_ID } from '@/src/db';
import { getSession } from '@/src/auth/session';
import { getContacts } from '@/src/tools/get-contacts';
import { addContact } from '@/src/tools/add-contact';

export async function GET() {
  const [db, session] = [getDb(), await getSession()];
  const orgId = session?.organizationId ?? ORG_ID;
  const contacts = await getContacts(db, orgId);
  return NextResponse.json(contacts);
}

export async function POST(req: NextRequest) {
  const [db, session] = [getDb(), await getSession()];
  const orgId = session?.organizationId ?? ORG_ID;
  const body = await req.json();
  const { section, name, role, email, phone } = body;

  if (!section || !name || !role) {
    return NextResponse.json({ error: 'section, name, and role are required' }, { status: 400 });
  }

  const result = await addContact({ section, name, role, email, phone }, db, orgId);
  return NextResponse.json(result, { status: 201 });
}
