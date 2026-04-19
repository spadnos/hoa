import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import type { Db } from '../db';

export const addConditionTool: Tool = {
  name: 'add_condition',
  description: 'Add an approval condition to a project that must be satisfied before final approval.',
  input_schema: {
    type: 'object' as const,
    properties: {
      project_id: { type: 'string', description: 'Project ID, e.g. "2026-001"' },
      description: { type: 'string', description: 'Description of the condition to be met' },
    },
    required: ['project_id', 'description'],
  },
};

export interface AddConditionInput {
  project_id: string;
  description: string;
}

export async function addCondition(
  input: AddConditionInput,
  db: Db,
  orgId: string
): Promise<{ id: number; project_id: string } | string> {
  const project = db
    .prepare(`SELECT id FROM projects WHERE id = ? AND organization_id = ?`)
    .get(input.project_id, orgId);
  if (!project) return `Project ${input.project_id} not found`;

  const result = db
    .prepare(
      `INSERT INTO conditions (project_id, organization_id, description)
       VALUES (?, ?, ?)`
    )
    .run(input.project_id, orgId, input.description);

  return { id: result.lastInsertRowid as number, project_id: input.project_id };
}
