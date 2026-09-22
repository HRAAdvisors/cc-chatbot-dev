'use client';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useLanguage } from './LanguageProvider';
import { Send, MapPin, Loader2, Square, X } from 'lucide-react';

interface AddressContext {
  address?: { name?: string };
  place?: { name?: string };
  region?: { name?: string; region_code?: string };
  postcode?: { name?: string };
  district?: { name?: string };
  country?: { country_code?: string };
}
interface Suggestion { mapboxId: string; label: string; value: string; context?: AddressContext }
interface MapboxSuggestion { mapbox_id: string; full_address?: string; name?: string; address?: string; place_formatted?: string; context?: AddressContext }

// The address parser expects a two-letter state and no country suffix.
function buildInsertValue(context: AddressContext | undefined, fallbackStreet: string): string {
  const street = context?.address?.name || fallbackStreet;
  const cityState = [context?.place?.name, [context?.region?.region_code, context?.postcode?.name].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return [street, cityState].filter(Boolean).join(', ');
}
function outsideArea(context?: AddressContext): boolean {
  if (context?.country?.country_code && context.country.country_code.toLowerCase() !== 'us') return true;
  if (context?.region?.region_code && context.region.region_code.toUpperCase() !== 'NV') return true;
  // The search bounds are a ranking/filter aid, not an exact county boundary.
  const county = context?.district?.name;
  return !!county && /county/i.test(county) && !/^clark county$/i.test(county.trim());
}
export interface SendOptions { addressConfirmed?: boolean }
interface ChatInputProps {
  onSend: (text: string, opts?: SendOptions) => void;
  disabled?: boolean;
  onDraftChange?: (hasDraft: boolean) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onStop?: () => void;
  onCancel?: () => void;
}
type SearchState = 'idle' | 'short' | 'loading' | 'success' | 'empty' | 'unavailable' | 'outside';
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_API_KEY;
const MIN_QUERY = 3;
const DEBOUNCE_MS = 150;
// Bias suggestions toward the Clark County area; these bounds are not proof of county membership.
const CLARK_PROXIMITY = '-115.1398,36.1699';
const CLARK_BBOX = '-115.9,35.0,-114.0,36.85';

export default function ChatInput({ onSend, disabled, onDraftChange, placeholder = 'Type @ to search an address, or ask a question…', autoFocus, onStop, onCancel }: ChatInputProps) {
  const { t } = useLanguage();
  const [value, setValue] = useState('');
  const valueRef = useRef('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<SearchState>('idle');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revision = useRef(0);
  const selectedText = useRef<string | null>(null);
  const sessionRef = useRef('');
  const listId = useId();

  const invalidate = useCallback(() => {
    revision.current += 1;
    abortRef.current?.abort();
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);
  const updateValue = (text: string) => {
    valueRef.current = text;
    setValue(text);
    onDraftChange?.(!!text.trim());
  };
  const dismiss = useCallback(() => { invalidate(); setOpen(false); }, [invalidate]);
  useEffect(() => () => invalidate(), [invalidate]);
  if (disabled && open) setOpen(false);
  useEffect(() => { if (disabled) invalidate(); }, [disabled, invalidate]);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) dismiss();
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [dismiss]);

  const change = (text: string) => {
    invalidate();
    selectedText.current = null;
    updateValue(text);
    setSuggestions([]);
    setActiveIndex(0);
    const at = text.lastIndexOf('@');
    if (at < 0) { setOpen(false); setState('idle'); return; }
    setOpen(true);
    const query = text.slice(at + 1).trim();
    if (query.length < MIN_QUERY) { setState('short'); return; }
    setState('loading');
    const version = revision.current;
    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        if (!MAPBOX_TOKEN) throw new Error('Search unavailable');
        if (!sessionRef.current) sessionRef.current = crypto.randomUUID();
        const url = new URL('https://api.mapbox.com/search/searchbox/v1/suggest');
        Object.entries({ q: query, access_token: MAPBOX_TOKEN, session_token: sessionRef.current, country: 'us', types: 'address', language: 'en', limit: '6', proximity: CLARK_PROXIMITY, bbox: CLARK_BBOX }).forEach(([k, v]) => url.searchParams.set(k, v));
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error('Search unavailable');
        const data = await response.json();
        if (!Array.isArray(data.suggestions)) throw new Error('Invalid search response');
        if (revision.current !== version) return;
        const all: MapboxSuggestion[] = data.suggestions;
        const items = all.filter(s => !outsideArea(s.context)).map(s => ({ mapboxId: s.mapbox_id, label: s.full_address || [s.name, s.place_formatted].filter(Boolean).join(', '), value: buildInsertValue(s.context, s.address || s.name || ''), context: s.context }));
        setSuggestions(items);
        setState(items.length ? 'success' : all.length ? 'outside' : 'empty');
      } catch {
        if (revision.current === version && !controller.signal.aborted) setState('unavailable');
      }
    }, DEBOUNCE_MS);
  };

  const selectSuggestion = async (suggestion: Suggestion) => {
    invalidate();
    const version = revision.current;
    const at = valueRef.current.lastIndexOf('@');
    const base = at < 0 ? '' : valueRef.current.slice(0, at);
    const optimistic = `${base}${suggestion.value} `;
    selectedText.current = optimistic.trim();
    updateValue(optimistic);
    setOpen(false);
    setSuggestions([]);
    inputRef.current?.focus();
    const controller = new AbortController();
    abortRef.current = controller;
    const session = sessionRef.current || crypto.randomUUID();
    sessionRef.current = crypto.randomUUID();
    try {
      const url = new URL(`https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(suggestion.mapboxId)}`);
      url.searchParams.set('access_token', MAPBOX_TOKEN ?? '');
      url.searchParams.set('session_token', session);
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error('Retrieve unavailable');
      const data = await response.json();
      if (revision.current !== version || valueRef.current !== optimistic) return;
      const props = data?.features?.[0]?.properties;
      if (outsideArea(props?.context)) {
        selectedText.current = null;
        setState('outside');
        setOpen(true);
        return;
      }
      if (props?.context) {
        const canonical = `${base}${buildInsertValue(props.context, props.name ?? suggestion.value)} `;
        selectedText.current = canonical.trim();
        updateValue(canonical);
      }
    } catch {
      // Keep the selected suggestion on retrieve failure; stale responses never overwrite edits.
    }
  };

  const submit = () => {
    const text = valueRef.current.trim();
    if (!text || disabled) return;
    const addressConfirmed = selectedText.current === text;
    invalidate();
    selectedText.current = null;
    updateValue('');
    setOpen(false);
    setState('idle');
    setSuggestions([]);
    onSend(text.replace(/@(?=\S)/g, ''), { addressConfirmed });
  };
  const feedback = state === 'success'
    ? t('{count} address suggestions available. Use the arrow keys to select.', { count: suggestions.length })
    : t(state === 'short' ? 'Keep typing the address to see matches…'
      : state === 'loading' ? 'Searching addresses…'
      : state === 'unavailable' ? 'Address search is temporarily unavailable.'
      : state === 'outside' ? 'This address is outside Clark County, Nevada.'
      : state === 'empty' ? 'No matching address found. Check the spelling.' : '');

  return (
    <div ref={wrapperRef} className="relative">
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{open ? feedback : ''}</div>
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-border bg-background text-foreground shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted text-muted-foreground">
            <MapPin size={16} /><span className="text-sm font-medium">{t('Clark County addresses')}</span>
            {state === 'loading' && <Loader2 size={16} className="animate-spin motion-reduce:animate-none" />}
          </div>
          <ul id={listId} role="listbox" aria-label={t('Address suggestions')} className="max-h-64 overflow-y-auto">
            {suggestions.map((s, i) => (
              <li key={s.mapboxId} id={`${listId}-${i}`} role="option" aria-selected={i === activeIndex}
                onMouseDown={e => e.preventDefault()} onClick={() => selectSuggestion(s)} onMouseEnter={() => setActiveIndex(i)}
                className={`flex items-start gap-3 px-3 py-2.5 text-sm cursor-pointer ${i === activeIndex ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-muted'}`}>
                <MapPin size={16} className="shrink-0" /><span className="leading-snug">{s.label}</span>
              </li>
            ))}
          </ul>
          {!suggestions.length && <p className="px-3 py-3 text-sm text-chat-secondary-foreground">{feedback}</p>}
        </div>
      )}
      <form onSubmit={e => { e.preventDefault(); submit(); }} className="flex items-center gap-2">
        <input ref={inputRef} autoFocus={autoFocus} value={value} onChange={e => change(e.target.value)}
          onKeyDown={e => {
            if (e.nativeEvent.isComposing || e.keyCode === 229) { if (e.key === 'Enter') e.preventDefault(); return; }
            if (open && suggestions.length) {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => (i + 1) % suggestions.length); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => (i - 1 + suggestions.length) % suggestions.length); }
              if (e.key === 'Enter') { e.preventDefault(); selectSuggestion(suggestions[activeIndex]); }
            }
            if (e.key === 'Escape' && open) { e.preventDefault(); dismiss(); }
          }}
          placeholder={t(placeholder)} disabled={disabled} role="combobox" aria-label={t(placeholder)} aria-expanded={open}
          aria-controls={open ? listId : undefined} aria-activedescendant={open && suggestions.length ? `${listId}-${activeIndex}` : undefined} aria-autocomplete="list"
          className="min-w-0 flex-1 rounded-xl border border-input bg-card px-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50" />
        {onCancel && <button type="button" aria-label={t('Cancel address change')} title={t('Cancel address change')} onClick={onCancel} className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring transition-colors"><X aria-hidden="true" size={20} /></button>}
        <button type={onStop ? 'button' : 'submit'} aria-label={t(onStop ? 'Stop' : 'Send message')} title={t(onStop ? 'Stop' : 'Send message')} onClick={onStop} disabled={!onStop && (disabled || !value.trim())} className="size-11 shrink-0 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-40 flex items-center justify-center transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          {onStop ? <Square aria-hidden="true" size={18} className="fill-current" /> : <Send aria-hidden="true" size={18} />}
        </button>
      </form>
    </div>
  );
}
