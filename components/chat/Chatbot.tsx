'use client';
import { useCallback, useEffect, useRef, useState, Fragment } from 'react';
import { Send } from 'lucide-react';
import { nanoid } from 'nanoid';
import PromptSuggestions from './PromptSuggestions';
import PlanCard from './PlanCard';
import ServiceCard from './ServiceCard';
import type { PlanGroups } from '@/lib/plans';
import type { ServiceGroups } from '@/lib/services-lookup';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface LookupResult {
  planGroups: PlanGroups | null;
  serviceGroups: ServiceGroups | null;
  found: boolean;
  address?: string;
}

type ResultMap = Map<string, LookupResult>;

const ADDRESS_RE = /\d+[\w\s.#-]+(?:street|avenue|boulevard|drive|road|lane|court|place|circle|highway|parkway|square|st|ave|blvd|dr|rd|ln|ct|way|pl|cir|hwy|pkwy|loop|sq)/i;

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function MarkdownContent({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, i) => {
        if (line.trim() === '---') return <hr key={i} className="border-gray-200 my-2" />;
        return <span key={i}>{i > 0 && '\n'}{renderInline(line)}</span>;
      })}
    </>
  );
}

const sessionId = nanoid();

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [resultMap, setResultMap] = useState<ResultMap>(new Map());
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const sendMessage = useCallback(async (text: string) => {
    if (isStreaming) return;

    const userMsgId = nanoid();
    const assistantMsgId = nanoid();

    const userMsg: Message = { id: userMsgId, role: 'user', content: text };
    setMessages(prev => [...prev, userMsg, { id: assistantMsgId, role: 'assistant', content: '' }]);
    setIsStreaming(true);

    // Build message history for the API (include new user message)
    const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

    // Kick off address lookup in parallel if message contains an address
    let contextBlock = '';
    if (ADDRESS_RE.test(text)) {
      try {
        const res = await fetch('/api/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        const result: LookupResult = await res.json();
        if (result.found) {
          contextBlock = `ADDRESS RESULTS for ${result.address}\n\nInternet plans and digital equity resources have been retrieved and are displayed in the UI cards below your message. Briefly summarize what plans are available, call out any low-income programs, and mention the digital resources cards too. Keep it short — the cards have full details.`;
        } else {
          contextBlock = `ADDRESS LOOKUP: No FCC broadband database record was found for the address the user provided. This means we can't show matched internet plans for that exact address. Let the user know their address wasn't found in our plan database and suggest they contact ISPs directly (Cox, AT&T, CenturyLink, Spectrum serve Clark County). National digital equity resources are displayed in the service cards below — briefly mention those are available.`;
        }
        setResultMap(prev => new Map(prev).set(userMsgId, result));
      } catch {
        // Lookup failed — chat continues without cards
      }
    }

    // Stream the AI response
    try {
      abortRef.current = new AbortController();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, sessionId, contextBlock }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error('Stream failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages(prev =>
          prev.map(m => m.id === assistantMsgId ? { ...m, content: m.content + chunk } : m)
        );
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setMessages(prev =>
          prev.map(m => m.id === assistantMsgId
            ? { ...m, content: 'Something went wrong. Please try again.' }
            : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [isStreaming, messages]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    const text = input.trim();
    setInput('');
    sendMessage(text);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 shrink-0">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">CC</div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Clark County Digital Equity Assistant</p>
            <p className="text-xs text-gray-500">Internet plans & digital resources in Clark County, NV</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 && (
            <PromptSuggestions onSelect={sendMessage} />
          )}

          {messages.map((m, i) => {
            const isUser = m.role === 'user';
            const isLastMsg = i === messages.length - 1;
            const result = isUser ? resultMap.get(m.id) : resultMap.get(messages[i - 1]?.id ?? '');

            return (
              <div key={m.id}>
                <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                  }`}>
                    {m.content
                      ? (isUser ? m.content : <MarkdownContent text={m.content} />)
                      : (isStreaming && isLastMsg && !isUser
                        ? <span className="inline-flex gap-1 text-gray-400">
                            <span className="animate-bounce" style={{ animationDelay: '0ms' }}>•</span>
                            <span className="animate-bounce" style={{ animationDelay: '150ms' }}>•</span>
                            <span className="animate-bounce" style={{ animationDelay: '300ms' }}>•</span>
                          </span>
                        : null
                      )
                    }
                  </div>
                </div>

                {!isUser && result && (
                  <div className="mt-1">
                    {result.planGroups && <PlanCard planGroups={result.planGroups} address={result.address} />}
                    {result.serviceGroups && <ServiceCard serviceGroups={result.serviceGroups} />}
                  </div>
                )}
              </div>
            );
          })}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 shrink-0">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type your address or ask a question…"
              disabled={isStreaming}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 flex items-center justify-center transition-colors"
            >
              <Send size={16} className="text-white" />
            </button>
          </form>
          <p className="text-xs text-gray-400 text-center mt-2">
            For emergencies, call 911. For social services, call 211.
          </p>
        </div>
      </div>
    </div>
  );
}
