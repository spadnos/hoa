import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { ProjectSummary, ProjectType, ProjectStatus } from '../types';
import type { Db } from '../db';

export const listProjectsTool: Tool = {
  name: 'list_projects',
  description:
    'List all HOA projects. Optionally filter by status, project type, or lot number.',
  input_schema: {
    type: 'object' as const,
    properties: {
      status: {
        type: 'string',
        description: 'Filter by project status (e.g. "preliminary_review", "approved")',
      },
      type: {
        type: 'string',
        description: 'Filter by project type (e.g. "new_residence", "minor_remodel")',
      },
      lot: {
        type: 'number',
        description: 'Filter by lot number',
      },
    },
  },
};

export interface ListProjectsInput {
  status?: string;
  type?: string;
  lot?: number;
}

interface SummaryRow {
  id: string;
  lot: number;
  owner_name: string;
  type: ProjectType;
  status: ProjectStatus;
}

export async function listProjects(input: ListProjectsInput, db: Db): Promise<ProjectSummary[]> {
  let sql =
    'SELECT id, lot, owner_name, type, status FROM projects WHERE organization_id = ?';
  const params: unknown[] = ['emhoa'];

  if (input.status) {
    sql += ' AND status = ?';
    params.push(input.status);
  }
  if (input.type) {
    sql += ' AND type = ?';
    params.push(input.type);
  }
  if (input.lot !== undefined) {
    sql += ' AND lot = ?';
    params.push(input.lot);
  }

  sql += ' ORDER BY id';

  const rows = db.prepare(sql).all(...params) as SummaryRow[];

  return rows.map((row) => ({
    id: row.id,
    lot: row.lot,
    owner: row.owner_name,
    type: row.type,
    status: row.status,
  }));
}
