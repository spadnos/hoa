import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import type { ApprovalType } from '../types';
import type { Db } from '../db';

export const listApprovalTypesTool: Tool = {
  name: 'list_approval_types',
  description: 'List the external agency approval types configured for this HOA.',
  input_schema: {
    type: 'object' as const,
    properties: {},
    required: [],
  },
};

export function listApprovalTypes(db: Db, orgId: string): ApprovalType[] {
  return db.prepare(
    `SELECT id, organization_id, name, label, description, sort_order,
            is_required_by_default, is_warning_indicator, is_active, created_at
     FROM approval_types
     WHERE organization_id = ? AND is_active = 1
     ORDER BY sort_order, id`
  ).all(orgId) as ApprovalType[];
}
