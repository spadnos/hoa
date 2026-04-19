import { getSession } from '@/src/auth/session';
import { getDb } from '@/src/db';
import type { ChatSession } from '@/src/types';

export async function GET() {
  const session = await getSession();
  if (!session?.partyId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, label, chat_type, total_input_tokens, total_output_tokens, total_cost_usd, created_at, updated_at
       FROM chat_sessions
       WHERE party_id = ?
       ORDER BY updated_at DESC
       LIMIT 20`
    )
    .all(session.partyId) as ChatSession[];

  return Response.json(rows);
}
