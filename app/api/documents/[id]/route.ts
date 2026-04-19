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

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session, 'admin')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const db = getDb();
  const orgId = session?.organizationId ?? ORG_ID;

  const doc = db.prepare<unknown[], LibraryDocument>(
    'SELECT * FROM library_documents WHERE id = ? AND organization_id = ?'
  ).get(id, orgId);
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  db.prepare('DELETE FROM library_documents WHERE id = ? AND organization_id = ?').run(id, orgId);

  const filePath = path.join(libraryDir(), doc.file_path);
  try { fs.unlinkSync(filePath); } catch { /* file may not exist */ }

  return NextResponse.json({ message: 'Deleted' });
}
