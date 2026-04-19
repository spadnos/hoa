import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { Condition } from '../types';
import type { Db } from '../db';

export const listConditionsTool: Tool = {
  name: 'list_conditions',
  description: 'List approval conditions for a project, optionally filtered to only unsatisfied ones.',
  input_schema: {
    type: 'object' as const,
    properties: {
      project_id: { type: 'string', description: 'Project ID, e.g. "2026-001"' },
      unsatisfied_only: {
        type: 'boolean',
        description: 'If true, return only conditions not yet satisfied (default false)',
      },
    },
    required: ['project_id'],
  },
};

export interface ListConditionsInput {
  project_id: string;
  unsatisfied_only?: boolean;
}

export async function listConditions(
  input: ListConditionsInput,
  db: Db,
  orgId: string
): Promise<Condition[]> {
  let sql = `SELECT id, project_id, description, satisfied_at, created_at
             FROM conditions
             WHERE project_id = ? AND organization_id = ?`;
  const params: unknown[] = [input.project_id, orgId];
  if (input.unsatisfied_only) sql += ' AND satisfied_at IS NULL';
  sql += ' ORDER BY id';

  return db.prepare(sql).all(...params) as Condition[];
}
