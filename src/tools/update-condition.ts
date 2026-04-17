import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import type { Db } from '../db';

export const updateConditionTool: Tool = {
  name: 'update_condition',
  description: 'Mark a project condition as satisfied.',
  input_schema: {
    type: 'object' as const,
    properties: {
      id: { type: 'number', description: 'Condition ID' },
      satisfied: {
        type: 'boolean',
        description: 'Set to true to mark satisfied, false to clear',
      },
    },
    required: ['id', 'satisfied'],
  },
};

export interface UpdateConditionInput {
  id: number;
  satisfied: boolean;
}

export async function updateCondition(
  input: UpdateConditionInput,
  db: Db
): Promise<{ id: number } | string> {
  const satisfiedAt = input.satisfied ? new Date().toISOString().split('T')[0] : null;

  const result = db
    .prepare(
      `UPDATE conditions SET satisfied_at = ?
       WHERE id = ? AND organization_id = 'emhoa'`
    )
    .run(satisfiedAt, input.id);

  if (result.changes === 0) return `Condition ${input.id} not found`;

  return { id: input.id };
}
