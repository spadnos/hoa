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

function canAccess(
  session: Awaited<ReturnType<typeof getSession>>,
  tier: LibraryDocument['access_tier']
): boolean {
  if (tier === 'public') return true;
  if (tier === 'members') return hasPermission(session, 'homeowner') || hasPermission(session, 'admin');
  if (tier === 'board') return hasPermission(session, 'admin');
  return false;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  const { id } = await params;
  const db = getDb();
  const orgId = session?.organizationId ?? ORG_ID;

  const doc = db.prepare<unknown[], LibraryDocument>(
    'SELECT * FROM library_documents WHERE id = ? AND organization_id = ?'
  ).get(id, orgId);
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (!canAccess(session, doc.access_tier)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const filePath = path.join(libraryDir(), doc.file_path);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(doc.file_path).toLowerCase();
  const mime = doc.mime_type ?? (ext === '.pdf' ? 'application/pdf' : 'application/octet-stream');
  const filename = encodeURIComponent(doc.title + ext);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': mime,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    },
  });
}
