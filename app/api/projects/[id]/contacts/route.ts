import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/src/db';
import { getOrCreateParty } from '@/src/tools/manage-parties';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: project_id } = await params;
  const db = getDb();
  const body = await req.json();
  const { role_label, party_id, name, email, phone, company } = body;

  if (!role_label?.trim()) {
    return NextResponse.json({ error: 'role_label is required' }, { status: 400 });
  }

  const project = db
    .prepare(`SELECT id FROM projects WHERE id = ? AND organization_id = 'emhoa'`)
    .get(project_id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  let resolvedPartyId: number;

  if (party_id) {
    const party = db
      .prepare(`SELECT id FROM parties WHERE id = ? AND organization_id = 'emhoa'`)
      .get(party_id);
    if (!party) {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    }
    resolvedPartyId = party_id;
  } else {
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Either party_id or name is required' }, { status: 400 });
    }
    const notes = company ? `Company: ${company}` : null;
    resolvedPartyId = getOrCreateParty({ name, email, phone, notes }, db);
  }

  try {
    const result = db
      .prepare(
        `INSERT INTO project_contacts (project_id, party_id, role_label)
         VALUES (?, ?, ?)`
      )
      .run(project_id, resolvedPartyId, role_label.trim());

    return NextResponse.json({ id: result.lastInsertRowid, party_id: resolvedPartyId }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('UNIQUE')) {
      return NextResponse.json(
        { error: 'This contact with this role already exists on the project' },
        { status: 409 }
      );
    }
    throw e;
  }
}
