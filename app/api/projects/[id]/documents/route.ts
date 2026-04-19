import { NextRequest, NextResponse } from 'next/server';
import { getDb, ORG_ID } from '@/src/db';
import { getSession } from '@/src/auth/session';
import { hasPermission } from '@/src/auth/permissions';
import type { ProjectDocument } from '@/src/types';
import { projectUploadsDir, isProjectParticipant } from './_project-docs-helpers';
import fs from 'fs';
import path from 'path';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const [db, session] = [getDb(), await getSession()];
  const orgId = session?.organizationId ?? ORG_ID;

  if (!isProjectParticipant(session, projectId, db, orgId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const docs = db
    .prepare<unknown[], ProjectDocument>(
      `SELECT id, project_id, title, file_path, description, document_type, mime_type, size_bytes, uploaded_at
       FROM project_documents
       WHERE project_id = ? AND organization_id = ?
       ORDER BY uploaded_at, id`
    )
    .all(projectId, orgId);

  return NextResponse.json(docs);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const [db, session] = [getDb(), await getSession()];
  const orgId = session?.organizationId ?? ORG_ID;

  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isProjectParticipant(session, projectId, db, orgId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const project = db
    .prepare('SELECT id FROM projects WHERE id = ? AND organization_id = ?')
    .get(projectId, orgId);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const formData = await req.formData();
  const title = formData.get('title') as string | null;
  const description = (formData.get('description') as string | null) || null;
  const documentType = (formData.get('document_type') as string | null) ?? 'document';
  const file = formData.get('file') as File | null;

  if (!title || !file) {
    return NextResponse.json({ error: 'title and file are required' }, { status: 400 });
  }
  if (!['document', 'plan'].includes(documentType)) {
    return NextResponse.json({ error: 'Invalid document_type' }, { status: 400 });
  }

  const dir = projectUploadsDir(projectId);
  fs.mkdirSync(dir, { recursive: true });

  const ext = path.extname(file.name) || '';
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const filePath = path.join(dir, safeName);

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  const result = db
    .prepare(
      `INSERT INTO project_documents
         (project_id, organization_id, title, description, file_path, document_type, mime_type, size_bytes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(projectId, orgId, title, description, safeName, documentType, file.type || null, file.size);

  const created = db
    .prepare<unknown[], ProjectDocument>(
      `SELECT id, project_id, title, file_path, description, document_type, mime_type, size_bytes, uploaded_at
       FROM project_documents WHERE id = ?`
    )
    .get(result.lastInsertRowid);

  return NextResponse.json(created, { status: 201 });
}
