'use client';
import { useCallback, useEffect, useRef, useState, useMemo, Fragment, memo } from 'react';
import { nanoid } from 'nanoid';
import { ArrowDown, House, MessageSquarePlus, RotateCcw } from 'lucide-react';
import ChatInput, { type SendOptions } from './ChatInput';
import ResetConfirmation from './ResetConfirmation';
import { Button } from '@/components/ui/button';
import PromptSuggestions, { type PromptIntent } from './PromptSuggestions';
import PlanCard, { RecommendedPlanCard } from './PlanCard';
import PlansTable from './PlansTable';
import ServiceCard from './ServiceCard';
import ServicesTable from './ServicesTable';
import ChoiceButtons from './ChoiceButtons';
import {
  flattenPlans,
  recommendPlan,
  HOUSEHOLD_SIZE_OPTIONS,
  USAGE_PROFILE_OPTIONS,
  DEVICE_COUNT_OPTIONS,
  type PlanGroups,
  type Plan,
  type HouseholdSize,
  type UsageProfile,
  type DeviceCount,
} from '@/lib/plan-utils';
import { getTopServices, type ServiceGroups, type ServiceWithDistance } from '@/lib/services-lookup';
import { SERVICE_TYPES } from '@/lib/services';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  archived?: boolean;
  superseded?: boolean;
  answerKey?: 'household' | 'devices' | 'usage' | 'service' | 'recommendation';
  stopped?: boolean;
  suppressResults?: boolean;
  resultsReady?: boolean;
  addressChange?: boolean;
}

type Intent = PromptIntent | 'both';

interface LookupResult {
  planGroups: PlanGroups | null;
  serviceGroups: ServiceGroups | null;
  found: boolean;
  validated?: boolean;
  address?: string;
  confirmAddress?: string;
  lat?: number;
  lon?: number;
  intent: Intent;
}

type ResultMap = Map<string, LookupResult>;

// Steps 5-9 of the internet-offer flow: show the headline plans first, then
// branch into "see everything" or a guided household-size/devices/usage recommendation.
type PlanFlowStep = 'idle' | 'top_shown' | 'awaiting_household' | 'awaiting_devices' | 'awaiting_usage' | 'all_shown' | 'recommended_shown';

interface PlanFlowState {
  step: PlanFlowStep;
  sourceMsgId?: string;
  planGroups?: PlanGroups;
  address?: string;
  householdSize?: HouseholdSize;
  deviceCount?: DeviceCount;
  usageProfile?: UsageProfile;
  recommendedPlan?: Plan | null;
  recommendationNote?: string;
}

const IDLE_PLAN_FLOW: PlanFlowState = { step: 'idle' };

// Mirrors PlanFlowState's shape but kept separate — the two flows have
// different steps/payloads and a shared generic engine wouldn't reduce the
// actual per-step JSX, just add indirection.
type ServiceFlowStep = 'idle' | 'top_shown' | 'all_shown' | 'awaiting_type' | 'filtered_shown';

interface ServiceFlowState {
  step: ServiceFlowStep;
  sourceMsgId?: string;
  serviceGroups?: ServiceGroups;
  selectedType?: string;
}

const IDLE_SERVICE_FLOW: ServiceFlowState = { step: 'idle' };

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
  /\b(free|low[- ]cost|cheap|refurbished)\s+\w*\s*devices?\b/i,
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

const MarkdownContent = memo(function MarkdownContent({ text }: { text: string }) {
  const lines = useMemo(() => text.split('\n'), [text]);
  return (
    <>
      {lines.map((line, i) => {
        if (line.trim() === '---') return <hr key={i} className="border-gray-200 my-2" />;
        return <span key={i}>{i > 0 && '\n'}{renderInline(line)}</span>;
      })}
    </>
  );
});

// Holds an already-fetched lookup result while we wait for the user to
// confirm the geocoded address, before any plans/resources are shown for it.
interface RequestJob {
  userMsgId: string;
  assistantMsgId: string;
  text: string;
  intent: Intent;
  sessionId: string;
  history: Array<{ role: string; content: string }>;
  needsLookup: boolean;
  confirmed?: boolean;
  replacing?: boolean;
  result?: Omit<LookupResult, 'intent'>;
  outcome?: { contextBlock: string; numPlans: number; numServices: number; lat?: number; lon?: number; showDisclaimer: boolean };
}

const PLAN_DISCLAIMER = "A quick note: this list isn't influenced by search engine optimization, advertising, or paid placement — plans are shown based on availability data only.";

// Fire-and-forget: these selections happen entirely client-side (no /api/chat
// call necessarily follows), so they're posted to their own endpoint rather
// than piggybacked on the next chat turn, which may never come.
function logSelection(sessionId: string, fields: { householdSize?: string; usageProfile?: string; deviceCount?: string; serviceType?: string }) {
  fetch('/api/log-selection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, ...fields }),
  }).catch(() => {});
}

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [resultMap, setResultMap] = useState<ResultMap>(new Map());
  const [activeIntent, setActiveIntent] = useState<Intent>('both');
  const [lastLookup, setLastLookup] = useState<Omit<LookupResult, 'intent'> | null>(null);
  const [planFlow, setPlanFlow] = useState<PlanFlowState>(IDLE_PLAN_FLOW);
  const [serviceFlow, setServiceFlow] = useState<ServiceFlowState>(IDLE_SERVICE_FLOW);
  const [showMainMenu, setShowMainMenu] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<RequestJob | null>(null);
  const [workflow, setWorkflow] = useState<{ prompt: string; intent: PromptIntent } | null>(null);
  const [resetAction, setResetAction] = useState<'home' | 'new' | null>(null);
  const [skipResetConfirmation, setSkipResetConfirmation] = useState(false);
  const [dontShowResetAgain, setDontShowResetAgain] = useState(false);
  const [inputKey, setInputKey] = useState(0);
  const [hasDraft, setHasDraft] = useState(false);
  const [changingAddress, setChangingAddress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryJob, setRetryJob] = useState<RequestJob | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [showJump, setShowJump] = useState(false);
  const sessionRef = useRef(nanoid());
  const requestRevision = useRef(0);
  const activeJob = useRef<RequestJob | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const guidanceRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const resetFocus = useRef<HTMLElement | null>(null);
  const resetConfirmed = useRef(false);
  // Tracks whether PLAN_DISCLAIMER has already been shown this session — it's
  // a one-time note, not repeated on every subsequent plan search.
  const shownPlanDisclaimerRef = useRef(false);

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => composerRef.current?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus());
  }, []);
  const jumpToLatest = useCallback(() => {
    nearBottom.current = true;
    setShowJump(false);
    const viewport = viewportRef.current;
    if (viewport) viewport.scrollTo({ top: viewport.scrollHeight, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }, []);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    if (nearBottom.current) viewport.scrollTop = viewport.scrollHeight;
    else setShowJump(true);
  }, [messages, isStreaming, planFlow, serviceFlow, pendingConfirm]);
  useEffect(() => {
    if (isStreaming || changingAddress) return;
    if (planFlow.step !== 'idle' || serviceFlow.step !== 'idle' || pendingConfirm) {
      guidanceRef.current?.focus({ preventScroll: true });
    }
  }, [planFlow.step, serviceFlow.step, pendingConfirm, isStreaming, changingAddress]);
  useEffect(() => () => { requestRevision.current += 1; abortRef.current?.abort(); }, []);

  const invalidateRequest = useCallback(() => {
    requestRevision.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    activeJob.current = null;
    setIsStreaming(false);
  }, []);
  const resetClient = useCallback((destination: 'home' | 'new') => {
    invalidateRequest();
    sessionRef.current = nanoid();
    const retained = destination === 'new' ? workflow : null;
    setWorkflow(retained);
    setActiveIntent(retained?.intent ?? 'both');
    setMessages(retained ? [
      { id: nanoid(), role: 'user', content: retained.prompt },
      { id: nanoid(), role: 'assistant', content: 'Please enter the new client’s address, including the city and ZIP code.' },
    ] : []);
    setLastLookup(null);
    setResultMap(new Map());
    setPlanFlow(IDLE_PLAN_FLOW);
    setServiceFlow(IDLE_SERVICE_FLOW);
    setPendingConfirm(null);
    setShowMainMenu(false);
    setChangingAddress(false);

    setError(null);
    setRetryJob(null);
    setHasDraft(false);
    setInputKey(k => k + 1);
    shownPlanDisclaimerRef.current = false;
    nearBottom.current = true;
    setShowJump(false);
    setResetAction(null);
    setAnnouncement(retained ? 'New client started in the same workflow. Enter an address.' : 'Conversation cleared. Choose one of the three options.');
    focusInput();
  }, [invalidateRequest, workflow, focusInput]);
  const requestReset = useCallback((destination: 'home' | 'new') => {
    const skipConfirmation = skipResetConfirmation || document.cookie.split('; ').includes('cc-skip-reset-confirmation=1');
    if (!skipConfirmation && (messages.length || hasDraft || lastLookup || isStreaming || changingAddress)) {
      resetFocus.current = document.activeElement as HTMLElement;
      resetConfirmed.current = false;
      setDontShowResetAgain(false);
      setResetAction(destination);
    } else resetClient(destination);
  }, [messages.length, hasDraft, lastLookup, isStreaming, changingAddress, resetClient, skipResetConfirmation]);

  // Declared ahead of sendMessage/handleAddressConfirm — both reference it in
  // their dependency arrays, which are evaluated as soon as those useCallback
  // calls run, so it must already be initialized by then.
  const appendAssistantText = useCallback((text: string) => {
    setMessages(prev => [...prev, { id: nanoid(), role: 'assistant', content: text }]);
  }, []);

  // Turns a fetched (or reused) lookup result into the LLM contextBlock and
  // sets resultMap/planFlow/serviceFlow/lastLookup — split out of sendMessage
  // so the address-confirmation step can defer this until the user says yes.
  const buildLookupOutcome = useCallback((result: Omit<LookupResult, 'intent'>, intent: Intent, userMsgId: string, isPivot: boolean) => {
    const showPlans = intent !== 'services';
    const showServices = intent !== 'plans';

    const numPlans = result.planGroups
      ? result.planGroups.threshold.length + Object.values(result.planGroups.byProvider).reduce((sum, arr) => sum + arr.length, 0)
      : 0;
    const numServices = result.serviceGroups
      ? SERVICE_TIERS.reduce((sum, [key]) => sum + result.serviceGroups![key].length, 0)
      : 0;

    const sections: string[] = [`ADDRESS RESULTS for ${result.address ?? result.confirmAddress ?? 'the address the user provided'}`];

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

    const instructions = result.validated === false
      ? 'The address could not be validated against OpenStreetMap — it may be misspelled or incomplete. Ask the user to double-check the spelling or add more detail (unit number, cross street, or ZIP). Do not mention plans or resources yet.'
      : !result.found
      ? `No FCC broadband database record was found for this exact address, so plan matching may be incomplete — let the user know and suggest they double-check the address or try a nearby cross street.${showPlans ? ' Also suggest contacting ISPs directly (Cox, AT&T, CenturyLink, Spectrum serve Clark County).' : ''}`
      : 'Use ONLY the data above — do not mention or invent any provider, plan, or resource that is not listed.';

    const contextBlock = [
      ...sections,
      '',
      instructions,
      showPlans && !showServices ? 'The user only asked about internet plans — do not mention digital equity resources or training programs.' : '',
      showServices && !showPlans ? 'The user only asked about digital equity/training/device resources — do not mention internet plans or pricing.' : '',
      isPivot ? "The user already gave the client's address earlier and is now asking about a different topic — don't ask them to repeat the address, just answer using the data above." : '',
      result.planGroups && showPlans ? 'The lowest-cost and fastest plan are already highlighted below your message — do not restate every plan in detail; the user will be offered the choice to see all plans or get a personalized recommendation next.' : '',
      'Keep your reply short — the card(s) below your message already show full details.',
    ].filter(Boolean).join('\n\n');

    setLastLookup(result);
    setResultMap(prev => new Map(prev).set(userMsgId, { ...result, intent }));

    if (showPlans && result.planGroups) {
      setPlanFlow({ step: 'top_shown', sourceMsgId: userMsgId, planGroups: result.planGroups, address: result.address });
    }
    if (showServices && result.serviceGroups) {
      setServiceFlow({ step: 'top_shown', sourceMsgId: userMsgId, serviceGroups: result.serviceGroups });
    }

    const showDisclaimer = showPlans && !!result.planGroups && !shownPlanDisclaimerRef.current;

    return { contextBlock, numPlans, numServices, lat: result.lat, lon: result.lon, showDisclaimer };
  }, []);

  const runRequest = useCallback(async (inputJob: RequestJob) => {
    if (abortRef.current) return;
    const job: RequestJob = { ...inputJob, outcome: inputJob.outcome ? { ...inputJob.outcome } : undefined };
    const controller = new AbortController();
    abortRef.current = controller;
    activeJob.current = job;
    const version = ++requestRevision.current;
    const current = () => requestRevision.current === version && sessionRef.current === job.sessionId;
    const timeout = setTimeout(() => controller.abort(new Error('Request timed out')), 90000);
    let stage: 'lookup' | 'response' = job.needsLookup && !job.result ? 'lookup' : 'response';
    setError(null);
    setRetryJob(null);
    setIsStreaming(true);
    setMessages(prev => prev.map(m => m.id === job.assistantMsgId ? { ...m, content: '', stopped: false, resultsReady: false } : m));
    setAnnouncement(stage === 'lookup' ? 'Looking up the address.' : 'Preparing a reply.');
    try {
      if (job.needsLookup && !job.result) {
        const response = await fetch('/api/lookup', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: job.text }), signal: controller.signal,
        });
        if (!response.ok) throw new Error('Lookup failed');
        const result = await response.json();
        if (!result || typeof result.found !== 'boolean' || typeof result.validated !== 'boolean' || !('planGroups' in result) || !('serviceGroups' in result)) throw new Error('Invalid lookup response');
        if (!current()) return;
        job.result = result;
      }
      if (!current()) return;
      if (job.needsLookup && job.result) {
        if (!job.result.validated) {
          setMessages(prev => prev.map(m => m.id === job.assistantMsgId ? { ...m, suppressResults: true, content: 'I could not verify that address. Please check the spelling and include the city and ZIP code. Your previous address, if any, has not changed.' } : m));
          setAnnouncement('Address could not be verified. Check the spelling, city and ZIP code.');
          return;
        }
        // Typed addresses retain verification; unchanged dropdown selections skip it.
        if (job.result.confirmAddress && !job.confirmed) {
          setMessages(prev => prev.map(m => m.id === job.assistantMsgId ? { ...m, content: `Did you mean **${job.result!.confirmAddress}**?` } : m));
          setPendingConfirm(job);
          setAnnouncement('Please confirm the matched address.');
          return;
        }
      }
      if (job.result && !job.outcome) {
        if (job.needsLookup) {
          setMessages(prev => prev.map(m => m.id === job.userMsgId || m.id === job.assistantMsgId ? m : { ...m, archived: true }));
          setResultMap(new Map());
          setPlanFlow(IDLE_PLAN_FLOW);
          setServiceFlow(IDLE_SERVICE_FLOW);
          setChangingAddress(false);
          setInputKey(k => k + 1);
          setHasDraft(false);
        }
        job.outcome = buildLookupOutcome(job.result, job.intent, job.userMsgId, !job.needsLookup);
      }
      stage = 'response';
      setAnnouncement('Preparing a reply.');
      const response = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: job.history, sessionId: job.sessionId, intent: job.intent, ...job.outcome }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) throw new Error('Reply unavailable');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let content = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (!current()) { await reader.cancel(); return; }
          content += done ? decoder.decode() : decoder.decode(value, { stream: true });
          setMessages(prev => prev.map(m => m.id === job.assistantMsgId ? { ...m, content } : m));
          if (done) break;
        }
      } finally { reader.releaseLock(); }
      if (!content.trim()) throw new Error('Empty reply');
      if (!current()) return;
      if (job.outcome?.showDisclaimer && !shownPlanDisclaimerRef.current) {
        shownPlanDisclaimerRef.current = true;
        appendAssistantText(PLAN_DISCLAIMER);
        job.outcome.showDisclaimer = false;
      }
      setMessages(prev => prev.map(m => m.id === job.assistantMsgId ? { ...m, resultsReady: true } : m));
      setAnnouncement('Reply complete.');
    } catch {
      if (!current()) return;
      const message = stage === 'lookup' ? 'The address lookup could not finish. Retry the lookup or enter a different address.' : 'The reply could not finish. Retry the reply; any address results already found will be reused.';
      setError(message);
      setRetryJob(job);
      setMessages(prev => prev.map(m => m.id === job.assistantMsgId ? { ...m, content: m.content || message, stopped: true } : m));
      setAnnouncement(message);
    } finally {
      clearTimeout(timeout);
      if (current()) {
        setIsStreaming(false);
        activeJob.current = null;
        abortRef.current = null;
        focusInput();
      }
    }
  }, [buildLookupOutcome, appendAssistantText, focusInput]);

  const sendMessage = useCallback((text: string, intentOverride?: Intent, opts?: SendOptions) => {
    if (abortRef.current || isStreaming) return;
    const intent = changingAddress ? activeIntent : intentOverride ?? classifyIntent(text) ?? activeIntent;
    const needsLookup = changingAddress || !!opts?.addressConfirmed || ADDRESS_RE.test(text);
    const userMsg: Message = { id: nanoid(), role: 'user', content: text, addressChange: changingAddress };
    const assistantMsgId = nanoid();
    // A new address starts a clean model context; the old transcript remains historical.
    const history = [...(needsLookup ? (workflow ? [{ role: 'user', content: workflow.prompt }] : []) : messages.filter(m => !m.archived && !m.superseded && !m.stopped && m.content)), userMsg].map(m => ({ role: m.role, content: m.content }));
    const job: RequestJob = { userMsgId: userMsg.id, assistantMsgId, text, intent, sessionId: sessionRef.current, history, needsLookup, confirmed: opts?.addressConfirmed, replacing: changingAddress, result: needsLookup ? undefined : lastLookup ?? undefined };
    if (!changingAddress) { setPlanFlow(IDLE_PLAN_FLOW); setServiceFlow(IDLE_SERVICE_FLOW); }
    setShowMainMenu(false);
    setPendingConfirm(null);
    setActiveIntent(intent);
    nearBottom.current = true;
    setMessages(prev => [...prev, userMsg, { id: assistantMsgId, role: 'assistant', content: '', addressChange: changingAddress }]);
    void runRequest(job);
  }, [isStreaming, activeIntent, changingAddress, messages, lastLookup, workflow, runRequest]);

  const selectWorkflow = useCallback((prompt: string, intent: PromptIntent) => {
    setWorkflow({ prompt, intent });
    sendMessage(prompt, intent);
  }, [sendMessage]);
  const handleAddressConfirm = useCallback((value: 'yes' | 'no') => {
    if (!pendingConfirm) return;
    const job = pendingConfirm;
    setPendingConfirm(null);
    if (value === 'no') {
      setMessages(prev => prev.map(m => m.id === job.assistantMsgId ? { ...m, content: 'Please retype the address, including the city and ZIP code.' } : m));
      setAnnouncement('Address not changed. Please enter another address.');
      focusInput();
    } else { void runRequest({ ...job, confirmed: true }); }
  }, [pendingConfirm, runRequest, focusInput]);
  const stopRequest = useCallback(() => {
    const job = activeJob.current;
    invalidateRequest();
    if (job) {
      setMessages(prev => prev.map(m => m.id === job.assistantMsgId ? { ...m, content: m.content || 'Request stopped.', stopped: true } : m));
      setRetryJob(job);
    }
    setError(null);
    setAnnouncement('Request stopped. You can retry or continue with a new message.');
    focusInput();
  }, [invalidateRequest, focusInput]);
  const startAddressChange = useCallback(() => {
    invalidateRequest();
    setPendingConfirm(null);
    setError(null);
    setRetryJob(null);
    setChangingAddress(true);
    setMessages(prev => prev.map(m => ({ ...m, addressChange: false })));
    setAnnouncement('Enter a replacement address. The current address stays active until the replacement is verified.');
  }, [invalidateRequest]);
  const cancelAddressChange = useCallback(() => {
    invalidateRequest();
    setMessages(prev => prev.filter(m => !m.addressChange));
    setChangingAddress(false);
    setPendingConfirm(null);
    setError(null);
    setRetryJob(null);
    setHasDraft(false);
    setAnnouncement('Address change canceled. Previous address and answers retained.');
    focusInput();
  }, [invalidateRequest, focusInput]);

  const recordAnswer = useCallback((answerKey: NonNullable<Message['answerKey']>, content: string, role: Message['role'] = 'user') => {
    setRetryJob(null);
    setError(null);
    nearBottom.current = true;
    setMessages(prev => [...prev.map(m => !m.archived && m.answerKey === answerKey && m.role === role ? { ...m, superseded: true } : m), { id: nanoid(), role, content, answerKey }]);
    setAnnouncement(content);
  }, []);
  const invalidateAnswers = useCallback((keys: Array<NonNullable<Message['answerKey']>>) => {
    setMessages(prev => prev.map(m => !m.archived && m.answerKey && keys.includes(m.answerKey) ? { ...m, superseded: true } : m));
  }, []);
  const handleGuidedBack = useCallback(() => {
    nearBottom.current = true;
    const step = planFlow.step;
    if (step === 'awaiting_usage') {
      invalidateAnswers(['devices', 'usage', 'recommendation']);
      setPlanFlow(f => ({ ...f, step: 'awaiting_devices', deviceCount: undefined, usageProfile: undefined, recommendedPlan: undefined }));
      appendAssistantText('About how many devices are usually connected at once?');
    } else if (step === 'awaiting_devices') {
      invalidateAnswers(['household', 'devices', 'usage', 'recommendation']);
      setPlanFlow(f => ({ ...f, step: 'awaiting_household', householdSize: undefined, deviceCount: undefined, usageProfile: undefined, recommendedPlan: undefined }));
      appendAssistantText('How many people live in the client’s household?');
    } else {
      setPlanFlow(f => ({ ...f, step: 'top_shown' }));
      appendAssistantText('Show all plans or get a recommendation for this client.');
    }
  }, [planFlow.step, appendAssistantText, invalidateAnswers]);
  const closingLine = "Let me know if you need anything else for this case.";

  const handleBackToMenu = useCallback(() => requestReset('home'), [requestReset]);

  const handleSeeAllPlans = useCallback(() => {
    appendAssistantText(`Here are all the internet plans available at the client's address. ${closingLine}`);
    setPlanFlow(f => ({ ...f, step: 'all_shown' }));
  }, [appendAssistantText]);

  const handleGetRecommendation = useCallback(() => {
    invalidateAnswers(['household', 'devices', 'usage', 'recommendation']);
    appendAssistantText('How many people live in the client\'s household?');
    setPlanFlow(f => ({ ...f, step: 'awaiting_household', householdSize: undefined, deviceCount: undefined, usageProfile: undefined, recommendedPlan: undefined, recommendationNote: undefined }));
    nearBottom.current = true;
    setAnnouncement('Edit household size. Earlier answers and recommendations are superseded.');
  }, [appendAssistantText, invalidateAnswers]);

  const handleHouseholdSize = useCallback((size: HouseholdSize) => {
    recordAnswer('household', `Household: ${HOUSEHOLD_SIZE_OPTIONS.find(o => o.value === size)?.label}`);
    appendAssistantText("About how many devices are usually connected at once — phones, laptops, smart TVs, consoles, and so on?");
    setPlanFlow(f => ({ ...f, step: 'awaiting_devices', householdSize: size }));
    logSelection(sessionRef.current, { householdSize: size });
  }, [appendAssistantText, recordAnswer]);

  const handleDeviceCount = useCallback((count: DeviceCount) => {
    recordAnswer('devices', `Connected devices: ${DEVICE_COUNT_OPTIONS.find(o => o.value === count)?.label}`);
    appendAssistantText("Which best describes how the household uses the internet?");
    setPlanFlow(f => ({ ...f, step: 'awaiting_usage', deviceCount: count }));
    logSelection(sessionRef.current, { deviceCount: count });
  }, [appendAssistantText, recordAnswer]);

  const handleUsage = useCallback((usage: UsageProfile) => {
    if (!planFlow.planGroups || !planFlow.householdSize || !planFlow.deviceCount) return;
    const { plan, metRecommendedSpeed } = recommendPlan(flattenPlans(planFlow.planGroups), planFlow.householdSize, usage, planFlow.deviceCount);
    const intro = plan
      ? metRecommendedSpeed
        ? "Based on household size, device count, and internet use, here's the recommended plan."
        : "None of the available plans fully meet the ideal speed for this household, but here's the fastest option available."
      : "No matching plan was found for this address.";
    recordAnswer('usage', `Internet use: ${USAGE_PROFILE_OPTIONS.find(o => o.value === usage)?.label}`);
    recordAnswer('recommendation', `${intro} ${closingLine}`, 'assistant');
    setPlanFlow(f => ({
      ...f,
      usageProfile: usage,
      step: 'recommended_shown',
      recommendedPlan: plan,
      recommendationNote: metRecommendedSpeed ? undefined : 'This plan doesn’t fully meet the ideal speed for this household, but it’s the fastest one available at this address.',
    }));
    logSelection(sessionRef.current, { usageProfile: usage });
  }, [planFlow, recordAnswer]);

  const handleSeeAllResources = useCallback(() => {
    appendAssistantText(`Here are all the digital equity resources near this address. ${closingLine}`);
    setServiceFlow(f => ({ ...f, step: 'all_shown' }));
  }, [appendAssistantText]);

  const handleFilterByType = useCallback(() => {
    invalidateAnswers(['service']);
    appendAssistantText('Which type of resource is needed?');
    setServiceFlow(f => ({ ...f, step: 'awaiting_type', selectedType: undefined }));
    nearBottom.current = true;
    setAnnouncement('Choose a resource type.');
  }, [appendAssistantText, invalidateAnswers]);

  const handleServiceType = useCallback((type: string) => {
    recordAnswer('service', `Resource type: ${type}`);
    recordAnswer('service', `Here are the ${type.toLowerCase()} resources near this address. ${closingLine}`, 'assistant');
    setServiceFlow(f => ({ ...f, step: 'filtered_shown', selectedType: type }));
    logSelection(sessionRef.current, { serviceType: type });
  }, [recordAnswer]);

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-blue-700 px-4 py-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          {messages.length > 0 && !showMainMenu && (
            <nav aria-label="Client navigation" className="flex shrink-0 items-center text-primary-foreground">
              <button type="button" className="flex size-11 items-center justify-center rounded-lg hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2" aria-label="Home" title="Home" onClick={() => requestReset('home')}><House aria-hidden="true" className="size-6" strokeWidth={2.5} /></button>
              <button type="button" className="flex size-11 items-center justify-center rounded-lg hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2" aria-label="New client" title="New client" onClick={() => requestReset('new')}><MessageSquarePlus aria-hidden="true" className="size-6" strokeWidth={2.5} /></button>
            </nav>
          )}
          <div className="max-w-2xl mx-auto min-w-0 flex-1">
            <h1 className="text-base font-bold text-white">Clark County Digital Equity Assistant</h1>
            <p className="text-sm text-blue-100">
              {messages.length > 0 && !showMainMenu && workflow
                ? workflow.intent === 'plans'
                  ? 'Find internet plans in Clark County'
                  : workflow.prompt.includes('devices')
                    ? 'Find free or low-cost devices in Clark County'
                    : 'Find digital skills training in Clark County'
                : 'Look up internet plans & digital resources for a client in Clark County, NV'}
            </p>
          </div>
        </div>
      </header>

      <ResetConfirmation action={resetAction} dontShowAgain={dontShowResetAgain} onDontShowAgainChange={setDontShowResetAgain} onCancel={() => setResetAction(null)} onConfirm={() => {
        if (!resetAction) return;
        if (dontShowResetAgain) {
          setSkipResetConfirmation(true);
          document.cookie = `cc-skip-reset-confirmation=1; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
        }
        resetConfirmed.current = true;
        resetClient(resetAction);
      }} onClosed={() => { if (resetConfirmed.current) focusInput(); else resetFocus.current?.focus(); }} />
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>
      {lastLookup?.validated && (
        <div className="border-b border-border bg-background text-foreground px-4 py-2">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
            <p className="text-sm"><strong>Current address:</strong> {lastLookup.address ?? lastLookup.confirmAddress}</p>
            <Button variant="outline" disabled={changingAddress || isStreaming || !!pendingConfirm} onClick={startAddressChange}>Change</Button>
          </div>
        </div>
      )}
      {/* Messages */}
      <div className="relative flex flex-1 min-h-0 flex-col">
      <div ref={viewportRef} role="region" aria-label="Conversation" onScroll={() => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        nearBottom.current = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 80;
        setShowJump(!nearBottom.current);
      }} className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          {messages.length === 0 && (
            <PromptSuggestions onSelect={selectWorkflow} />
          )}

          {messages.map((m, i) => {
            const isUser = m.role === 'user';
            const isLastMsg = i === messages.length - 1;
            const resultKey = isUser ? m.id : (messages[i - 1]?.id ?? '');
            const result = resultMap.get(resultKey);

            return (
              <div key={m.id} data-archived={m.archived || undefined} inert={changingAddress && !m.addressChange} ref={isLastMsg ? guidanceRef : undefined} tabIndex={isLastMsg ? -1 : undefined} className="outline-none">
                {m.archived && !messages[i - 1]?.archived && <p className="sr-only">Earlier address context — historical only</p>}
                {!m.archived && messages[i - 1]?.archived && <p className="sr-only">Current address conversation</p>}
                {m.superseded && <p className="sr-only">Superseded — not used for the current recommendation</p>}
                <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-base leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-br-sm shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
                  }`}>
                    {m.content
                      ? (isUser ? m.content : <MarkdownContent text={m.content} />)
                      : (isStreaming && isLastMsg && !isUser
                        ? <span aria-hidden="true" className="inline-flex gap-1 text-chat-secondary-foreground">
                            <span className="animate-bounce motion-reduce:animate-none" style={{ animationDelay: '0ms' }}>•</span>
                            <span className="animate-bounce motion-reduce:animate-none" style={{ animationDelay: '150ms' }}>•</span>
                            <span className="animate-bounce motion-reduce:animate-none" style={{ animationDelay: '300ms' }}>•</span>
                          </span>
                        : null
                      )
                    }
                  </div>
                </div>

                {m.stopped && <p className="text-sm text-chat-secondary-foreground mt-1">Incomplete — request stopped or interrupted</p>}
                {!isUser && !m.archived && m.resultsReady && result && (
                  <div className="mt-1">
                    {result.planGroups && result.intent !== 'services' && (
                      <PlanCard planGroups={result.planGroups} address={result.address} mode="top" />
                    )}
                    {result.serviceGroups && result.intent !== 'plans' && (
                      <ServiceCard services={getTopServices(result.serviceGroups)} />
                    )}
                  </div>
                )}

                {/* Address confirmation gate — the lookup already ran, but its plans/
                    resources stay hidden until the user confirms this is the right
                    address, so a bad geocode match never gets acted on silently. */}
                {!isUser && !isStreaming && pendingConfirm && pendingConfirm.assistantMsgId === m.id && (
                  <div className="mt-1">
                    <ChoiceButtons
                      options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]}
                      onSelect={handleAddressConfirm}
                    />
                  </div>
                )}

                {/* Follow-ups that don't repeat the address or name a topic (e.g. "what's
                    the cheapest option?") skip the lookup above entirely, since there's
                    nothing new to fetch — but the cards should still be there for the user
                    to reference. Only applies once the guided flow has released the bottom
                    slot (it renders its own cards below), and only to the reply actually
                    being read, not to every past message that lacked its own lookup. */}
                {!isUser && !m.archived && !m.stopped && !m.suppressResults && !changingAddress && !retryJob && !result && isLastMsg && !isStreaming && !pendingConfirm && lastLookup && planFlow.step === 'idle' && serviceFlow.step === 'idle' && !showMainMenu && (
                  <div className="mt-1">
                    {lastLookup.planGroups && activeIntent !== 'services' && (
                      <PlanCard planGroups={lastLookup.planGroups} address={lastLookup.address} mode="top" />
                    )}
                    {lastLookup.serviceGroups && activeIntent !== 'plans' && (
                      <ServiceCard services={getTopServices(lastLookup.serviceGroups)} />
                    )}
                  </div>
                )}

                {/* The guided flow's cards/controls always attach to the message the
                    user is currently reading (the bottom of the chat), not to the
                    original lookup reply — that message may be long scrolled past. */}
                {!isUser && !m.stopped && !changingAddress && !pendingConfirm && isLastMsg && !isStreaming && planFlow.step !== 'idle' && (
                  <div className="mt-1">
                    {planFlow.step.startsWith('awaiting_') && <Button variant="outline" onClick={handleGuidedBack}>Back</Button>}
                    {planFlow.step === 'recommended_shown' && (
                      <div className="flex flex-col gap-2 text-foreground py-2">
                        <p className="text-sm"><strong>Current answers:</strong> {HOUSEHOLD_SIZE_OPTIONS.find(o => o.value === planFlow.householdSize)?.label}; {DEVICE_COUNT_OPTIONS.find(o => o.value === planFlow.deviceCount)?.label}; {USAGE_PROFILE_OPTIONS.find(o => o.value === planFlow.usageProfile)?.label}.</p>
                        <div><Button variant="outline" onClick={handleGetRecommendation}>Edit answers</Button></div>
                      </div>
                    )}
                    {planFlow.step === 'all_shown' && planFlow.planGroups && (
                      <>
                        <PlansTable plans={flattenPlans(planFlow.planGroups)} address={planFlow.address} />
                        <ChoiceButtons
                          options={[{ value: 'menu', label: 'Back to main menu' }]}
                          onSelect={handleBackToMenu}
                        />
                      </>
                    )}
                    {planFlow.step === 'recommended_shown' && planFlow.recommendedPlan && (
                      <>
                        <RecommendedPlanCard plan={planFlow.recommendedPlan} address={planFlow.address} note={planFlow.recommendationNote} />
                        <ChoiceButtons
                          options={[
                            { value: 'all', label: 'Show all plans' },
                            { value: 'menu', label: 'Back to main menu' },
                          ]}
                          onSelect={(v: 'all' | 'menu') => (v === 'all' ? handleSeeAllPlans() : handleBackToMenu())}
                        />
                      </>
                    )}
                    {planFlow.step === 'top_shown' && (
                      <ChoiceButtons
                        options={[
                          { value: 'all', label: 'Show all plans' },
                          { value: 'recommend', label: 'Get a recommendation for this client' },
                        ]}
                        onSelect={(v: 'all' | 'recommend') => (v === 'all' ? handleSeeAllPlans() : handleGetRecommendation())}
                      />
                    )}
                    {planFlow.step === 'awaiting_household' && (
                      <ChoiceButtons options={HOUSEHOLD_SIZE_OPTIONS} onSelect={handleHouseholdSize} />
                    )}
                    {planFlow.step === 'awaiting_devices' && (
                      <ChoiceButtons options={DEVICE_COUNT_OPTIONS} onSelect={handleDeviceCount} />
                    )}
                    {planFlow.step === 'awaiting_usage' && (
                      <ChoiceButtons options={USAGE_PROFILE_OPTIONS} onSelect={handleUsage} />
                    )}
                  </div>
                )}

                {!isUser && !m.stopped && !changingAddress && !pendingConfirm && isLastMsg && !isStreaming && serviceFlow.step !== 'idle' && (
                  <div className="mt-1">
                    {serviceFlow.step === 'awaiting_type' && <Button variant="outline" onClick={() => { setServiceFlow(f => ({ ...f, step: 'top_shown' })); appendAssistantText('Show all resources or choose a resource type.'); }}>Back</Button>}
                    {serviceFlow.step === 'filtered_shown' && (
                      <div className="flex items-center justify-between gap-2 text-foreground py-2">
                        <p className="text-sm"><strong>Current resource type:</strong> {serviceFlow.selectedType}</p>
                        <Button variant="outline" onClick={handleFilterByType}>Edit answers</Button>
                      </div>
                    )}
                    {serviceFlow.step === 'top_shown' && (
                      <ChoiceButtons
                        options={[
                          { value: 'all', label: 'Show all resources' },
                          { value: 'filter', label: 'Filter by type' },
                        ]}
                        onSelect={(v: 'all' | 'filter') => (v === 'all' ? handleSeeAllResources() : handleFilterByType())}
                      />
                    )}
                    {serviceFlow.step === 'awaiting_type' && (
                      <ChoiceButtons options={SERVICE_TYPES.map(t => ({ value: t, label: t }))} onSelect={handleServiceType} />
                    )}
                    {serviceFlow.step === 'all_shown' && serviceFlow.serviceGroups && (
                      <>
                        <ServicesTable serviceGroups={serviceFlow.serviceGroups} />
                        <ChoiceButtons
                          options={[{ value: 'menu', label: 'Back to main menu' }]}
                          onSelect={handleBackToMenu}
                        />
                      </>
                    )}
                    {serviceFlow.step === 'filtered_shown' && serviceFlow.serviceGroups && (
                      <>
                        <ServicesTable serviceGroups={serviceFlow.serviceGroups} initialTypeFilter={serviceFlow.selectedType} />
                        <ChoiceButtons
                          options={[
                            { value: 'all', label: 'Show all resources' },
                            { value: 'menu', label: 'Back to main menu' },
                          ]}
                          onSelect={(v: 'all' | 'menu') => (v === 'all' ? handleSeeAllResources() : handleBackToMenu())}
                        />
                      </>
                    )}
                  </div>
                )}

                {!isUser && isLastMsg && !isStreaming && showMainMenu && (
                  <div className="mt-1">
                    <PromptSuggestions onSelect={selectWorkflow} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

        {showJump && <div className="absolute right-[max(1.5rem,calc((100%_-_42rem)/2_-_4rem))] bottom-4"><Button variant="outline" size="icon" className="size-12 rounded-full shadow-sm [&_svg]:size-6" aria-label="Jump to latest" title="Jump to latest" onClick={jumpToLatest}><ArrowDown aria-hidden="true" className="animate-pulse motion-reduce:animate-none" /></Button></div>}
      </div>

      {/* Input */}
      <div className="bg-white border-t border-slate-200 px-4 py-3 shrink-0">
        <div className="max-w-2xl mx-auto">
          <div ref={composerRef} className="flex flex-col gap-3">
            {(error || (retryJob && !isStreaming)) && (
              <div aria-label="Request recovery" className="flex items-center gap-2">
                {error && <p className="text-sm text-foreground leading-relaxed">{error}</p>}
                {retryJob && !isStreaming && <Button variant="outline" size="icon" aria-label="Retry" title="Retry" onClick={() => { nearBottom.current = true; void runRequest(retryJob); }}><RotateCcw aria-hidden="true" /></Button>}
              </div>
            )}
            <div hidden={changingAddress}>
              <ChatInput key={inputKey} onSend={(text, o) => sendMessage(text, undefined, o)} onDraftChange={setHasDraft} onStop={isStreaming ? stopRequest : undefined} disabled={isStreaming || !!pendingConfirm || changingAddress} />
            </div>
            {changingAddress && <ChatInput autoFocus onSend={(text, o) => sendMessage(text, undefined, o)} onDraftChange={setHasDraft} onStop={isStreaming ? stopRequest : undefined} onCancel={cancelAddressChange} disabled={isStreaming || !!pendingConfirm} placeholder="Enter the replacement address, or type @ to search…" />}
          </div>
          <p className="text-xs text-chat-secondary-foreground text-center mt-2">
            For emergencies, call 911. For mental health crisis, call or text 988. For social services, call 211.
          </p>
        </div>
      </div>
    </div>
  );
}
