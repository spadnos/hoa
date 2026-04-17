import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/src/db';
import { getMembers } from '@/src/tools/get-members';
import { addMember } from '@/src/tools/add-member';

export async function GET() {
  const db = getDb();
  const members = await getMembers({}, db);
  return NextResponse.json(members);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { lot, name, role, is_primary_contact, email, phone, mailing_address, notes } = body;

  if (!lot || !name || !role) {
    return NextResponse.json({ error: 'lot, name, and role are required' }, { status: 400 });
  }

  const result = await addMember({ lot, name, role, is_primary_contact, email, phone, mailing_address, notes }, db);
  return NextResponse.json(result, { status: 201 });
}
