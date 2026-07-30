'use client';
import { useCallback, useEffect, useRef, useState, Fragment } from 'react';
import { Send } from 'lucide-react';
import { nanoid } from 'nanoid';
import PromptSuggestions, { type PromptIntent } from './PromptSuggestions';
import PlanCard from './PlanCard';
import ServiceCard from './ServiceCard';
import type { PlanGroups, Plan } from '@/lib/plans';
import type { ServiceGroups, ServiceWithDistance } from '@/lib/services-lookup';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

type Intent = PromptIntent | 'both';

interface LookupResult {
  planGroups: PlanGroups | null;
  serviceGroups: ServiceGroups | null;
  found: boolean;
  address?: string;
  intent: Intent;
}

type ResultMap = Map<string, LookupResult>;

const ADDRESS_RE = /\d+[\w\s.#-]+(?:street|avenue|boulevard|drive|road|lane|court|place|circle|highway|parkway|square|st|ave|blvd|dr|rd|ln|ct|way|pl|cir|hwy|pkwy|loop|sq)/i;

const PLANS_PATTERNS = [
  /internet\s+(plan|offer|option|provider|service)/i,
  /\bisp\b/i,
  /broadband/i,
  /\b(low[- ]cost|free|cheap)\s+internet\b/i,
  /wifi\s+plan/i,
  /which\s+(plan|provider)/i,
];
const SERVICES_PATTERNS = [
  /digital\s+(skill|equity|resource|service|literacy)/i,
  /\btraining\b/i,
  /device\s+access/i,
  /computer\s+(program|access|lab)/i,
  /\blaptop\b/i,
  /tablet\s+program/i,
  /(resource|service)s?\s+near/i,
];

function classifyIntent(text: string): Intent | null {
  const isPlans = PLANS_PATTERNS.some(p => p.test(text));
  const isServices = SERVICES_PATTERNS.some(p => p.test(text));
  if (isPlans && !isServices) return 'plans';
  if (isServices && !isPlans) return 'services';
  return null;
}

function describePlan(p: Plan): string {
  const bits = [`${p.provider}${p.planName ? ` (${p.planName})` : ''}`, p.technology, `${p.downloadMbps}/${p.uploadMbps} Mbps`, `$${p.price}/mo`];
  if (p.lowIncome === 'Y') bits.push(`low-income discount $${p.liDiscount}`);
  bits.push(p.contract === 'Y' ? `${p.contractMonths}-month contract` : 'no contract');
  return `- ${bits.filter(Boolean).join(', ')}`;
}

function summarizePlans(planGroups: PlanGroups): string {
  const lines: string[] = [];
  if (planGroups.threshold.length) {
    lines.push('High-speed plans (100+/25+ Mbps):');
    lines.push(...planGroups.threshold.map(describePlan));
  }
  for (const [provider, plans] of Object.entries(planGroups.byProvider)) {
    lines.push(`${provider}:`);
    lines.push(...plans.map(describePlan));
  }
  return lines.join('\n');
}

const SERVICE_TIERS: Array<[keyof ServiceGroups, string]> = [
  ['within1', 'Within 1 mile'], ['within5', '1-5 miles'], ['within10', '5-10 miles'], ['national', 'National / Online'],
];

function describeService(s: ServiceWithDistance): string {
  const bits = [s.name, `(${s.type})`];
  if (s.distanceMiles != null) bits.push(`${s.distanceMiles.toFixed(1)} mi`);
  if (s.phone) bits.push(s.phone);
  return `- ${bits.join(', ')}`;
}

function summarizeServices(serviceGroups: ServiceGroups): string {
  const lines: string[] = [];
  for (const [key, label] of SERVICE_TIERS) {
    const items = serviceGroups[key];
    if (!items.length) continue;
    lines.push(`${label}:`);
    lines.push(...items.map(describeService));
  }
  return lines.join('\n');
}

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
  const [activeIntent, setActiveIntent] = useState<Intent>('both');
  const [lastLookup, setLastLookup] = useState<Omit<LookupResult, 'intent'> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const sendMessage = useCallback(async (text: string, intentOverride?: Intent) => {
    if (isStreaming) return;

    const detectedIntent = classifyIntent(text);
    const prevIntent = activeIntent;
    const intent = intentOverride ?? detectedIntent ?? prevIntent;
    setActiveIntent(intent);

    const userMsgId = nanoid();
    const assistantMsgId = nanoid();

    const userMsg: Message = { id: userMsgId, role: 'user', content: text };
    setMessages(prev => [...prev, userMsg, { id: assistantMsgId, role: 'assistant', content: '' }]);
    setIsStreaming(true);

    // Build message history for the API (include new user message)
    const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

    const hasNewAddress = ADDRESS_RE.test(text);
    // A topic pivot ("what about digital skills training?") carries no address of its
    // own — reuse the already-fetched data for the last address instead of asking the
    // user to repeat it. This is instant (no network call) since /api/lookup already
    // returns both plans and services groups for an address in one shot.
    const isPivot = !hasNewAddress && detectedIntent !== null && detectedIntent !== prevIntent;

    let contextBlock = '';
    let numPlans: number | undefined;
    let numServices: number | undefined;

    if (hasNewAddress || (isPivot && lastLookup)) {
      try {
        const result: Omit<LookupResult, 'intent'> = hasNewAddress
          ? await (await fetch('/api/lookup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text }),
            })).json()
          : lastLookup!;

        if (hasNewAddress) setLastLookup(result);

        const showPlans = intent !== 'services';
        const showServices = intent !== 'plans';

        numPlans = result.planGroups
          ? result.planGroups.threshold.length + Object.values(result.planGroups.byProvider).reduce((sum, arr) => sum + arr.length, 0)
          : 0;
        numServices = result.serviceGroups
          ? SERVICE_TIERS.reduce((sum, [key]) => sum + result.serviceGroups![key].length, 0)
          : 0;

        const sections: string[] = [`ADDRESS RESULTS for ${result.address ?? 'the address the user provided'}`];

        if (showPlans) {
          sections.push(
            result.planGroups
              ? `MATCHED INTERNET PLANS (this is the complete, authoritative list — the UI card below shows exactly this data, nothing more or different):\n${summarizePlans(result.planGroups)}`
              : 'MATCHED INTERNET PLANS: none found for this address in our database.'
          );
        }
        if (showServices) {
          sections.push(
            result.serviceGroups
              ? `NEARBY DIGITAL EQUITY RESOURCES (complete, authoritative list — matches the UI card below):\n${summarizeServices(result.serviceGroups)}`
              : 'NEARBY DIGITAL EQUITY RESOURCES: none found.'
          );
        }

        const instructions = !result.found
          ? `No FCC broadband database record was found for this exact address, so plan matching may be incomplete — let the user know and suggest they double-check the address or try a nearby cross street.${showPlans ? ' Also suggest contacting ISPs directly (Cox, AT&T, CenturyLink, Spectrum serve Clark County).' : ''}`
          : 'Use ONLY the data above — do not mention or invent any provider, plan, or resource that is not listed.';

        contextBlock = [
          ...sections,
          '',
          instructions,
          showPlans && !showServices ? 'The user only asked about internet plans — do not mention digital equity resources or training programs.' : '',
          showServices && !showPlans ? 'The user only asked about digital equity/training/device resources — do not mention internet plans or pricing.' : '',
          isPivot ? "The user already gave their address earlier and is now asking about a different topic — don't ask them to repeat the address, just answer using the data above." : '',
          'Keep your reply short — the card(s) below your message already show full details.',
        ].filter(Boolean).join('\n\n');

        setResultMap(prev => new Map(prev).set(userMsgId, { ...result, intent }));
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
        body: JSON.stringify({ messages: history, sessionId, contextBlock, intent, numPlans, numServices }),
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
  }, [isStreaming, messages, activeIntent, lastLookup]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    const text = input.trim();
    setInput('');
    sendMessage(text);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-blue-700 px-4 py-4 shrink-0 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/15 ring-1 ring-white/30 flex items-center justify-center text-white text-base font-bold">CC</div>
          <div>
            <p className="text-base font-semibold text-white">Clark County Digital Equity Assistant</p>
            <p className="text-sm text-blue-100">Internet plans & digital resources in Clark County, NV</p>
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
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-base leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-br-sm shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
                  }`}>
                    {m.content
                      ? (isUser ? m.content : <MarkdownContent text={m.content} />)
                      : (isStreaming && isLastMsg && !isUser
                        ? <span className="inline-flex gap-1 text-slate-400">
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
                    {result.planGroups && result.intent !== 'services' && (
                      <PlanCard planGroups={result.planGroups} address={result.address} />
                    )}
                    {result.serviceGroups && result.intent !== 'plans' && (
                      <ServiceCard serviceGroups={result.serviceGroups} />
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-slate-200 px-4 py-3 shrink-0">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type your address or ask a question…"
              disabled={isStreaming}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              className="w-11 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 flex items-center justify-center transition-colors"
            >
              <Send size={18} className="text-white" />
            </button>
          </form>
          <p className="text-xs text-slate-400 text-center mt-2">
            For emergencies, call 911. For social services, call 211.
          </p>
        </div>
      </div>
    </div>
  );
}
