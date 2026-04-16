import { Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { createChatHandler } from '../src/chat';

function makeRes() {
  const written: string[] = [];
  return {
    setHeader: jest.fn(),
    write: jest.fn((chunk: string) => written.push(chunk)),
    end: jest.fn(),
    written,
  };
}

function makeStream(
  events: object[],
  stopReason: string,
  content: object[]
) {
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const event of events) yield event;
    },
    finalMessage: async () => ({ stop_reason: stopReason, content }),
  };
}

test('streams text response via SSE', async () => {
  const stream = makeStream(
    [
      { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Hello' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: ' world' } },
    ],
    'end_turn',
    [{ type: 'text', text: 'Hello world' }]
  );

  const mockAnthropic = {
    messages: { stream: jest.fn().mockReturnValue(stream) },
  } as unknown as Anthropic;

  const handler = createChatHandler(mockAnthropic);
  const req = { body: { messages: [{ role: 'user', content: 'hi' }] } } as Request;
  const resMock = makeRes();
  const res = resMock as unknown as Response;

  await handler(req, res);

  const textEvents = resMock.written.filter((w) => w.includes('"type":"text"'));
  expect(textEvents.length).toBeGreaterThan(0);
  expect(textEvents.join('')).toContain('Hello');
  expect(resMock.written.some((w) => w.includes('[DONE]'))).toBe(true);
});

test('executes tool calls and continues conversation', async () => {
  let callCount = 0;

  const toolStream = makeStream(
    [
      { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: 'tu_1', name: 'list_projects' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '{}' } },
      { type: 'content_block_stop', index: 0 },
    ],
    'tool_use',
    [{ type: 'tool_use', id: 'tu_1', name: 'list_projects', input: {} }]
  );

  const textStream = makeStream(
    [{ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Done' } }],
    'end_turn',
    [{ type: 'text', text: 'Done' }]
  );

  const mockAnthropic = {
    messages: {
      stream: jest.fn().mockImplementation(() => {
        callCount++;
        return callCount === 1 ? toolStream : textStream;
      }),
    },
  } as unknown as Anthropic;

  const handler = createChatHandler(mockAnthropic);
  const req = { body: { messages: [{ role: 'user', content: 'list projects' }] } } as Request;
  const resMock = makeRes();
  const res = resMock as unknown as Response;

  await handler(req, res);

  expect(callCount).toBe(2);
  expect(resMock.written.some((w) => w.includes('[DONE]'))).toBe(true);
});
