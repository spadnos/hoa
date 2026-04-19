import { NextRequest, NextResponse } from 'next/server';
import { getDb, ORG_ID } from '@/src/db';
import { getSession } from '@/src/auth/session';
import { hasPermission } from '@/src/auth/permissions';
import type { LibraryDocument } from '@/src/types';
import fs from 'fs';
import path from 'path';

function libraryDir(): string {
  return process.env.UPLOADS_DIR
    ? path.join(process.env.UPLOADS_DIR, 'library')
    : path.join(process.cwd(), 'uploads', 'library');
}

function accessTiers(session: Awaited<ReturnType<typeof getSession>>): string[] {
  if (hasPermission(session, 'admin')) return ['public', 'members', 'board'];
  if (hasPermission(session, 'homeowner')) return ['public', 'members'];
  return ['public'];
}

export async function GET() {
  const [db, session] = [getDb(), await getSession()];
  const orgId = session?.organizationId ?? ORG_ID;

  const tiers = accessTiers(session);
  const placeholders = tiers.map(() => '?').join(', ');

  const docs = db.prepare<unknown[], LibraryDocument>(
    `SELECT * FROM library_documents
     WHERE organization_id = ? AND access_tier IN (${placeholders})
     ORDER BY category NULLS LAST, title`
  ).all(orgId, ...tiers);

  return NextResponse.json(docs);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session, 'admin')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const formData = await req.formData();
  const title = formData.get('title') as string | null;
  const description = (formData.get('description') as string | null) || null;
  const accessTier = (formData.get('access_tier') as string | null) ?? 'members';
  const category = (formData.get('category') as string | null) || null;
  const file = formData.get('file') as File | null;

  if (!title || !file) {
    return NextResponse.json({ error: 'title and file are required' }, { status: 400 });
  }
  if (!['public', 'members', 'board'].includes(accessTier)) {
    return NextResponse.json({ error: 'Invalid access_tier' }, { status: 400 });
  }

  const dir = libraryDir();
  fs.mkdirSync(dir, { recursive: true });

  const ext = path.extname(file.name) || '';
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const filePath = path.join(dir, safeName);

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  const db = getDb();
  const result = db.prepare(
    `INSERT INTO library_documents
       (organization_id, title, description, file_path, mime_type, size_bytes, access_tier, category, uploaded_by_party_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    session.organizationId,
    title,
    description,
    safeName,
    file.type || null,
    file.size,
    accessTier,
    category,
    session.partyId
  );

  const created = db.prepare<unknown[], LibraryDocument>(
    'SELECT * FROM library_documents WHERE id = ?'
  ).get(result.lastInsertRowid);

  return NextResponse.json(created, { status: 201 });
}
