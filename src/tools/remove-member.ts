import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import type { Db } from '../db';

export const removeMemberTool: Tool = {
  name: 'remove_member',
  description: 'End a member\'s association with a lot (soft delete — preserves history). Provide the party ID and optionally the lot number.',
  input_schema: {
    type: 'object' as const,
    properties: {
      id: { type: 'number', description: 'Party ID to remove' },
      lot: { type: 'number', description: 'Lot number to end association for (optional; ends all lot associations if omitted)' },
    },
    required: ['id'],
  },
};

export interface RemoveMemberInput {
  id: number;
  lot?: number;
}

export async function removeMember(input: RemoveMemberInput, db: Db): Promise<{ message: string }> {
  const today = new Date().toISOString().split('T')[0];

  let sql = `UPDATE lot_associations SET end_date = ? WHERE party_id = ? AND end_date IS NULL`;
  const params: unknown[] = [today, input.id];

  if (input.lot !== undefined) {
    sql += ` AND lot_id = (SELECT id FROM lots WHERE organization_id = 'emhoa' AND lot_number = ?)`;
    params.push(input.lot);
  }

  const result = db.prepare(sql).run(...params);

  if (result.changes === 0) return { message: `No active lot association found for party ${input.id}` };
  return { message: `Ended lot association for party ${input.id}` };
}
