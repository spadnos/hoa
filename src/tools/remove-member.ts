import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import type { Db } from '../db';

export const removeMemberTool: Tool = {
  name: 'remove_member',
  description: 'Remove a member record from the HOA directory by ID.',
  input_schema: {
    type: 'object' as const,
    properties: {
      id: { type: 'number', description: 'Member record ID to remove' },
    },
    required: ['id'],
  },
};

export interface RemoveMemberInput {
  id: number;
}

export async function removeMember(input: RemoveMemberInput, db: Db): Promise<{ message: string }> {
  const result = db
    .prepare(`DELETE FROM members WHERE id = ? AND organization_id = 'emhoa'`)
    .run(input.id);

  if (result.changes === 0) return { message: `No member found with ID ${input.id}` };
  return { message: `Removed member ${input.id}` };
}
