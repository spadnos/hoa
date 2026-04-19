import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import type { Db } from '../db';
import type { ProjectDocumentType } from '../types';

export const addProjectDocumentTool: Tool = {
  name: 'add_project_document',
  description:
    'Index a document for a project. The file should be placed in projects/<id>/docs/ before calling this tool. ' +
    'Stores metadata (title, file path, description) in the database.',
  input_schema: {
    type: 'object' as const,
    properties: {
      project_id: { type: 'string', description: 'Project ID, e.g. "2026-001"' },
      title: { type: 'string', description: 'Human-readable title for the document' },
      file_path: {
        type: 'string',
        description: 'Relative path to the file within the project docs folder',
      },
      description: { type: 'string', description: 'Optional description of the document' },
    },
    required: ['project_id', 'title', 'file_path'],
  },
};

export interface AddProjectDocumentInput {
  project_id: string;
  title: string;
  file_path: string;
  description?: string;
  document_type?: ProjectDocumentType;
}

export async function addProjectDocument(
  input: AddProjectDocumentInput,
  db: Db,
  orgId: string
): Promise<{ id: number; project_id: string } | string> {
  const project = db
    .prepare(`SELECT id FROM projects WHERE id = ? AND organization_id = ?`)
    .get(input.project_id, orgId);
  if (!project) return `Project ${input.project_id} not found`;

  const result = db
    .prepare(
      `INSERT INTO project_documents (project_id, organization_id, title, file_path, description, document_type)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.project_id,
      orgId,
      input.title,
      input.file_path,
      input.description ?? null,
      input.document_type ?? 'document'
    );

  return { id: result.lastInsertRowid as number, project_id: input.project_id };
}
