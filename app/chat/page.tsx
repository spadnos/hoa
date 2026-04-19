'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChatSession } from '@/src/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SessionUsage {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
}

function parseMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded text-sm font-mono">$1</code>')
    .replace(/\n/g, '<br>');
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

function formatCost(usd: number): string {
  if (usd < 0.01) return '<$0.01';
  return `$${usd.toFixed(2)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: 'short' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [usage, setUsage] = useState<SessionUsage | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    fetch('/api/chat/sessions')
      .then((r) => r.ok ? r.json() : [])
      .then((data: ChatSession[]) => setSessions(data))
      .catch(() => {});
  }, []);

  function startNewChat() {
    setMessages([]);
    setInput('');
    setIsStreaming(false);
    setSessionId(null);
    setUsage(null);
  }

  async function loadSession(id: string) {
    try {
      const r = await fetch(`/api/chat/sessions/${id}`);
      if (!r.ok) return;
      const rows = (await r.json()) as { role: string; content: string }[];
      setMessages(rows.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })));
      setSessionId(id);
      const s = sessions.find((s) => s.id === id);
      if (s) {
        setUsage({
          totalInputTokens: s.total_input_tokens,
          totalOutputTokens: s.total_output_tokens,
          totalCostUsd: s.total_cost_usd,
        });
      }
    } catch {
      // ignore
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || isStreaming) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setIsStreaming(true);

    const assistantMessage: Message = { role: 'assistant', content: '' };
    setMessages([...newMessages, assistantMessage]);

    // When continuing a session, send only the new message; server loads history.
    const messagesToSend = sessionId
      ? [{ role: 'user' as const, content: text }]
      : [{ role: 'user' as const, content: text }];

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messagesToSend, sessionId }),
      });

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
            const event = JSON.parse(data);
            if (event.type === 'text') {
              assistantMessage.content += event.text;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...assistantMessage };
                return updated;
              });
            } else if (event.type === 'session_id' && !sessionId) {
              setSessionId(event.sessionId);
            } else if (event.type === 'usage') {
              const newSession: SessionUsage = {
                totalInputTokens: event.totalInputTokens,
                totalOutputTokens: event.totalOutputTokens,
                totalCostUsd: event.totalCostUsd,
              };
              setUsage(newSession);
              // Refresh session list to show the new/updated session
              fetch('/api/chat/sessions')
                .then((r) => r.ok ? r.json() : [])
                .then((data: ChatSession[]) => setSessions(data))
                .catch(() => {});
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (err) {
      assistantMessage.content = `Error: ${String(err)}`;
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...assistantMessage };
        return updated;
      });
    }

    setIsStreaming(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-120px)]">
      {/* Sidebar */}
      <div className="w-56 shrink-0 flex flex-col gap-3">
        <button
          onClick={startNewChat}
          className="w-full px-4 py-2.5 rounded-xl text-white text-sm font-medium flex items-center gap-2 transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--hoa-green)' }}
        >
          <span className="text-lg leading-none">+</span>
          New Chat
        </button>

        <div className="flex-1 overflow-y-auto">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 px-1">Recent</p>
          {sessions.length === 0 ? (
            <p className="text-xs text-gray-400 px-1">No sessions yet</p>
          ) : (
            <ul className="space-y-1">
              {sessions.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => loadSession(s.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors ${
                      s.id === sessionId
                        ? 'bg-gray-200 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    title={s.label ?? 'Chat session'}
                  >
                    <span className="block truncate">{s.label ?? 'Untitled'}</span>
                    <span className="block text-xs text-gray-400 mt-0.5 flex gap-1">
                      <span>{formatDate(s.updated_at)}</span>
                      {s.chat_type === 'portal' && (
                        <span className="text-blue-400">· portal</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">HOA Assistant</h1>
        <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-gray-200 p-4 space-y-4 mb-4">
          {messages.length === 0 && (
            <p className="text-sm text-gray-400 text-center mt-8">
              Ask about projects, fees, deadlines, contacts, or anything HOA-related.
            </p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
                style={msg.role === 'user' ? { backgroundColor: 'var(--hoa-green)' } : undefined}
                dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) || (isStreaming && i === messages.length - 1 ? '<span class="opacity-50">…</span>' : '') }}
              />
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="Ask a question… (Enter to send, Shift+Enter for newline)"
            className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ '--tw-ring-color': 'var(--hoa-green)' } as React.CSSProperties}
            disabled={isStreaming}
          />
          <button
            onClick={sendMessage}
            disabled={isStreaming || !input.trim()}
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
      </div>
    </div>
  );
}
