'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { LotOption } from './page';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SessionUsage {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

function formatCost(usd: number): string {
  if (usd < 0.01) return '<$0.01';
  return `$${usd.toFixed(2)}`;
}

export default function SubmitProjectClient({ lots }: { lots: LotOption[] }) {
  const [selectedLotId, setSelectedLotId] = useState<number>(lots[0].id);
  const [description, setDescription] = useState('');
  const [phase, setPhase] = useState<'intake' | 'chat'>('intake');
  const [messages, setMessages] = useState<Message[]>([]);
  const [followUp, setFollowUp] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [usage, setUsage] = useState<SessionUsage | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function streamChat(lotId: number, newUserText: string, currentSessionId: string | null) {
    setIsStreaming(true);

    const assistantMessage: Message = { role: 'assistant', content: '' };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const response = await fetch('/api/portal/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lotId,
          messages: [{ role: 'user', content: newUserText }],
          sessionId: currentSessionId,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: `Error: ${errText}` };
          return updated;
        });
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') break;

          try {
            const event = JSON.parse(data) as { type: string; text?: string; projectId?: string; message?: string; sessionId?: string; totalInputTokens?: number; totalOutputTokens?: number; totalCostUsd?: number };
            if (event.type === 'text' && event.text) {
              assistantMessage.content += event.text;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...assistantMessage };
                return updated;
              });
            } else if (event.type === 'project_created' && event.projectId) {
              setCreatedProjectId(event.projectId);
            } else if (event.type === 'session_id' && event.sessionId && !currentSessionId) {
              setSessionId(event.sessionId);
            } else if (event.type === 'usage') {
              setUsage({
                totalInputTokens: event.totalInputTokens ?? 0,
                totalOutputTokens: event.totalOutputTokens ?? 0,
                totalCostUsd: event.totalCostUsd ?? 0,
              });
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: `Error: ${String(err)}` };
        return updated;
      });
    }

    setIsStreaming(false);
  }

  async function handleStart() {
    const text = description.trim();
    if (!text) return;

    setMessages([{ role: 'user', content: text }]);
    setPhase('chat');
    await streamChat(selectedLotId, text, null);
  }

  async function handleFollowUp() {
    const text = followUp.trim();
    if (!text || isStreaming) return;

    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setFollowUp('');
    await streamChat(selectedLotId, text, sessionId);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleFollowUp();
    }
  }

  const selectedLot = lots.find((l) => l.id === selectedLotId) ?? lots[0];

  if (phase === 'intake') {
    return (
      <div className="space-y-5">
        {/* Lot selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
          {lots.length === 1 ? (
            <p className="text-sm text-gray-900 py-2">
              Lot {selectedLot.lotNumber}{selectedLot.address ? ` — ${selectedLot.address}` : ''}
            </p>
          ) : (
            <select
              value={selectedLotId}
              onChange={(e) => setSelectedLotId(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': 'var(--hoa-green)' } as React.CSSProperties}
            >
              {lots.map((lot) => (
                <option key={lot.id} value={lot.id}>
                  Lot {lot.lotNumber}{lot.address ? ` — ${lot.address}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Project description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Describe Your Project
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder={
              'Examples:\n• "I want to add a deck off the back of the house"\n• "I need to remove several dead pine trees"\n• "I\'m planning to repaint the exterior"'
            }
            className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ '--tw-ring-color': 'var(--hoa-green)' } as React.CSSProperties}
          />
        </div>

        <button
          onClick={handleStart}
          disabled={!description.trim()}
          className="px-6 py-2.5 rounded-xl text-white text-sm font-medium transition-opacity disabled:opacity-40"
          style={{ backgroundColor: 'var(--hoa-green)' }}
        >
          Get Started
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-220px)]">
      {/* Lot context header */}
      <div className="mb-3 text-xs text-gray-500">
        Lot {selectedLot.lotNumber}{selectedLot.address ? ` — ${selectedLot.address}` : ''}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-gray-200 p-4 space-y-4 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user' ? 'text-white' : 'bg-gray-100 text-gray-900'
              }`}
              style={msg.role === 'user' ? { backgroundColor: 'var(--hoa-green)' } : undefined}
            >
              {msg.content ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    ul: ({ children }) => <ul className="list-disc pl-4 mb-1 space-y-0.5">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-4 mb-1 space-y-0.5">{children}</ol>,
                    li: ({ children }) => <li>{children}</li>,
                    table: ({ children }) => <table className="border-collapse text-xs my-1 w-full">{children}</table>,
                    th: ({ children }) => <th className="border border-gray-300 px-2 py-1 bg-gray-200 font-medium text-left">{children}</th>,
                    td: ({ children }) => <td className="border border-gray-300 px-2 py-1">{children}</td>,
                    code: ({ children }) => <code className="bg-gray-200 px-1 rounded font-mono">{children}</code>,
                    h1: ({ children }) => <h1 className="font-semibold text-base mb-1">{children}</h1>,
                    h2: ({ children }) => <h2 className="font-semibold mb-1">{children}</h2>,
                    h3: ({ children }) => <h3 className="font-medium mb-1">{children}</h3>,
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              ) : (
                isStreaming && i === messages.length - 1 && (
                  <span className="opacity-50">…</span>
                )
              )}
            </div>
          </div>
        ))}

        {/* Project created confirmation */}
        {createdProjectId && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <p className="font-semibold mb-1">Application submitted — {createdProjectId}</p>
            <p>
              The ACC will review your application.{' '}
              <Link href={`/projects/${createdProjectId}`} className="underline font-medium">
                View project
              </Link>{' '}
              or{' '}
              <Link href="/portal" className="underline font-medium">
                return to My Account
              </Link>
              .
            </p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Follow-up input */}
      {!createdProjectId && (
        <>
          <div className="flex gap-3">
            <textarea
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder="Reply… (Enter to send, Shift+Enter for newline)"
              className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': 'var(--hoa-green)' } as React.CSSProperties}
              disabled={isStreaming}
            />
            <button
              onClick={handleFollowUp}
              disabled={isStreaming || !followUp.trim()}
              className="px-5 py-2.5 rounded-xl text-white text-sm font-medium transition-opacity disabled:opacity-40"
              style={{ backgroundColor: 'var(--hoa-green)' }}
            >
              {isStreaming ? '…' : 'Send'}
            </button>
          </div>
          {usage && (
            <p className="text-xs text-gray-400 mt-1.5 px-1">
              Session: {formatTokens(usage.totalInputTokens + usage.totalOutputTokens)} tokens · ~{formatCost(usage.totalCostUsd)}
            </p>
          )}
        </>
      )}
    </div>
  );
}
