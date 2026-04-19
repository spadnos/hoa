import { NextRequest, NextResponse } from 'next/server';
import { getDb, ORG_ID } from '@/src/db';
import { getSession } from '@/src/auth/session';
import { hasPermission } from '@/src/auth/permissions';
import type { ProjectDocument } from '@/src/types';
import { projectUploadsDir } from '../_project-docs-helpers';
import fs from 'fs';
import path from 'path';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { id: projectId, docId } = await params;
  const [db, session] = [getDb(), await getSession()];
  const orgId = session?.organizationId ?? ORG_ID;

  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session, 'acc_manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const doc = db
    .prepare<unknown[], ProjectDocument>(
      'SELECT * FROM project_documents WHERE id = ? AND project_id = ? AND organization_id = ?'
    )
    .get(docId, projectId, orgId);
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  db.prepare('DELETE FROM project_documents WHERE id = ? AND organization_id = ?').run(docId, orgId);

  const filePath = path.join(projectUploadsDir(projectId), doc.file_path);
  try { fs.unlinkSync(filePath); } catch { /* file may not exist */ }

  return NextResponse.json({ message: 'Deleted' });
}
