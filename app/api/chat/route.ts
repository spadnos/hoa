import Anthropic from '@anthropic-ai/sdk';
import { getTools, executeTool } from '@/src/tools/index';
import { SYSTEM_PROMPT } from '@/src/system-prompt';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  const { messages } = (await request.json()) as { messages: Anthropic.MessageParam[] };

  const encoder = new TextEncoder();
  const tools = getTools();
  const allMessages: Anthropic.MessageParam[] = [...messages];

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        while (true) {
          const anthropicStream = anthropic.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            messages: allMessages,
            tools,
          });

          const toolUses: { id: string; name: string; inputJson: string }[] = [];
          let currentToolUse: { id: string; name: string; inputJson: string } | null = null;

          for await (const event of anthropicStream) {
            if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
              currentToolUse = { id: event.content_block.id, name: event.content_block.name, inputJson: '' };
            } else if (event.type === 'content_block_delta') {
              if (event.delta.type === 'text_delta') {
                send({ type: 'text', text: event.delta.text });
              } else if (event.delta.type === 'input_json_delta' && currentToolUse) {
                currentToolUse.inputJson += event.delta.partial_json;
              }
            } else if (event.type === 'content_block_stop' && currentToolUse) {
              toolUses.push({ ...currentToolUse });
              currentToolUse = null;
            }
          }

          const finalMessage = await anthropicStream.finalMessage();

          if (finalMessage.stop_reason === 'end_turn') break;

          if (finalMessage.stop_reason === 'tool_use') {
            allMessages.push({ role: 'assistant', content: finalMessage.content });
            const toolResults: Anthropic.ToolResultBlockParam[] = [];
            for (const toolUse of toolUses) {
              const result = await executeTool(toolUse.name, JSON.parse(toolUse.inputJson || '{}'));
              toolResults.push({
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
              });
            }
            allMessages.push({ role: 'user', content: toolResults });
          }
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
