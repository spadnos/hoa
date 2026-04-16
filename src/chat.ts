import { Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { getTools, executeTool } from './tools/index';
import { SYSTEM_PROMPT } from './system-prompt';

export function createChatHandler(anthropic: Anthropic) {
  return async function chatHandler(req: Request, res: Response): Promise<void> {
    const { messages } = req.body as { messages: Anthropic.MessageParam[] };

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const tools = getTools();
    const allMessages: Anthropic.MessageParam[] = [...messages];

    try {
      while (true) {
        const stream = anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: allMessages,
          tools,
        });

        const toolUses: {
          id: string;
          name: string;
          inputJson: string;
        }[] = [];
        let currentToolUse: { id: string; name: string; inputJson: string } | null = null;

        for await (const event of stream) {
          if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
            currentToolUse = {
              id: event.content_block.id,
              name: event.content_block.name,
              inputJson: '',
            };
          } else if (event.type === 'content_block_delta') {
            if (event.delta.type === 'text_delta') {
              res.write(`data: ${JSON.stringify({ type: 'text', text: event.delta.text })}\n\n`);
            } else if (event.delta.type === 'input_json_delta' && currentToolUse) {
              currentToolUse.inputJson += event.delta.partial_json;
            }
          } else if (event.type === 'content_block_stop' && currentToolUse) {
            toolUses.push({ ...currentToolUse });
            currentToolUse = null;
          }
        }

        const finalMessage = await stream.finalMessage();

        if (finalMessage.stop_reason === 'end_turn') {
          break;
        }

        if (finalMessage.stop_reason === 'tool_use') {
          allMessages.push({ role: 'assistant', content: finalMessage.content });

          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const toolUse of toolUses) {
            const result = await executeTool(
              toolUse.name,
              JSON.parse(toolUse.inputJson || '{}')
            );
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content:
                typeof result === 'string' ? result : JSON.stringify(result, null, 2),
            });
          }

          allMessages.push({ role: 'user', content: toolResults });
        }
      }

      res.write('data: [DONE]\n\n');
    } catch (err) {
      res.write(
        `data: ${JSON.stringify({ type: 'error', message: String(err) })}\n\n`
      );
    }

    res.end();
  };
}
