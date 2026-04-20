import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import type { ProjectApproval } from '../types';
import type { Db } from '../db';

export const listProjectApprovalsTool: Tool = {
  name: 'list_project_approvals',
  description: 'List all external agency approval records for a project.',
  input_schema: {
    type: 'object' as const,
    properties: {
      project_id: { type: 'string', description: 'Project ID, e.g. "2026-001"' },
    },
    required: ['project_id'],
  },
};

export interface ListProjectApprovalsInput {
  project_id: string;
}

export function listProjectApprovals(
  input: ListProjectApprovalsInput,
  db: Db,
  orgId: string
): ProjectApproval[] {
  return db.prepare(
    `SELECT pa.id, pa.project_id, pa.organization_id, pa.approval_type_id,
            at.name  AS approval_type_name,
            at.label AS approval_type_label,
            at.is_warning_indicator,
            pa.status, pa.notes, pa.updated_at, pa.created_at
     FROM project_approvals pa
     JOIN approval_types at ON at.id = pa.approval_type_id
     WHERE pa.project_id = ? AND pa.organization_id = ?
     ORDER BY at.sort_order, pa.id`
  ).all(input.project_id, orgId) as ProjectApproval[];
}
