import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { ProjectDocument } from '../types';
import type { Db } from '../db';

export const listProjectDocumentsTool: Tool = {
  name: 'list_project_documents',
  description: 'List all indexed documents for a project.',
  input_schema: {
    type: 'object' as const,
    properties: {
      project_id: { type: 'string', description: 'Project ID, e.g. "2026-001"' },
    },
    required: ['project_id'],
  },
};

export interface ListProjectDocumentsInput {
  project_id: string;
}

export async function listProjectDocuments(
  input: ListProjectDocumentsInput,
  db: Db,
  orgId: string
): Promise<ProjectDocument[]> {
  return db
    .prepare(
      `SELECT id, project_id, title, file_path, description, document_type, mime_type, size_bytes, uploaded_at
       FROM project_documents
       WHERE project_id = ? AND organization_id = ?
       ORDER BY uploaded_at, id`
    )
    .all(input.project_id, orgId) as ProjectDocument[];
}
