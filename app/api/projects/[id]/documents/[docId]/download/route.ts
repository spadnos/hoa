import { NextRequest, NextResponse } from 'next/server';
import { getDb, ORG_ID } from '@/src/db';
import { getSession } from '@/src/auth/session';
import type { ProjectDocument } from '@/src/types';
import { projectUploadsDir, isProjectParticipant } from '../../_project-docs-helpers';
import fs from 'fs';
import path from 'path';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { id: projectId, docId } = await params;
  const [db, session] = [getDb(), await getSession()];
  const orgId = session?.organizationId ?? ORG_ID;

  if (!isProjectParticipant(session, projectId, db, orgId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const doc = db
    .prepare<unknown[], ProjectDocument>(
      'SELECT * FROM project_documents WHERE id = ? AND project_id = ? AND organization_id = ?'
    )
    .get(docId, projectId, orgId);
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const filePath = path.join(projectUploadsDir(projectId), doc.file_path);
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
