'use client';

import { useEffect, useRef, useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function parseMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded text-sm font-mono">$1</code>')
    .replace(/\n/g, '<br>');
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || isStreaming) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setIsStreaming(true);

    const assistantMessage: Message = { role: 'assistant', content: '' };
    setMessages([...newMessages, assistantMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
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
    <div className="flex flex-col h-[calc(100vh-120px)]">
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
    </div>
  );
}
