import Anthropic from '@anthropic-ai/sdk';
import { getTools, executeTool } from '@/src/tools/index';
import { SYSTEM_PROMPT } from '@/src/system-prompt';
import { getSession } from '@/src/auth/session';
import { getDb, ORG_ID } from '@/src/db';
import { createOrLoadSession, persistTurn, calcCost } from '@/src/chat-persistence';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  const [{ messages, sessionId: incomingSessionId }, session] = await Promise.all([
    request.json() as Promise<{ messages: Anthropic.MessageParam[]; sessionId?: string }>,
    getSession(),
  ]);
  const orgId = session?.organizationId ?? ORG_ID;

  const encoder = new TextEncoder();
  const tools = getTools();

  // The client sends only the new user message when continuing a session.
  // Extract its text for labeling and persistence.
  const newUserMessage = messages[messages.length - 1];
  const userText =
    typeof newUserMessage?.content === 'string'
      ? newUserMessage.content
      : '';

  // Load or create session (requires authenticated session with partyId)
  const db = getDb();
  let sessionId: string | undefined;
  let sessionTotals = { inputTokens: 0, outputTokens: 0, costUsd: 0 };
  let priorMessages: Anthropic.MessageParam[] = [];

  if (session?.partyId) {
    const result = createOrLoadSession(db, {
      sessionId: incomingSessionId,
      orgId,
      partyId: session.partyId,
      chatType: 'acc',
      firstUserMessage: userText,
    });
    sessionId = result.sessionId;
    priorMessages = result.priorMessages;
    sessionTotals = result.sessionTotals;
  }

  const allMessages: Anthropic.MessageParam[] = [...priorMessages, ...messages];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let accumulatedAssistantText = '';

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      if (sessionId) {
        send({ type: 'session_id', sessionId });
      }

      try {
        while (true) {
          const model = 'claude-sonnet-4-6';
          const anthropicStream = anthropic.messages.stream({
            model,
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
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
              const result = await executeTool(toolUse.name, JSON.parse(toolUse.inputJson || '{}'), orgId);
              toolResults.push({
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
              });
            }
            allMessages.push({ role: 'user', content: toolResults });
          }
        }

        if (sessionId && session?.partyId && userText) {
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
