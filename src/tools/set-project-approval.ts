import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import type { ApprovalStatus } from '../types';
import type { Db } from '../db';

export const setProjectApprovalTool: Tool = {
  name: 'set_project_approval',
  description:
    'Set or update the status of an external agency approval for a project. ' +
    'Call list_approval_types first to discover valid approval type name slugs ' +
    '(e.g. "tctac", "usfs_color", "alpine_permit").',
  input_schema: {
    type: 'object' as const,
    properties: {
      project_id: { type: 'string', description: 'Project ID, e.g. "2026-001"' },
      approval_type_name: {
        type: 'string',
        description: 'Name slug from list_approval_types, e.g. "tctac"',
      },
      status: {
        type: 'string',
        enum: ['pending', 'approved', 'not_required', 'issued', 'rejected'],
      },
      notes: { type: 'string', description: 'Optional notes about this approval' },
    },
    required: ['project_id', 'approval_type_name', 'status'],
  },
};

export interface SetProjectApprovalInput {
  project_id: string;
  approval_type_name: string;
  status: ApprovalStatus;
  notes?: string;
}

export function setProjectApproval(
  input: SetProjectApprovalInput,
  db: Db,
  orgId: string
): { id: number; project_id: string } | string {
  const type = db.prepare(
    `SELECT id FROM approval_types WHERE organization_id = ? AND name = ? AND is_active = 1`
  ).get(orgId, input.approval_type_name) as { id: number } | undefined;

  if (!type) return `Unknown approval type: ${input.approval_type_name}`;

  const project = db.prepare(
    `SELECT id FROM projects WHERE id = ? AND organization_id = ?`
  ).get(input.project_id, orgId);

  if (!project) return `Project ${input.project_id} not found`;

  const result = db.prepare(
    `INSERT INTO project_approvals
       (project_id, organization_id, approval_type_id, status, notes, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(project_id, approval_type_id)
     DO UPDATE SET status     = excluded.status,
                   notes      = excluded.notes,
                   updated_at = datetime('now')`
  ).run(input.project_id, orgId, type.id, input.status, input.notes ?? null);

  return { id: result.lastInsertRowid as number, project_id: input.project_id };
}
