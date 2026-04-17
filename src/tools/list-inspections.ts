import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { Inspection } from '../types';
import type { Db } from '../db';

export const listInspectionsTool: Tool = {
  name: 'list_inspections',
  description: 'List all inspections logged for a project.',
  input_schema: {
    type: 'object' as const,
    properties: {
      project_id: { type: 'string', description: 'Project ID, e.g. "2026-001"' },
    },
    required: ['project_id'],
  },
};

export interface ListInspectionsInput {
  project_id: string;
}

export async function listInspections(
  input: ListInspectionsInput,
  db: Db
): Promise<Inspection[]> {
  return db
    .prepare(
      `SELECT id, project_id, type, inspector, date, outcome, notes, created_at
       FROM inspections
       WHERE project_id = ? AND organization_id = 'emhoa'
       ORDER BY date, id`
    )
    .all(input.project_id) as Inspection[];
}
