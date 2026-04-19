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
  lot_number: number;
  owner_name: string | null;
  type: ProjectType;
  status: ProjectStatus;
}

export async function listProjects(input: ListProjectsInput, db: Db, orgId: string): Promise<ProjectSummary[]> {
  let sql = `
    SELECT p.id, l.lot_number, op.name as owner_name, p.type, p.status
    FROM projects p
    JOIN lots l ON l.id = p.lot_id
    LEFT JOIN parties op ON op.id = p.owner_party_id
    WHERE p.organization_id = ?`;
  const params: unknown[] = [orgId];

  if (input.status) {
    sql += ' AND p.status = ?';
    params.push(input.status);
  }
  if (input.type) {
    sql += ' AND p.type = ?';
    params.push(input.type);
  }
  if (input.lot !== undefined) {
    sql += ' AND l.lot_number = ?';
    params.push(input.lot);
  }

  sql += ' ORDER BY p.id';

  const rows = db.prepare(sql).all(...params) as SummaryRow[];

  return rows.map((row) => ({
    id: row.id,
    lot: row.lot_number,
    owner: row.owner_name ?? 'Unknown',
    type: row.type,
    status: row.status,
  }));
}
