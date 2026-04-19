import Anthropic from '@anthropic-ai/sdk';
import { getHomeownerTools, executeTool } from '@/src/tools/index';
import { buildHomeownerPrompt } from '@/src/homeowner-submit-prompt';
import { getSession } from '@/src/auth/session';
import { hasPermission } from '@/src/auth/permissions';
import { getDb, ORG_ID } from '@/src/db';
import { createOrLoadSession, persistTurn, calcCost } from '@/src/chat-persistence';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !hasPermission(session, 'homeowner')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { lotId, messages, sessionId: incomingSessionId } = (await request.json()) as {
    lotId: number;
    messages: Anthropic.MessageParam[];
    sessionId?: string;
  };

  const db = getDb();
  const orgId = session.organizationId ?? ORG_ID;
  const partyId = session.partyId;

  // Verify the lot belongs to this homeowner and fetch lot details
  const lotRow = db
    .prepare(
      `SELECT l.id, l.lot_number, laddr.address, p.name, p.email, p.phone
       FROM lot_associations la
       JOIN lots l ON l.id = la.lot_id
       LEFT JOIN lot_addresses laddr ON laddr.lot_id = l.id
       LEFT JOIN parties p ON p.id = la.party_id
       WHERE la.party_id = ? AND l.id = ? AND la.end_date IS NULL AND l.organization_id = ?
       LIMIT 1`
    )
    .get(partyId, lotId, orgId) as {
    id: number;
    lot_number: number;
    address: string | null;
    name: string | null;
    email: string | null;
    phone: string | null;
  } | undefined;

  if (!lotRow) {
    return new Response('Forbidden', { status: 403 });
  }

  const lotContext = {
    lotNumber: lotRow.lot_number,
    address: lotRow.address ?? '',
    ownerName: lotRow.name ?? 'Unknown Owner',
    ownerEmail: lotRow.email ?? undefined,
    ownerPhone: lotRow.phone ?? undefined,
  };

  const newUserMessage = messages[messages.length - 1];
  const userText =
    typeof newUserMessage?.content === 'string' ? newUserMessage.content : '';

  const persistResult = createOrLoadSession(db, {
    sessionId: incomingSessionId,
    orgId,
    partyId,
    chatType: 'portal',
    lotId,
    firstUserMessage: userText,
  });
  const { sessionId, priorMessages, sessionTotals } = persistResult;

  const encoder = new TextEncoder();
  const tools = getHomeownerTools();
  const allMessages: Anthropic.MessageParam[] = [...priorMessages, ...messages];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let accumulatedAssistantText = '';

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send({ type: 'session_id', sessionId });

      try {
        while (true) {
          const model = 'claude-haiku-4-5-20251001';
          const anthropicStream = anthropic.messages.stream({
            model,
            max_tokens: 4096,
            system: buildHomeownerPrompt(lotContext),
            messages: allMessages,
            tools,
          });

          const toolUses: { id: string; name: string; inputJson: string }[] = [];
          let currentToolUse: { id: string; name: string; inputJson: string } | null = null;
          let currentBlockText = '';

          for await (const event of anthropicStream) {
            if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
              currentToolUse = { id: event.content_block.id, name: event.content_block.name, inputJson: '' };
            } else if (event.type === 'content_block_start' && event.content_block.type === 'text') {
              currentBlockText = '';
            } else if (event.type === 'content_block_delta') {
              if (event.delta.type === 'text_delta') {
                send({ type: 'text', text: event.delta.text });
                currentBlockText += event.delta.text;
              } else if (event.delta.type === 'input_json_delta' && currentToolUse) {
                currentToolUse.inputJson += event.delta.partial_json;
              }
            } else if (event.type === 'content_block_stop') {
              if (currentToolUse) {
                toolUses.push({ ...currentToolUse });
                currentToolUse = null;
              } else {
                accumulatedAssistantText += currentBlockText;
              }
            }
          }

          const finalMessage = await anthropicStream.finalMessage();
          totalInputTokens += finalMessage.usage?.input_tokens ?? 0;
          totalOutputTokens += finalMessage.usage?.output_tokens ?? 0;

          if (finalMessage.stop_reason === 'end_turn') break;

          if (finalMessage.stop_reason === 'tool_use') {
            allMessages.push({ role: 'assistant', content: finalMessage.content });
            const toolResults: Anthropic.ToolResultBlockParam[] = [];
            for (const toolUse of toolUses) {
              let result: unknown;
              const input = JSON.parse(toolUse.inputJson || '{}') as Record<string, unknown>;

              // Security: prevent project creation for lots the user doesn't own
              if (toolUse.name === 'create_project' && (input.lot as number) !== lotRow.lot_number) {
                result = `Error: You may only submit projects for lot ${lotRow.lot_number}.`;
              } else {
                result = await executeTool(toolUse.name, input, orgId);
              }

              // Signal the UI when a project is successfully created
              if (toolUse.name === 'create_project' && typeof result === 'object' && result !== null && 'id' in result) {
                send({ type: 'project_created', projectId: (result as { id: string }).id });
              }

              toolResults.push({
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
              });
            }
            allMessages.push({ role: 'user', content: toolResults });
          }
        }

        if (userText) {
          const costUsd = calcCost(totalInputTokens, totalOutputTokens, model);
          persistTurn(db, {
            sessionId,
            userContent: userText,
            assistantContent: accumulatedAssistantText,
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            costUsd,
          });
          send({
            type: 'usage',
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            costUsd,
            totalInputTokens: sessionTotals.inputTokens + totalInputTokens,
            totalOutputTokens: sessionTotals.outputTokens + totalOutputTokens,
            totalCostUsd: sessionTotals.costUsd + costUsd,
          });
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (err) {
        send({ type: 'error', message: String(err) });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
