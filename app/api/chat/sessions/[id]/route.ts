import { getSession } from '@/src/auth/session';
import { getDb } from '@/src/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, ctx: RouteContext) {
  const session = await getSession();
  if (!session?.partyId) return new Response('Unauthorized', { status: 401 });

  const { id } = await ctx.params;
  const db = getDb();

  const chatSession = db
    .prepare('SELECT id FROM chat_sessions WHERE id = ? AND party_id = ?')
    .get(id, session.partyId);
  if (!chatSession) return new Response('Not Found', { status: 404 });

  const messages = db
    .prepare(
      'SELECT role, content, input_tokens, output_tokens, cost_usd, created_at FROM chat_messages WHERE session_id = ? ORDER BY id ASC'
    )
    .all(id);

  return Response.json(messages);
}

export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await getSession();
  if (!session?.partyId) return new Response('Unauthorized', { status: 401 });

  const { id } = await ctx.params;
  const { label } = (await req.json()) as { label: string };
  const db = getDb();

  const result = db
    .prepare("UPDATE chat_sessions SET label = ?, updated_at = datetime('now') WHERE id = ? AND party_id = ?")
    .run(label, id, session.partyId);

  if (result.changes === 0) return new Response('Not Found', { status: 404 });
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: RouteContext) {
  const session = await getSession();
  if (!session?.partyId) return new Response('Unauthorized', { status: 401 });

  const { id } = await ctx.params;
  const db = getDb();

  const result = db
    .prepare('DELETE FROM chat_sessions WHERE id = ? AND party_id = ?')
    .run(id, session.partyId);

  if (result.changes === 0) return new Response('Not Found', { status: 404 });
  return Response.json({ ok: true });
}
