"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, MapPin, Plus, Share2, SlidersHorizontal, UsersRound } from "lucide-react";
import ResourceCategories from "./ResourceCategories";
import ResourceTopics from "./ResourceTopics";
import ResourceConversation from "./ResourceConversation";
import { useResourceChat } from "./useResourceChat";
import { SharePanel } from "./SharePanel";
import ResidentNeeds from "./ResidentNeeds";
import WorkspacePanel, { ActionRail, type PanelView } from "./WorkspacePanel";
import HowToUse from "./HowToUse";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ChatInput, { type SendOptions } from "@/components/chat/ChatInput";
import SessionTimeout from "@/components/chat/SessionTimeout";
import ResetConfirmation from "@/components/chat/ResetConfirmation";
import { LanguageToggle, useLanguage } from "@/components/chat/LanguageProvider";
import { CATEGORIES, CATEGORY_LABELS, isAddressQuery, recommendationsText, resourcesFromLookup, type LookupResponse, type Resource, type ResourceCategory } from "@/lib/resource-finder";
import { EMPTY_NEEDS, hasNeeds, inferResourceFocus, sanitizeNeeds, splitResourceRequest, type ResidentNeeds as Needs, type ResourceFocus } from "@/lib/resident-needs";
import ResourceSection from "./ResourceSection";
import ReportIssue from "./ReportIssue";

export default function ResourceFinder() {
  const { t } = useLanguage();
  const [result, setResult] = useState<LookupResponse | null>(null);
  const [focus, setFocus] = useState<ResourceFocus>("all");
  const [needs, setNeeds] = useState<Needs>(EMPTY_NEEDS);
  const [needsDraft, setNeedsDraft] = useState<Needs>(EMPTY_NEEDS);
  const chat = useResourceChat(result, focus, needs);
  const clearChat = chat.clear;
  const [panel, setPanel] = useState<PanelView | null>(null);
  const panelOpener = useRef<HTMLElement | null>(null);
  const [pending, setPending] = useState<LookupResponse | null>(null);
  const [address, setAddress] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [report, setReport] = useState<Resource | "general" | null>(null);
  const [session, setSession] = useState(0);
  const [resetOpen, setResetOpen] = useState(false);
  const [skipResetPrompt, setSkipResetPrompt] = useState(false);
  const generation = useRef(0);
  const [downloading, setDownloading] = useState(false);
  const [status, setStatus] = useState("");
  const [draft, setDraft] = useState({ text: "", revision: 0 });
  const request = useRef<AbortController | null>(null);
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const inputPanel = useRef<HTMLDivElement>(null);
  const downloadLock = useRef(false);
  const lookupIntent = useRef({ question: "", scope: "all" as ResourceFocus, original: "" });
  const lastQuestion = useRef("");
  const resources = result ? resourcesFromLookup(result) : [];
  const shortlist = resources.filter((resource) => selected.has(resource.id));
  const home = !result && chat.messages.length === 0;
  const scopeLabel = focus === "all" ? "All resources" : CATEGORY_LABELS[focus];
  const categories = (focus === "all" ? CATEGORIES : CATEGORIES.filter((category) => category === focus)).slice().sort((a, b) => Number(!resources.some((resource) => resource.category === a)) - Number(!resources.some((resource) => resource.category === b)));
  const hasResidentNeeds = hasNeeds(needs);

  useEffect(() => () => request.current?.abort(), []);

  const reset = useCallback(() => {
    clearChat();
    generation.current += 1;
    request.current?.abort();
    setResult(null); setPending(null); setAddress(""); setFocus("all");
    setNeeds(EMPTY_NEEDS); setNeedsDraft(EMPTY_NEEDS); setPanel(null);
    setSelected(new Set()); setReport(null); setEditing(false); setBusy(false);
    setError(""); setLastQuery(""); setStatus(""); setResetOpen(false);
    setDraft({ text: "", revision: 0 });
    lookupIntent.current = { question: "", scope: "all", original: "" };
    lastQuestion.current = "";
    setSession((value) => value + 1);
  }, [clearChat]);

  function openPanel(view: PanelView) {
    panelOpener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPanel(view);
  }

  function changeFocus(next: ResourceFocus) {
    if (chat.busy) chat.cancel();
    setFocus(next);
    setStatus(t("Now showing {type}. Previous replies are unchanged.", { type: t(next === "all" ? "All resources" : CATEGORY_LABELS[next]) }));
  }

  function jump(category: ResourceCategory) {
    setPanel(null);
    window.setTimeout(() => {
      const heading = document.getElementById(`${category}-title`);
      heading?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      heading?.focus({ preventScroll: true });
    }, 100);
  }

  function accept(data: LookupResponse, query: string) {
    generation.current += 1;
    setReport(null); setResult(data);
    setAddress(data.address || data.confirmAddress || query);
    setFocus(lookupIntent.current.scope); setSelected(new Set());
    setEditing(false); setPending(null); setError(""); setStatus("");
    requestAnimationFrame(() => resultsHeading.current?.focus());
    if (lookupIntent.current.question) {
      void chat.send(lookupIntent.current.original || lookupIntent.current.question, { result: data, focus: lookupIntent.current.scope });
    }
    lastQuestion.current = "";
  }

  function send(text: string, options?: SendOptions) {
    if (busy || chat.busy) return;
    setDraft((value) => ({ text: "", revision: value.revision + 1 }));
    if (options?.addressSearch || options?.addressConfirmed || options?.exact || isAddressQuery(text)) {
      const parsed = splitResourceRequest(text);
      const question = parsed.question || lastQuestion.current;
      lookupIntent.current = { question, scope: question ? inferResourceFocus(question) : "all", original: parsed.question ? text : question ? `${question}\n${parsed.address}` : "" };
      void lookup(parsed.address, options);
    } else {
      setPending(null); setError("");
      if (/find|help|near|available|client|busc|ayud|cerca/i.test(text)) lastQuestion.current = text;
      void chat.send(text);
      requestAnimationFrame(() => document.getElementById("latest-resource-question")?.scrollIntoView({ block: "start" }));
    }
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
      if (!options?.addressConfirmed && !options?.exact && data.confirmAddress) setPending(data);
      else accept(data, text);
    } catch {
      if (!controller.signal.aborted) setError("The lookup is unavailable right now. Please try again.");
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }

  function toggle(id: string) {
    setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    setStatus("");
  }

  function shareResource(resource: Resource) {
    setSelected((current) => new Set([...current, resource.id]));
    openPanel("share");
  }

  async function download(includeAddress: boolean) {
    if (!shortlist.length || downloadLock.current) return;
    const activeGeneration = generation.current;
    downloadLock.current = true; setDownloading(true); setStatus("");
    try {
      const { createChatPdf, loadPdfFont } = await import("@/lib/chat-pdf");
      const pdf = createChatPdf(recommendationsText(shortlist, t, includeAddress ? address : undefined), await loadPdfFont(), t("Client recommendations"));
      if (activeGeneration !== generation.current) return;
      const url = URL.createObjectURL(pdf.output("blob"));
      const link = document.createElement("a"); link.href = url; link.download = "bace-hub-resources.pdf"; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("Recommendations PDF prepared.");
    } catch { if (activeGeneration === generation.current) setStatus("Download failed. Please try again."); }
    finally { setDownloading(false); downloadLock.current = false; }
  }

  const input = (addressOnly = false) => <ChatInput key={`${session}:${draft.revision}:${addressOnly}`} initialValue={draft.text} autoFocus={draft.revision > 0} spacious={home || addressOnly} addressOnly={addressOnly} disabled={busy || chat.busy} onStop={chat.busy ? chat.cancel : undefined} onCancel={addressOnly ? () => { request.current?.abort(); setBusy(false); setEditing(false); setPending(null); setError(""); } : undefined} onSend={(text, options) => send(text, addressOnly ? { ...options, addressSearch: true } : options)} placeholder={t(addressOnly ? "Enter a new client address…" : result ? "Ask about these resources…" : "Enter an address or ask a question…")} />;
  const lookupFeedback = <>
    {busy && <p role="status" className="text-sm text-muted-foreground">{t("Checking internet plans and nearby programs…")}</p>}
    {error && <Alert variant="destructive"><AlertTitle>{t("Address lookup")}</AlertTitle><AlertDescription><p>{t(error)}</p><Button variant="outline" size="sm" onClick={() => void lookup(lastQuery)}>{t("Retry")}</Button></AlertDescription></Alert>}
    {pending && <Alert><AlertTitle>{t("Confirm this address")}</AlertTitle><AlertDescription><p>{pending.address || pending.confirmAddress}</p><div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => accept(pending, lastQuery)}>{t("Use this address")}</Button><Button size="sm" variant="outline" onClick={() => { setPending(null); setDraft((value) => ({ text: lastQuery, revision: value.revision + 1 })); }}>{t("Edit address")}</Button></div></AlertDescription></Alert>}
  </>;

  return (
    <div className={cn("resource-finder bace-app flex min-h-dvh flex-col bg-background font-sans text-foreground", !home && "finder-with-chat")} data-panel-open={panel !== null}>
      <SessionTimeout key={session} onExpire={reset} />
      <div className="bace-main-shell">
        <header className="bace-header">
          <button type="button" aria-label={t("BACE Hub home")} onClick={() => { if (!home) { if (skipResetPrompt) reset(); else setResetOpen(true); } }} className="flex flex-col text-left">
            <span className="bace-county">{t("Clark County")}</span>
            <span className="bace-wordmark">BACE <span className="font-normal text-muted-foreground">Hub</span></span>
          </button>
          <div className="flex items-center gap-1 sm:gap-2">
            {!home && <Button variant="ghost" size="icon" aria-label={t("New resident")} title={t("New resident")} onClick={() => skipResetPrompt ? reset() : setResetOpen(true)}><Plus aria-hidden="true" /></Button>}
            {result && <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("Share resources")} title={t("Share resources")} onClick={() => openPanel("share")}><Share2 aria-hidden="true" /></Button>}
            <HowToUse compact />
            <LanguageToggle tone="neutral" />
          </div>
        </header>
        <main className={cn("bace-main", home && "bace-home")}>
          {home ? <section aria-labelledby="finder-title" className="bace-home-content">
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="bace-eyebrow">{t("A little guidance. A better connection.")}</span>
              <h1 id="finder-title" className="bace-home-title text-balance">{t("What can we help your client find?")}</h1>
              <p className="max-w-lg text-pretty text-base leading-relaxed text-muted-foreground">{t("Enter an address to explore nearby resources, or start with a question.")}</p>
            </div>
            <div ref={inputPanel} className="flex w-full flex-col gap-4">{input()}{lookupFeedback}</div>
            <ResourceTopics onChoose={(text) => setDraft((value) => ({ text, revision: value.revision + 1 }))} />
            <Button variant="ghost" className="self-center" onClick={() => openPanel("needs")}><UsersRound data-icon="inline-start" aria-hidden="true" />{t(hasResidentNeeds ? "Resident needs · Edit" : "Add resident needs")}<span className="text-muted-foreground">{t("Optional")}</span></Button>
            {hasResidentNeeds && <p className="text-center text-sm text-muted-foreground">{t("Resident needs applied to future answers.")}</p>}
          </section> : <div className="flex flex-col gap-8">
            <section className="flex flex-col gap-4" aria-labelledby="finder-title">
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">{t("A clearer path to connection")}</p>
                <h1 ref={resultsHeading} id="finder-title" tabIndex={-1} className="text-balance text-3xl font-medium tracking-tight focus:outline-none">{t(result ? "Your resource overview" : "Let’s find a good fit.")}</h1>
              </div>
              {result && <>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"><MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="min-w-0 break-words">{address}</span><Button variant="link" size="sm" onClick={() => { setEditing(!editing); setPending(null); setError(""); setDraft((value) => ({ text: "", revision: value.revision + 1 })); }}>{t(editing ? "Cancel" : "Change address")}</Button></div>
                <div className="bace-context-bar">
                  <button type="button" onClick={() => openPanel("browse")} aria-haspopup="dialog" className="bace-context-action"><SlidersHorizontal className="size-4" aria-hidden="true" /><span>{t("Showing:")} <strong className="font-medium">{t(scopeLabel)}</strong></span><ArrowUpRight className="size-4" aria-hidden="true" /><span className="sr-only">{t("Change resource view")}</span></button>
                  <button type="button" onClick={() => openPanel("needs")} aria-haspopup="dialog" className="bace-context-action"><UsersRound className="size-4" aria-hidden="true" />{t(hasResidentNeeds ? "Resident needs · Edit" : "Add resident needs")}{hasResidentNeeds && <Check className="size-4 text-primary" aria-hidden="true" />}</button>
                </div>
              </>}
              {editing && <div className="flex flex-col gap-4">{input(true)}</div>}
              {lookupFeedback}
              {result && !result.found && <p className="text-sm leading-relaxed text-muted-foreground">{t("No exact broadband record. Device and training programs are still shown; internet availability is unconfirmed.")}</p>}
            </section>
            {result && <div key={address} className="flex flex-col gap-10">
              {categories.map((category) => <ResourceSection key={category} category={category} resources={resources.filter((resource) => resource.category === category)} selected={selected} onToggle={toggle} onShare={shareResource} onReport={setReport} />)}
              {!result.found && <Alert><AlertTitle>{t("No exact broadband record")}</AlertTitle><AlertDescription><p>{t("National programs shown. Try another address for internet plans.")}</p>{result.nearbyAddresses?.slice(0, 3).map((pick) => <Button key={JSON.stringify(pick)} variant="outline" className="h-auto min-h-9 justify-start whitespace-normal text-left" disabled={busy} onClick={() => void lookup(`${pick.addr}, ${pick.city}, ${pick.state} ${pick.zip}`, { exact: pick })}>{`${pick.addr}, ${pick.city}, ${pick.state} ${pick.zip}`}</Button>)}</AlertDescription></Alert>}
            </div>}
            <ResourceConversation key={session} chat={chat} />
          </div>}
        </main>
        <div className={cn("bace-feedback", !home && "pb-5")}><Button variant="link" size="sm" onClick={() => setReport("general")}>{t("Give feedback/report issues")}</Button></div>
        {!home && !editing && <div className="finder-chat-dock"><div className="finder-chat-composer"><p className="bace-composer-scope">{t("Answering about:")} {t(scopeLabel)}</p>{input()}<p className="bace-composer-note">{t("Check eligibility and availability with the provider.")}</p></div></div>}
      </div>
      <ActionRail hasResults={!!result} count={shortlist.length} active={panel} onOpen={openPanel} />
      <WorkspacePanel view={panel} hasResults={!!result} onViewChange={setPanel} onClose={() => setPanel(null)} opener={panelOpener}>
        {panel === "browse" && <ResourceCategories resources={resources} focus={focus} onFocusChange={changeFocus} onJump={jump} onDone={() => setPanel(null)} />}
        {panel === "needs" && <ResidentNeeds draft={needsDraft} focus={focus} onChange={setNeedsDraft} onApply={() => { if (chat.busy) chat.cancel(); setNeeds(sanitizeNeeds(needsDraft)); setPanel(null); setStatus("Resident needs applied to future answers."); }} onClear={() => { if (chat.busy) chat.cancel(); setNeeds(EMPTY_NEEDS); setNeedsDraft(EMPTY_NEEDS); setStatus("Resident needs cleared."); }} />}
        {panel === "share" && <SharePanel resources={shortlist} address={address} focus={focus} downloading={downloading} disabled={editing || busy} status={status === "Recommendations PDF prepared." || status === "Download failed. Please try again." ? status : ""} onRemove={toggle} onDownload={(includeAddress) => void download(includeAddress)} />}
      </WorkspacePanel>
      <span role="status" className="sr-only">{t(status)}</span>
      <ResetConfirmation addressFirst open={resetOpen} dontShowAgain={skipResetPrompt} onDontShowAgainChange={setSkipResetPrompt} onCancel={() => setResetOpen(false)} onConfirm={reset} onClosed={() => {}} />
      {report && <ReportIssue resource={report === "general" ? undefined : report} onClose={() => setReport(null)} />}
    </div>
  );
}
