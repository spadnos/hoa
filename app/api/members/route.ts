import { NextRequest, NextResponse } from 'next/server';
import { getDb, ORG_ID } from '@/src/db';
import { getSession } from '@/src/auth/session';
import { getMembers } from '@/src/tools/get-members';
import { addMember } from '@/src/tools/add-member';

export async function GET() {
  const [db, session] = [getDb(), await getSession()];
  const orgId = session?.organizationId ?? ORG_ID;
  const members = await getMembers({}, db, orgId);
  return NextResponse.json(members);
}

export async function POST(req: NextRequest) {
  const [db, session] = [getDb(), await getSession()];
  const orgId = session?.organizationId ?? ORG_ID;
  const body = await req.json();
  const { lot, name, role, is_primary_contact, email, phone, mailing_address, notes } = body;

  if (!lot || !name || !role) {
    return NextResponse.json({ error: 'lot, name, and role are required' }, { status: 400 });
  }

  const result = await addMember({ lot, name, role, is_primary_contact, email, phone, mailing_address, notes }, db, orgId);
  return NextResponse.json(result, { status: 201 });
}
