"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MapPin, PanelLeftClose, RotateCcw, Share2, Wifi } from "lucide-react";
import ResourceCategories from "./ResourceCategories";
import ResourceHome from "./ResourceHome";
import ResourceConversation, { AssistantLabel } from "./ResourceConversation";
import { useResourceChat, type ResourceMessage } from "./useResourceChat";
import { SharePanel } from "./SharePanel";
import ShareActions from "./ShareActions";
import ResidentNeeds from "./ResidentNeeds";
import ResultsTable from "./ResultsTable";
import PrintDialog from "./PrintDialog";
import WorkspacePanel, { type PanelView } from "./WorkspacePanel";
import HowToUse from "./HowToUse";
import ResourceMapLink from "./ResourceMapLink";
import WorkspaceMenu from "./WorkspaceMenu";
import { useResourceMapSession, type ResourceSearch } from "./useResourceMapSession";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ChatInput, { type SendOptions } from "@/components/chat/ChatInput";
import SessionTimeout from "@/components/chat/SessionTimeout";
import ResetConfirmation from "@/components/chat/ResetConfirmation";
import { LanguageLink, useLanguage } from "@/components/chat/LanguageProvider";
import { CATEGORIES, CATEGORY_LABELS, addressClusters, areaOf, isAddressQuery, defaultShortlist, recommendationsText, resourcesFromLookup, type LookupResponse, type Resource, type ResourceCategory } from "@/lib/resource-finder";
import { EMPTY_NEEDS, hasNeeds, inferResourceFocus, sanitizeNeeds, splitResourceRequest, type ResidentNeeds as Needs, type ResourceFocus } from "@/lib/resident-needs";
import { printHtml, qrPayload, residentListDocument, shortenAnswer, type PrintedExchange } from "@/lib/resource-print";
import ResourceSection from "./ResourceSection";
import ReportIssue from "./ReportIssue";

type View = "chat" | "table";
interface SearchGroup { search: ResourceSearch; resources: Resource[] }

function mentionedIn(text: string, resources: Resource[]) {
  const lower = text.toLowerCase();
  return resources.filter((resource) => {
    const names = [resource.name, resource.plan?.planName, resource.plan ? `${resource.plan.provider} ${resource.plan.planName}` : ""].filter((name): name is string => !!name && name.trim().length > 3);
    return names.some((name) => lower.includes(name.toLowerCase()));
  });
}

const sourceId = (id: string) => id.slice(id.indexOf("::") + 2);

function groupFor(index: number, messages: ResourceMessage[], groups: SearchGroup[]) {
  let match: SearchGroup | undefined;
  for (const group of groups) {
    const anchorIndex = group.search.anchor ? messages.findIndex((message) => message.id === group.search.anchor) : -1;
    if (anchorIndex < index) match = group;
  }
  return match ?? groups.at(-1);
}

export default function ResourceFinder() {
  const { t, locale } = useLanguage();
  const { data: savedSession, mutate: saveMapSession } = useResourceMapSession();
  const [searches, setSearches] = useState<ResourceSearch[]>(() => savedSession?.searches ?? (savedSession?.result ? [{ id: "s0", address: savedSession.address, result: savedSession.result, anchor: savedSession.resultAnchor ?? null }] : []));
  const latest = searches.at(-1);
  const result = latest?.result ?? null;
  const address = latest?.address ?? "";
  const [view, setView] = useState<View>(savedSession?.view ?? "chat");
  const [tableOrigin, setTableOrigin] = useState<"chat" | "needs">(savedSession?.tableOrigin ?? "chat");
  const [listOpen, setListOpen] = useState(true);
  const [focus, setFocus] = useState<ResourceFocus>(savedSession?.focus ?? "all");
  const [needs, setNeeds] = useState<Needs>(savedSession?.needs ?? EMPTY_NEEDS);
  const [needsDraft, setNeedsDraft] = useState<Needs>(savedSession?.needsDraft ?? EMPTY_NEEDS);
  const chat = useResourceChat(result, focus, needs, savedSession?.messages);
  const clearChat = chat.clear;
  const [panel, setPanel] = useState<PanelView | null>(null);
  const [tourRequested, setTourRequested] = useState(false);
  const panelOpener = useRef<HTMLElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const [pending, setPending] = useState<LookupResponse | null>(null);
  const [needsAddress, setNeedsAddress] = useState(savedSession?.address ?? "");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(savedSession?.allSelected ?? []));
  const [optOut, setOptOut] = useState<Set<string>>(new Set(savedSession?.optOut ?? []));
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set(savedSession?.hiddenCategories ?? []));
  const [dismissed, setDismissed] = useState<Set<string>>(new Set(savedSession?.dismissed ?? []));
  const [report, setReport] = useState<Resource | "general" | null>(null);
  const [printing, setPrinting] = useState(false);
  const [session, setSession] = useState(0);
  const [resetOpen, setResetOpen] = useState(false);
  const [skipResetPrompt, setSkipResetPrompt] = useState(false);
  const generation = useRef(0);
  const [downloading, setDownloading] = useState(false);
  const [status, setStatus] = useState("");
  const [draft, setDraft] = useState({ text: "", revision: 0 });
  const request = useRef<AbortController | null>(null);
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const downloadLock = useRef(false);
  const lookupIntent = useRef({ question: "", scope: "all" as ResourceFocus, original: "", toTable: false });
  const [lastQuestion, setLastQuestion] = useState(savedSession?.lastQuestion ?? "");
  const [resultAnchor, setResultAnchor] = useState<string | null>(latest?.anchor ?? null);
  const pendingAnchor = useRef<string | null>(null);

  const groups = useMemo<SearchGroup[]>(() => searches.map((search) => ({
    search,
    resources: resourcesFromLookup(search.result).map((resource) => ({ ...resource, id: `${search.id}::${resource.id}`, searchId: search.id, searchAddress: search.address })),
  })), [searches]);
  const resources = useMemo(() => groups.flatMap((group) => group.resources), [groups]);
  const latestResources = groups.at(-1)?.resources ?? [];
  const autoSelected = useMemo(() => new Set(chat.messages.flatMap((message, index) => {
    if (message.role !== "assistant" || !message.content || message.incomplete) return [];
    const group = groupFor(index, chat.messages, groups);
    return group ? mentionedIn(message.content, group.resources).map((resource) => resource.id) : [];
  })), [chat.messages, groups]);
  const effectiveSelected = useMemo(() => new Set([...selected, ...[...autoSelected].filter((id) => !optOut.has(id))]), [selected, autoSelected, optOut]);
  const shortlist = resources.filter((resource) => effectiveSelected.has(resource.id) && !hiddenKeys.has(`${resource.searchId}:${resource.category}`) && !dismissed.has(resource.id));
  const hasSession = !!result || chat.messages.length > 0;
  const home = !hasSession;
  const tableView = !home && view === "table" && !!result;
  const editableTable = tableOrigin === "needs";
  const scopeLabel = focus === "all" ? "All resources" : CATEGORY_LABELS[focus];
  const hasResidentNeeds = hasNeeds(needs);
  const hasConversation = chat.messages.some((message) => message.role === "assistant" && message.content);
  const mapSnapshot = {
    result, address, focus, needs, needsDraft, messages: chat.messages, showHome: false, lastQuestion, resultAnchor,
    selected: latestResources.filter((resource) => effectiveSelected.has(resource.id)).map((resource) => sourceId(resource.id)),
    allSelected: [...effectiveSelected], searches, optOut: [...optOut], hiddenCategories: [...hiddenKeys], dismissed: [...dismissed], view, tableOrigin,
  };

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const measure = () => document.documentElement.style.setProperty("--bace-header-height", `${header.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => { observer.disconnect(); document.documentElement.style.removeProperty("--bace-header-height"); };
  }, []);

  const reset = useCallback(() => {
    clearChat();
    void saveMapSession(null, { revalidate: false });
    generation.current += 1;
    request.current?.abort();
    setSearches([]); setPending(null); setNeedsAddress(""); setFocus("all"); setView("chat"); setTableOrigin("chat");
    setNeeds(EMPTY_NEEDS); setNeedsDraft(EMPTY_NEEDS); setPanel(null);
    setSelected(new Set()); setOptOut(new Set()); setHiddenKeys(new Set()); setDismissed(new Set());
    setReport(null); setPrinting(false); setEditing(false); setBusy(false);
    setError(""); setLastQuery(""); setStatus(""); setResetOpen(false);
    setDraft({ text: "", revision: 0 });
    lookupIntent.current = { question: "", scope: "all", original: "", toTable: false };
    setLastQuestion("");
    pendingAnchor.current = null; setResultAnchor(null);
    setSession((value) => value + 1);
  }, [clearChat, saveMapSession]);

  function startOver() {
    if (skipResetPrompt) reset(); else setResetOpen(true);
  }

  function goHome() {
    setPanel(null);
    if (hasSession) { startOver(); return; }
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function openPanel(next: PanelView, opener?: HTMLElement | null) {
    panelOpener.current = opener ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    if (next !== "help") setTourRequested(false);
    setPanel(next);
  }

  function changeFocus(next: ResourceFocus) {
    if (chat.busy) chat.cancel();
    setFocus(next);
    setStatus(t("Now showing {type}. Previous replies are unchanged.", { type: t(next === "all" ? "All resources" : CATEGORY_LABELS[next]) }));
  }

  function jump(category: ResourceCategory) {
    setPanel(null);
    window.setTimeout(() => {
      const heading = document.getElementById(`${category}-title`) ?? document.querySelector<HTMLElement>(`[data-latest-category="${category}"]`);
      heading?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      heading?.focus({ preventScroll: true });
    }, 100);
  }

  function accept(data: LookupResponse, query: string) {
    generation.current += 1;
    const toTable = lookupIntent.current.toTable;
    const confirmed = data.address || data.confirmAddress || query;
    const id = `s${searches.length + 1}`;
    const anchor = toTable ? null : pendingAnchor.current;
    setSearches((current) => [...current, { id, address: confirmed, result: data, anchor }]);
    setSelected((current) => new Set([...current, ...[...defaultShortlist(resourcesFromLookup(data))].map((resourceId) => `${id}::${resourceId}`)]));
    setReport(null); setView(toTable ? "table" : "chat");
    if (toTable) setTableOrigin("needs");
    setNeedsAddress(confirmed);
    setFocus(lookupIntent.current.scope);
    setEditing(false); setPending(null); setError(""); setStatus("");
    setResultAnchor(anchor);
    requestAnimationFrame(() => {
      if (toTable) { window.scrollTo({ top: 0, behavior: "instant" }); document.getElementById("table-title")?.focus({ preventScroll: true }); }
      else resultsHeading.current?.focus({ preventScroll: true });
    });
    if (!toTable && lookupIntent.current.question) {
      void chat.send(lookupIntent.current.original || lookupIntent.current.question, { result: data, focus: lookupIntent.current.scope, replyOnly: !!pendingAnchor.current });
    }
    setLastQuestion("");
  }

  function send(text: string, options?: SendOptions) {
    if (busy || chat.busy) return;
    setDraft((value) => ({ text: "", revision: value.revision + 1 }));
    if (options?.addressSearch || options?.addressConfirmed || options?.exact || isAddressQuery(text)) {
      const parsed = splitResourceRequest(text);
      const question = parsed.question || lastQuestion;
      lookupIntent.current = { question, scope: question ? inferResourceFocus(question) : "all", original: parsed.question ? text : question ? `${question}\n${parsed.address}` : "", toTable: tableView };
      pendingAnchor.current = chat.addUserMessage(text.trim());
      void lookup(parsed.address, options);
      requestAnimationFrame(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    } else {
      setPending(null); setError("");
      if (!tableView) setView("chat");
      if (/find|help|near|available|resident|client|busc|ayud|cerca/i.test(text)) setLastQuestion(text);
      void chat.send(text);
      requestAnimationFrame(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    }
  }

  function sendFromInput(text: string, options: SendOptions | undefined, addressOnly: boolean) {
    if (addressOnly && tableView) {
      lookupIntent.current = { question: "", scope: "all", original: "", toTable: true };
      pendingAnchor.current = null;
      void lookup(splitResourceRequest(text).address || text, options);
      return;
    }
    send(text, addressOnly ? { ...options, addressSearch: true } : options);
  }

  function showNeedsResults(typed?: string) {
    if (chat.busy) chat.cancel();
    setNeeds(sanitizeNeeds(needsDraft));
    setPanel(null);
    const target = (typed ?? needsAddress).trim();
    if (!target) return;
    if (result && target === address) { setView("table"); setTableOrigin("needs"); requestAnimationFrame(() => { window.scrollTo({ top: 0, behavior: "instant" }); document.getElementById("table-title")?.focus({ preventScroll: true }); }); return; }
    lookupIntent.current = { question: "", scope: "all", original: "", toTable: true };
    pendingAnchor.current = null;
    void lookup(target);
  }

  async function lookup(text: string, options?: SendOptions) {
    if (chat.busy) chat.cancel();
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true); setError(""); setPending(null); setLastQuery(text);
    try {
      const response = await fetch("/api/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, exact: options?.exact }), signal: controller.signal });
      if (!response.ok) throw new Error("Lookup unavailable");
      const data: LookupResponse = await response.json();
      if (controller.signal.aborted) return;
      if (!data.validated) { setError("We could not locate that address. Include the street, city, state, and ZIP code."); return; }
      if (!options?.addressConfirmed && !options?.exact && !lookupIntent.current.toTable && data.confirmAddress) setPending(data);
      else accept(data, text);
    } catch {
      if (!controller.signal.aborted) setError("The lookup is unavailable right now. Please try again.");
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }

  function toggle(id: string) {
    if (effectiveSelected.has(id)) {
      setSelected((current) => { const next = new Set(current); next.delete(id); return next; });
      if (autoSelected.has(id)) setOptOut((current) => new Set([...current, id]));
    } else {
      setSelected((current) => new Set([...current, id]));
      setOptOut((current) => { const next = new Set(current); next.delete(id); return next; });
      setDismissed((current) => { const next = new Set(current); next.delete(id); return next; });
    }
    setStatus("");
  }

  function shareResource(resource: Resource) {
    setSelected((current) => new Set([...current, resource.id]));
    openPanel("share");
  }

  function openTable() {
    setPanel(null); setView("table"); setTableOrigin("chat"); setEditing(false);
    requestAnimationFrame(() => { window.scrollTo({ top: 0, behavior: "instant" }); document.getElementById("table-title")?.focus({ preventScroll: true }); });
  }

  function removeCategory(groupId: string, category: ResourceCategory) {
    setHiddenKeys((current) => new Set([...current, `${groupId}:${category}`]));
    setStatus(t("{category} removed from the list.", { category: t(CATEGORY_LABELS[category]) }));
  }

  function restoreRemoved() {
    setHiddenKeys(new Set()); setDismissed(new Set());
    setStatus("Removed resources restored.");
  }

  async function download(includeAddress: boolean) {
    if (!shortlist.length || downloadLock.current) return;
    const activeGeneration = generation.current;
    downloadLock.current = true; setDownloading(true); setStatus("");
    try {
      const { createChatPdf, loadPdfFont } = await import("@/lib/chat-pdf");
      const pdf = createChatPdf(recommendationsText(shortlist, t, includeAddress ? address : undefined), await loadPdfFont(), t("Resident recommendations"));
      if (activeGeneration !== generation.current) return;
      const url = URL.createObjectURL(pdf.output("blob"));
      const link = document.createElement("a"); link.href = url; link.download = "bace-hub-resources.pdf"; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("Recommendations PDF prepared.");
    } catch { if (activeGeneration === generation.current) setStatus("Download failed. Please try again."); }
    finally { setDownloading(false); downloadLock.current = false; }
  }

  async function printList({ includeConversation, preparedBy, includeAddresses }: { includeConversation: boolean; preparedBy: string; includeAddresses: boolean }) {
    if (!shortlist.length) return;
    let qrSvg: string | undefined;
    try {
      const QRCode = (await import("qrcode")).default;
      qrSvg = await QRCode.toString(qrPayload(shortlist, t), { type: "svg", margin: 0, errorCorrectionLevel: "L" });
    } catch { qrSvg = undefined; }
    const conversation: PrintedExchange[] = [];
    if (includeConversation) {
      chat.messages.forEach((message, index) => {
        const reply = chat.messages[index + 1];
        if (message.role !== "user" || reply?.role !== "assistant" || !reply.content) return;
        const group = groupFor(index + 1, chat.messages, groups);
        conversation.push({ question: message.content, answer: shortenAnswer(reply.content), mentioned: mentionedIn(reply.content, group?.resources ?? []).map((resource) => resource.name) });
      });
    }
    const clusters = addressClusters(shortlist);
    const area = clusters.length === 1 && clusters[0].address ? areaOf(clusters[0].address) : t("Clark County");
    const date = new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", { dateStyle: "long" }).format(new Date());
    printHtml(t("Resident recommendations"), residentListDocument({ resources: shortlist, t, locale, area, date, preparedBy, qrSvg, conversation, includeAddresses }));
    setPrinting(false);
  }

  async function printCountywide() {
    const { SERVICES } = await import("@/lib/services");
    const directory = resourcesFromLookup({ planGroups: null, serviceGroups: { directory: SERVICES.map((service) => ({ ...service, distanceMiles: null })) } as unknown as LookupResponse["serviceGroups"], found: false });
    const date = new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", { dateStyle: "long" }).format(new Date());
    printHtml(t("Countywide resource sheet"), residentListDocument({ resources: directory, t, locale, area: t("Clark County"), date }));
  }

  function startAddressChange() {
    setEditing(!editing); setPending(null); setError("");
    setDraft((value) => ({ text: "", revision: value.revision + 1 }));
  }

  const input = (addressOnly = false) => <ChatInput key={`${session}:${draft.revision}:${addressOnly}`} initialValue={draft.text} autoFocus={draft.revision > 0} spacious={home || addressOnly} addressOnly={addressOnly} disabled={busy || chat.busy} onStop={chat.busy ? chat.cancel : undefined} onCancel={addressOnly ? () => { request.current?.abort(); setBusy(false); setEditing(false); setPending(null); setError(""); } : undefined} onSend={(text, options) => sendFromInput(text, options, addressOnly)} placeholder={t(addressOnly ? "@ to search address" : "@ to search address or ask a question")} />;
  const lookupFeedback = <>
    {busy && <p role="status" className="text-sm text-muted-foreground">{t("Checking internet plans and nearby programs…")}</p>}
    {error && <Alert variant="destructive"><AlertTitle>{t("Address lookup")}</AlertTitle><AlertDescription><p>{t(error)}</p><Button variant="outline" size="sm" onClick={() => void lookup(lastQuery)}>{t("Retry")}</Button></AlertDescription></Alert>}
    {pending && <Alert><AlertTitle>{t("Confirm this address")}</AlertTitle><AlertDescription><p>{pending.address || pending.confirmAddress}</p><div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => accept(pending, lastQuery)}>{t("Use this address")}</Button><Button size="sm" variant="outline" onClick={() => { setPending(null); if (lookupIntent.current.toTable && !tableView) openPanel("needs"); else setDraft((value) => ({ text: lastQuery, revision: value.revision + 1 })); }}>{t("Edit address")}</Button></div></AlertDescription></Alert>}
  </>;
  const listPanel = <SharePanel resources={shortlist} address={address} focus={focus} downloading={downloading} disabled={editing || busy} status={status === "Recommendations PDF prepared." || status === "Download failed. Please try again." ? status : ""} onRemove={toggle} onDownload={(includeAddress) => void download(includeAddress)} onPrint={() => setPrinting(true)} onOpenTable={result && !tableView ? openTable : undefined} />;

  function resultsBlock(group: SearchGroup, isLatest: boolean) {
    const { search } = group;
    const data = search.result;
    const prefix = isLatest ? "" : `${search.id}-`;
    const groupResources = group.resources;
    const categories = (focus === "all" || !isLatest ? CATEGORIES : CATEGORIES.filter((category) => category === focus)).slice().sort((a, b) => Number(!groupResources.some((resource) => resource.category === a)) - Number(!groupResources.some((resource) => resource.category === b)));
    const Title = isLatest ? "h1" : "h2";
    return <section className="bace-reply" aria-labelledby={isLatest ? "finder-title" : `reply-${search.id}`}>
      <AssistantLabel />
      <div className="bace-reply-intro">
        <Title ref={isLatest ? resultsHeading : undefined} id={isLatest ? "finder-title" : `reply-${search.id}`} tabIndex={-1} className="bace-reply-title focus:outline-none">{t("Here's what I found near {address}.", { address: search.address.split(",")[0] })}</Title>
        <p>{t(searches.length > 1 ? "These are added to the same resident's list as your earlier searches. Add or remove anything." : "Internet plans, devices, and digital skills help are below. The first option in each is already in the resident's list; add or remove anything.")}</p>
        {!data.found && <p className="text-muted-foreground">{t("We couldn't confirm internet plans for this address. This doesn't mean internet is unavailable; check with a provider. Device and training resources can still be explored.")}</p>}
        <div className="flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0" aria-hidden="true" /><span className="min-w-0 break-words">{search.address}</span>
          {isLatest && <><span aria-hidden="true">·</span><button type="button" className="bace-inline-action" onClick={startAddressChange}>{t(editing ? "Cancel" : "Change address")}</button><span aria-hidden="true">·</span><button type="button" className="bace-inline-action" onClick={() => openPanel("browse")} aria-haspopup="dialog">{t("Showing:")} {t(scopeLabel)}</button></>}
        </div>
      </div>
      <div className="flex flex-col gap-8">
        {categories.filter((category) => !hiddenKeys.has(`${search.id}:${category}`)).map((category) => <ResourceSection key={category} idPrefix={prefix} category={category} resources={groupResources.filter((resource) => resource.category === category && !dismissed.has(resource.id))} selected={effectiveSelected} onToggle={toggle} onShare={shareResource} onReport={setReport} />)}
        {isLatest && !data.found && !!data.nearbyAddresses?.length && <details className="text-sm"><summary className="cursor-pointer font-medium text-primary">{t("Other address matches")}</summary><div className="flex flex-col gap-3 pt-3"><p className="text-muted-foreground">{t("Choosing a match changes the search address. Only use an address that is correct for the resident.")}</p>{data.nearbyAddresses.slice(0, 3).map((pick) => { const label = `${pick.addr}, ${pick.city}, ${pick.state} ${pick.zip}`; return <Button key={JSON.stringify(pick)} variant="outline" className="h-auto min-h-9 justify-start whitespace-normal text-left" disabled={busy || chat.busy} onClick={() => { pendingAnchor.current = chat.addUserMessage(label); lookupIntent.current = { question: "", scope: "all", original: "", toTable: false }; void lookup(label, { exact: pick }); }}>{label}</Button>; })}</div></details>}
      </div>
      {isLatest && <div className="bace-response-share">
        <p className="text-sm text-muted-foreground">{t(searches.length > 1 ? "Share the {count} resources in the resident's list, grouped by address" : "Share the {count} resources in the resident's list", { count: shortlist.length })}</p>
        <ShareActions resources={shortlist} onPrint={() => setPrinting(true)} disabled={busy} />
        <button type="button" className="bace-inline-action self-start" onClick={openTable}>{t("Open full results")} →</button>
      </div>}
    </section>;
  }

  const anchors: Record<string, ReactNode> = {};
  const unanchored: ReactNode[] = [];
  const messageIds = new Set(chat.messages.map((message) => message.id));
  groups.forEach((group, index) => {
    const block = resultsBlock(group, index === groups.length - 1);
    if (group.search.anchor && messageIds.has(group.search.anchor)) anchors[group.search.anchor] = block;
    else unanchored.push(<div key={group.search.id} className="finder-chat-results">{block}</div>);
  });

  const showAside = !!result && !home && !tableView;

  return (
    <div className={cn("resource-finder bace-app flex min-h-dvh flex-col bg-background font-sans text-foreground", !home && "finder-with-chat")} data-panel-open={panel !== null && panel !== "help"} data-list-aside={showAside ? (listOpen ? "open" : "collapsed") : undefined}>
      <SessionTimeout key={session} onExpire={reset} />
        <header ref={headerRef} className="bace-header">
          <button type="button" aria-label={t("BACE Hub home")} onClick={goHome} className="bace-brand">
            <Wifi className="size-5" aria-hidden="true" /><span>BACE Hub</span>
          </button>
          <nav aria-label={t("Workspace tools")} className="bace-header-nav">
            {result && tableView && <button type="button" className="bace-header-link bace-header-wide" aria-haspopup="dialog" onClick={() => openPanel("share")}>{t("Resident's list")}{shortlist.length > 0 && <span className="bace-header-count">{shortlist.length}</span>}</button>}
            {hasSession && <button type="button" className="bace-header-icon" onClick={startOver} aria-label={t("Start new chat")} title={t("Start new chat")}><RotateCcw className="size-5" aria-hidden="true" /></button>}
            <ResourceMapLink snapshot={mapSnapshot} disabled={busy || chat.busy} variant="header" />
            <button type="button" className="bace-header-link" aria-haspopup="dialog" onClick={() => openPanel("help")}>{t("Guide")}</button>
            <LanguageLink className="bace-header-link" />
            {hasSession && <span className="lg:hidden"><WorkspaceMenu hasResults={!!result} shareCount={shortlist.length} snapshot={mapSnapshot} mapDisabled={busy || chat.busy} onOpen={openPanel} /></span>}
          </nav>
        </header>
      <div className="bace-main-shell">
        <main className={cn("bace-main", home && "bace-home", tableView && "bace-main-wide")}>
          {home ? <ResourceHome
            input={input()}
            feedback={lookupFeedback}
            needsApplied={hasResidentNeeds}
            onNeeds={() => openPanel("needs")}
            onTour={() => { openPanel("help"); setTourRequested(true); }}
            onStarter={(prompt) => send(prompt)}
          /> : tableView ? <div className="flex flex-1 flex-col gap-8">
            {editableTable && (editing || busy || error || pending) && <div className="flex flex-col gap-4">{editing && input(true)}{lookupFeedback}</div>}
            <ResultsTable groups={groups.map((group) => ({ id: group.search.id, address: group.search.address, resources: group.resources }))} selected={effectiveSelected} shortlist={shortlist} hiddenKeys={hiddenKeys} dismissed={dismissed} editable={editableTable} needsApplied={hasResidentNeeds}
              onToggle={toggle} onShare={shareResource} onReport={setReport} onDismiss={(id) => setDismissed((current) => new Set([...current, id]))} onRemoveCategory={removeCategory} onRestore={restoreRemoved} onPrint={() => setPrinting(true)}
              onBack={editableTable ? undefined : () => setView("chat")}
              onChangeAddress={editableTable ? startAddressChange : undefined}
              onEditNeeds={editableTable ? () => { setNeedsDraft(needs); openPanel("needs"); } : undefined} />
            {editableTable && chat.messages.length > 0 && <div className="flex flex-col gap-3 border-t border-dashed border-border pt-6">
              <h2 className="text-base font-semibold">{t("Questions about these results")}</h2>
              <ResourceConversation key={`table-${session}`} chat={chat} />
            </div>}
          </div> : <div className="flex flex-1 flex-col gap-8">
            {!result && <h1 id="finder-title" className="sr-only">{t("Conversation")}</h1>}
            <ResourceConversation key={session} chat={chat} anchorId={resultAnchor} anchors={anchors} leading={unanchored.length ? unanchored : undefined} footer={<>{editing && <div className="flex flex-col gap-4">{input(true)}</div>}{lookupFeedback}</>} showFooter={editing || busy || !!error || !!pending} />
          </div>}
        </main>
        {home && <footer className="bace-home-footer">
          <button type="button" className="bace-footer-link" onClick={() => void printCountywide()}>{t("Printable countywide sheet")}</button>
          <button type="button" className="bace-footer-link" onClick={() => setReport("general")}>{t("Report a problem")}</button>
          <a href="tel:911" className="bace-footer-meta">{t("Emergency 911")}</a>
          <a href="tel:988" className="bace-footer-meta">{t("Crisis 988")}</a>
          <a href="tel:211" className="bace-footer-meta">{t("Social services 211")}</a>
        </footer>}
        {!home && editing && !tableView && <div className="bace-feedback pb-5"><Button variant="link" size="sm" onClick={() => setReport("general")}>{t("Report a problem")}</Button></div>}
        {!home && !editing && !(tableView && !editableTable) && <div className="finder-chat-dock"><div className="finder-chat-composer">{input()}<p className="bace-composer-note">{t("Check eligibility and availability with the provider.")} <button type="button" className="bace-inline-action" onClick={() => setReport("general")}>{t("Report a problem")}</button></p></div></div>}
      </div>
      {showAside && listOpen && <aside id="resident-list-panel" className="bace-list-aside" aria-labelledby="list-aside-title">
        <div className="flex items-center justify-between gap-2">
          <h2 id="list-aside-title" className="flex items-center gap-2 text-base font-semibold text-foreground">{t("Resident's list")}<span className="bace-count-pill">{shortlist.length}</span></h2>
          <Button size="icon" variant="ghost" onClick={() => setListOpen(false)} aria-label={t("Minimize resident's list")} title={t("Minimize resident's list")} aria-controls="resident-list-panel" aria-expanded="true"><PanelLeftClose aria-hidden="true" /></Button>
        </div>
        {listPanel}
      </aside>}
      {showAside && <button type="button" className="bace-list-fab" onClick={() => { if (window.matchMedia("(min-width: 1024px)").matches) setListOpen(true); else openPanel("share"); }} aria-label={t("Open resident's list ({count} resources)", { count: shortlist.length })} title={t("Resident's list")}>
        <Share2 className="size-5" aria-hidden="true" />
        <span className="bace-list-fab-count" aria-hidden="true">{shortlist.length}</span>
      </button>}
      <WorkspacePanel view={panel} hasResults={!!result} onViewChange={setPanel} onClose={() => { setPanel(null); setTourRequested(false); }} opener={panelOpener}>
        {panel === "help" && <HowToUse key={tourRequested ? "tour" : "intro"} startTour={tourRequested} />}
        {panel === "browse" && <ResourceCategories resources={latestResources} focus={focus} onFocusChange={changeFocus} onJump={jump} onDone={() => setPanel(null)} />}
        {panel === "needs" && <ResidentNeeds draft={needsDraft} onChange={setNeedsDraft} address={needsAddress} onAddressChange={setNeedsAddress} onShowResources={showNeedsResults} busy={busy}
          onApply={() => { if (chat.busy) chat.cancel(); setNeeds(sanitizeNeeds(needsDraft)); setPanel(null); setStatus("Resident needs applied to future answers."); }}
          onClear={() => { if (chat.busy) chat.cancel(); setNeeds(EMPTY_NEEDS); setNeedsDraft(EMPTY_NEEDS); setStatus("Resident needs cleared."); }} />}
        {panel === "share" && listPanel}
      </WorkspacePanel>
      <span role="status" className="sr-only">{t(status)}</span>
      <ResetConfirmation addressFirst open={resetOpen} dontShowAgain={skipResetPrompt} onDontShowAgainChange={setSkipResetPrompt} onCancel={() => setResetOpen(false)} onConfirm={reset} onClosed={() => {}} />
      {printing && <PrintDialog count={shortlist.length} hasConversation={hasConversation} addressCount={addressClusters(shortlist).filter((cluster) => cluster.address).length} onClose={() => setPrinting(false)} onPrint={printList} />}
      {report && <ReportIssue resource={report === "general" ? undefined : report} onClose={() => setReport(null)} />}
    </div>
  );
}
