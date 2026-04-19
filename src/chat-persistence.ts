import { randomUUID } from 'crypto';
import type Anthropic from '@anthropic-ai/sdk';
import type { Db } from './db';

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6':        { input: 3e-6,    output: 15e-6  }, // $3/$15 per MTok
  'claude-haiku-4-5-20251001': { input: 0.8e-6,  output: 4e-6   }, // $0.80/$4 per MTok
};
const DEFAULT_COSTS = MODEL_COSTS['claude-sonnet-4-6'];

export function calcCost(inputTokens: number, outputTokens: number, model?: string): number {
  const costs = (model && MODEL_COSTS[model]) ?? DEFAULT_COSTS;
  return inputTokens * costs.input + outputTokens * costs.output;
}

interface LoadSessionResult {
  sessionId: string;
  priorMessages: Anthropic.MessageParam[];
  sessionTotals: { inputTokens: number; outputTokens: number; costUsd: number };
}

export function createOrLoadSession(
  db: Db,
  opts: {
    sessionId?: string;
    orgId: string;
    partyId: number;
    chatType: 'acc' | 'portal';
    lotId?: number;
    firstUserMessage: string;
  }
): LoadSessionResult {
  if (opts.sessionId) {
    const session = db
      .prepare(
        'SELECT id, total_input_tokens, total_output_tokens, total_cost_usd FROM chat_sessions WHERE id = ? AND party_id = ?'
      )
      .get(opts.sessionId, opts.partyId) as
      | { id: string; total_input_tokens: number; total_output_tokens: number; total_cost_usd: number }
      | undefined;

    if (session) {
      const rows = db
        .prepare(
          'SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY id DESC LIMIT 80'
        )
        .all(opts.sessionId) as { role: string; content: string }[];

      // rows are DESC, reverse to chronological; take last 40 turns (80 messages)
      const priorMessages: Anthropic.MessageParam[] = rows
        .reverse()
        .map((r) => ({ role: r.role as 'user' | 'assistant', content: r.content }));

      return {
        sessionId: session.id,
        priorMessages,
        sessionTotals: {
          inputTokens: session.total_input_tokens,
          outputTokens: session.total_output_tokens,
          costUsd: session.total_cost_usd,
        },
      };
    }
  }

  // Create new session
  const sessionId = randomUUID();
  const label = opts.firstUserMessage.slice(0, 60) || null;

  db.prepare(
    `INSERT INTO chat_sessions (id, organization_id, party_id, label, chat_type, lot_id)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(sessionId, opts.orgId, opts.partyId, label, opts.chatType, opts.lotId ?? null);

  return { sessionId, priorMessages: [], sessionTotals: { inputTokens: 0, outputTokens: 0, costUsd: 0 } };
}

export function persistTurn(
  db: Db,
  opts: {
    sessionId: string;
    userContent: string;
    assistantContent: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
  }
): void {
  const insertMsg = db.prepare(
    `INSERT INTO chat_messages (session_id, role, content, input_tokens, output_tokens, cost_usd)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const updateSession = db.prepare(
    `UPDATE chat_sessions SET
       total_input_tokens = total_input_tokens + ?,
       total_output_tokens = total_output_tokens + ?,
       total_cost_usd = total_cost_usd + ?,
       updated_at = datetime('now')
     WHERE id = ?`
  );

  db.transaction(() => {
    insertMsg.run(opts.sessionId, 'user', opts.userContent, null, null, null);
    insertMsg.run(opts.sessionId, 'assistant', opts.assistantContent, opts.inputTokens, opts.outputTokens, opts.costUsd);
    updateSession.run(opts.inputTokens, opts.outputTokens, opts.costUsd, opts.sessionId);
  })();
}
