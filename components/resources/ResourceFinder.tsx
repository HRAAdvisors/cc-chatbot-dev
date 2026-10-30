"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ClipboardList, Download, MapPin, RotateCcw } from "lucide-react";
import ResourceCategories from "./ResourceCategories";
import ResourceTopics from "./ResourceTopics";
import ResourceConversation from "./ResourceConversation";
import { useResourceChat } from "./useResourceChat";
import HowToUse from "./HowToUse";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ChatInput, { type SendOptions } from "@/components/chat/ChatInput";
import SessionTimeout from "@/components/chat/SessionTimeout";
import ResetConfirmation from "@/components/chat/ResetConfirmation";
import {
  LanguageToggle,
  useLanguage,
} from "@/components/chat/LanguageProvider";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  isAddressQuery,
  defaultShortlist,
  recommendationsText,
  resourcesFromLookup,
  type LookupResponse,
  type Resource,
} from "@/lib/resource-finder";
import ResourceSection from "./ResourceSection";
import ShareRecommendations from "./ShareRecommendations";
import ReportIssue from "./ReportIssue";

export default function ResourceFinder() {
  const { t } = useLanguage();
  const [result, setResult] = useState<LookupResponse | null>(null);
  const chat = useResourceChat(result);
  const clearChat = chat.clear;
  const searchPanel = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState<LookupResponse | null>(null);
  const [address, setAddress] = useState("");
  const [editing, setEditing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [share, setShare] = useState<{
    resources: Resource[];
    note?: boolean;
  } | null>(null);
  const [report, setReport] = useState<Resource | "general" | null>(null);
  const [session, setSession] = useState(0);
  const [resetOpen, setResetOpen] = useState(false);
  const [skipResetPrompt, setSkipResetPrompt] = useState(false);
  const generation = useRef(0);
  const [downloading, setDownloading] = useState(false);
  const [status, setStatus] = useState("");
  const request = useRef<AbortController | null>(null);
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const downloadLock = useRef(false);
  const resources = result ? resourcesFromLookup(result) : [];
  const shortlist = resources.filter((resource) => selected.has(resource.id));
  const availableCategories = CATEGORIES.filter((category) =>
    resources.some((resource) => resource.category === category),
  );
  const emptyCategories = CATEGORIES.filter((category) =>
    !availableCategories.includes(category),
  );

  useEffect(() => () => request.current?.abort(), []);

  const reset = useCallback(() => {
    clearChat();
    generation.current += 1;
    setResetOpen(false);
    request.current?.abort();
    setResult(null);
    setPending(null);
    setAddress("");
    setSelected(new Set());
    setShare(null);
    setReport(null);
    setEditing(true);
    setBusy(false);
    setError("");
    setLastQuery("");
    setStatus("");
    setSession((value) => value + 1);
  }, [clearChat]);

  function accept(data: LookupResponse, query: string) {
    clearChat();
    generation.current += 1;
    setShare(null);
    setReport(null);
    setResult(data);
    setAddress(data.address || data.confirmAddress || query);
    setSelected(defaultShortlist(resourcesFromLookup(data)));
    setEditing(false);
    setPending(null);
    setError("");
    setStatus("");
    requestAnimationFrame(() => resultsHeading.current?.focus());
  }

  function send(text: string, options?: SendOptions) {
    if (busy || chat.busy) return;
    if (options?.addressSearch || options?.addressConfirmed || options?.exact || isAddressQuery(text)) {
      void lookup(text, options);
    } else {
      setPending(null);
      setError("");
      void chat.send(text);
      requestAnimationFrame(() => document.getElementById("latest-resource-question")?.scrollIntoView({ block: "start" }));
    }
  }

  async function lookup(text: string, options?: SendOptions) {
    if (chat.busy) chat.cancel();
    setEditing(true);
    requestAnimationFrame(() => searchPanel.current?.scrollIntoView({ block: "center" }));
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    setPending(null);
    setLastQuery(text);
    try {
      const response = await fetch("/api/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, exact: options?.exact }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Lookup unavailable");
      const data: LookupResponse = await response.json();
      if (controller.signal.aborted) return;
      if (!data.validated) {
        setError(
          "We could not locate that address. Include the street, city, state, and ZIP code.",
        );
        return;
      }
      if (!options?.addressConfirmed && !options?.exact && data.confirmAddress)
        setPending(data);
      else accept(data, text);
    } catch {
      if (!controller.signal.aborted)
        setError("The lookup is unavailable right now. Please try again.");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setStatus("");
  }

  async function download() {
    if (!shortlist.length || downloadLock.current) return;
    const activeGeneration = generation.current;
    downloadLock.current = true;
    setDownloading(true);
    setStatus("");
    try {
      const { createChatPdf, loadPdfFont } = await import("@/lib/chat-pdf");
      const pdf = createChatPdf(
        recommendationsText(shortlist, t),
        await loadPdfFont(),
        t("Client recommendations"),
      );
      if (activeGeneration !== generation.current) return;
      const url = URL.createObjectURL(pdf.output("blob"));
      const link = document.createElement("a");
      link.href = url;
      link.download = "clark-county-recommendations.pdf";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("Recommendations PDF prepared.");
    } catch {
      setStatus("Download failed. Please try again.");
    } finally {
      setDownloading(false);
      downloadLock.current = false;
    }
  }

  return (
    <div className={cn("resource-finder flex min-h-dvh flex-col bg-background font-sans text-foreground", result && !editing && "finder-with-chat")}>
      <SessionTimeout key={session} onExpire={reset} />
      <header className="finder-header bg-primary text-primary-foreground">
        <div className="mx-auto max-w-5xl px-5 py-4 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="max-w-72 text-base font-semibold leading-snug tracking-tight">{t("Clark County Digital Equity Assistant")}</span>
            <div className="flex items-center gap-2">
              <HowToUse />
              <LanguageToggle tone="inverse" />
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 sm:px-8 sm:py-10 lg:py-14">
        <div className="flex flex-col gap-8">
          <section
            aria-labelledby="finder-title"
            className="flex flex-col gap-7"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-2">
                <h1 id="finder-title" className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                  {t(result ? "Your resource overview" : "Find the right support for your client.")}
                </h1>
                {!result && <p className="text-pretty text-base leading-relaxed text-muted-foreground">{t("Internet, devices, and digital skills, all in one place.")}</p>}
              </div>
              {(result || chat.messages.length > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    skipResetPrompt ? reset() : setResetOpen(true)
                  }
                >
                  <RotateCcw data-icon="inline-start" aria-hidden="true" />
                  {t("New client")}
                </Button>
              )}
            </div>
            {result && (
              <div className="rounded-xl border border-border bg-card px-4 py-3 text-card-foreground">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2">
                    <MapPin
                      className="size-5 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-muted-foreground">
                        {t("Current address")}
                      </span>
                      <p className="break-words text-base font-medium">
                        {address}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      request.current?.abort();
                      setBusy(false);
                      setEditing((value) => !value);
                      setPending(null);
                      setError("");
                    }}
                  >
                    {t(editing ? "Cancel" : "Change address")}
                  </Button>
                </div>
              </div>
            )}
            {editing && (
              <div ref={searchPanel} className="finder-search-panel p-5 sm:p-7">
                <div className="flex flex-col gap-4">
                <h2 className="text-base font-semibold">{t(result ? "Enter a client address to find nearby resources." : "Start with an address or a question.")}</h2>
                <ChatInput
                  key={session}
                  addressOnly={!!result}
                  spacious
                  disabled={busy || chat.busy}
                  onStop={chat.busy ? chat.cancel : undefined}
                  onSend={result ? lookup : send}
                  placeholder={t(result ? "@ to search address" : "@ to search address or ask a question")}
                />
                {busy && (
                  <p role="status" className="text-sm text-primary">
                    {t("Checking internet plans and nearby programs…")}
                  </p>
                )}
                {error && (
                  <Alert variant="destructive">
                    <AlertTitle>{t("Address lookup")}</AlertTitle>
                    <AlertDescription>
                      <p>{t(error)}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void lookup(lastQuery)}
                      >
                        {t("Retry")}
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
                {pending && (
                  <Alert>
                    <AlertTitle>{t("Confirm this address")}</AlertTitle>
                    <AlertDescription>
                      <p>{pending.address || pending.confirmAddress}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => accept(pending, lastQuery)}
                        >
                          {t("Use this address")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPending(null)}
                        >
                          {t("Edit address")}
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                </div>
              </div>
            )}
          </section>
          {result && (
            <div key={address} className="flex flex-col gap-8">
              <ResourceCategories resources={resources} />
              <section
                aria-labelledby="shortlist-title"
                className="finder-handoff p-5 sm:p-6"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"><ClipboardList className="size-5" aria-hidden="true" /></span>
                    <div className="flex flex-col gap-1">
                      <h2
                        id="shortlist-title"
                        ref={resultsHeading}
                        tabIndex={-1}
                        className="text-lg font-semibold tracking-tight focus:outline-none"
                      >
                        {t("Resources to share")} <span className="font-normal text-muted-foreground">({shortlist.length})</span>
                      </h2>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={
                        !shortlist.length || downloading || editing || busy
                      }
                      onClick={() => void download()}
                    >
                      <Download data-icon="inline-start" aria-hidden="true" />
                      {t(
                        downloading
                          ? "Preparing PDF…"
                          : "Download resource list (PDF)",
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!shortlist.length || editing || busy}
                      onClick={() => setShare({ resources: shortlist })}
                    >
                      {t("Share resource list")}
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={!shortlist.length || editing || busy}
                      onClick={() =>
                        setShare({ resources: shortlist, note: true })
                      }
                    >
                      {t("Share case note")}
                    </Button>
                  </div>

                  <div role="status" className={cn("text-sm text-primary", !status && "sr-only")}>
                    {t(status)}
                  </div>
                </div>
              </section>
              {availableCategories.map((category) => (
                <ResourceSection
                  key={category}
                  category={category}
                  resources={resources.filter(
                    (resource) => resource.category === category,
                  )}
                  selected={selected}
                  onToggle={toggle}
                  onShare={(resource) => setShare({ resources: [resource] })}
                  onReport={setReport}
                />
              ))}
              {emptyCategories.map((category) => (
                <section key={category} id={category} aria-labelledby={`${category}-title`} className="scroll-mt-6 rounded-xl border border-dashed border-border p-5">
                  <div className="flex flex-col gap-2">
                    <h2 id={`${category}-title`} className="text-base font-semibold">{t(CATEGORY_LABELS[category])}</h2>
                    <p className="text-sm text-muted-foreground">{t("No matches to show")}</p>
                  </div>
                </section>
              ))}
              {!result.found && (
                <details className="text-sm text-muted-foreground">
                  <summary className="cursor-pointer font-medium">{t("No exact broadband record")}</summary>
                  <div className="pt-3">
                    <div className="flex flex-col gap-3">
                      <p>{t("National programs shown. Try another address for internet plans.")}</p>
                      {result.nearbyAddresses?.slice(0, 3).map((pick) => (
                        <Button
                          key={JSON.stringify(pick)}
                          variant="outline"
                          className="h-auto min-h-9 justify-start whitespace-normal text-left"
                          disabled={busy}
                          onClick={() => void lookup(`${pick.addr}, ${pick.city}, ${pick.state} ${pick.zip}`, { exact: pick })}
                        >{`${pick.addr}, ${pick.city}, ${pick.state} ${pick.zip}`}</Button>
                      ))}
                    </div>
                  </div>
                </details>
              )}
            </div>
          )}
          <ResourceConversation key={session} chat={chat} />
          {!result && chat.messages.length === 0 && <ResourceTopics />}
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReport("general")}
            >
              {t("Give feedback/report issues")}
            </Button>
          </div>
        </div>
      </main>
      {result && !editing && <div className="finder-chat-dock">
        <div className="finder-chat-composer">
          <ChatInput key={`${session}:${address}`} disabled={busy || chat.busy} onStop={chat.busy ? chat.cancel : undefined} placeholder="Ask about these resources, or @ to search address" onSend={send} />
        </div>
      </div>}
      <ResetConfirmation
        addressFirst
        open={resetOpen}
        dontShowAgain={skipResetPrompt}
        onDontShowAgainChange={setSkipResetPrompt}
        onCancel={() => setResetOpen(false)}
        onConfirm={reset}
        onClosed={() => {}}
      />
      {share && (
        <ShareRecommendations
          resources={share.resources}
          address={address}
          note={share.note}
          onClose={() => setShare(null)}
        />
      )}
      {report && (
        <ReportIssue
          resource={report === "general" ? undefined : report}
          onClose={() => setReport(null)}
        />
      )}
    </div>
  );
}
