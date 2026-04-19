import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import type { Db } from '../db';

export const logInspectionTool: Tool = {
  name: 'log_inspection',
  description: 'Record a project inspection with its outcome.',
  input_schema: {
    type: 'object' as const,
    properties: {
      project_id: { type: 'string', description: 'Project ID, e.g. "2026-001"' },
      type: {
        type: 'string',
        description: 'Inspection type (e.g. "pre-construction", "framing", "final")',
      },
      inspector: { type: 'string', description: 'Name of the inspector' },
      date: { type: 'string', description: 'Date of inspection, ISO format e.g. "2026-06-01"' },
      outcome: {
        type: 'string',
        description: 'Outcome (e.g. "passed", "failed", "conditional")',
      },
      notes: { type: 'string', description: 'Optional notes' },
    },
    required: ['project_id', 'type', 'inspector', 'date', 'outcome'],
  },
};

export interface LogInspectionInput {
  project_id: string;
  type: string;
  inspector: string;
  date: string;
  outcome: string;
  notes?: string;
}

export async function logInspection(
  input: LogInspectionInput,
  db: Db,
  orgId: string
): Promise<{ id: number; project_id: string } | string> {
  const project = db
    .prepare(`SELECT id FROM projects WHERE id = ? AND organization_id = ?`)
    .get(input.project_id, orgId);
  if (!project) return `Project ${input.project_id} not found`;

  const result = db
    .prepare(
      `INSERT INTO inspections (project_id, organization_id, type, inspector, date, outcome, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.project_id,
      orgId,
      input.type,
      input.inspector,
      input.date,
      input.outcome,
      input.notes ?? null
    );

  return { id: result.lastInsertRowid as number, project_id: input.project_id };
}
