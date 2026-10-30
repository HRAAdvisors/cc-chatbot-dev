"use client";

import { useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { ArrowLeft, ArrowRight, ArrowUp, Check, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/chat/LanguageProvider";
import { cn } from "@/lib/utils";

const exampleAddress = "123 Example St, Las Vegas, NV 89101";
const steps = [
  { title: "Search an address", instruction: "Type @123, choose the example address, then select Find resources." },
  { title: "Open the details", instruction: "Select Details & sharing to learn more about this option." },
  { title: "Choose an option", instruction: "Check the box to include this resource." },
  { title: "Share the shortlist", instruction: "Select Share resource list to preview what your client receives." },
];

export default function ResourceWalkthrough() {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState("");
  const [addressPicked, setAddressPicked] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const canContinue = step === 1 ? detailsOpen : step === 2 ? selected : shareOpen;
  const exampleText = `${t("Example internet plan")}\n$25${t("/mo")} · 100 Mbps\n${t("Example only. Not an available offer.")}`;

  function goTo(next: number) {
    setStep(next);
    requestAnimationFrame(() => heading.current?.focus());
  }

  async function copyExample() {
    try {
      await navigator.clipboard.writeText(exampleText);
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Select the text above to copy it.");
    }
  }

  return (
    <div className="flex min-h-0 flex-col gap-5">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{t("Example walkthrough")}</span>
        <span className="text-sm tabular-nums text-muted-foreground">{t("Step {step} of {total}", { step: step + 1, total: steps.length })}</span>
      </div>
      <div className="flex min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain">
        {step > 0 && (
          <div aria-hidden="true" inert className="select-none rounded-xl border border-border bg-muted p-3 text-muted-foreground blur-[3px]">
            <p className="text-sm">{exampleAddress}</p>
          </div>
        )}
        <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_13rem]">
          <section aria-label={t("Practice area")} data-tour-target className="min-w-0 rounded-xl border-2 border-primary bg-background p-4 text-foreground shadow-sm">
            {step === 0 ? (
              <form onSubmit={(event) => { event.preventDefault(); if (addressPicked) goTo(1); }}>
                <div className="flex flex-col gap-3">
                  <label htmlFor="practice-address" className="text-sm font-semibold">{t("Client address")}</label>
                  <input
                    id="practice-address"
                    value={draft}
                    onChange={(event) => { setDraft(event.target.value); setAddressPicked(false); }}
                    onKeyDown={(event) => { if (event.key === "Enter" && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault(); }}
                    autoComplete="off"
                    placeholder={t("@ to search address")}
                    className="min-h-14 w-full rounded-lg border border-input bg-card px-3 text-base text-card-foreground focus-visible:outline-2 focus-visible:outline-ring"
                  />
                  {!addressPicked && draft.trim().startsWith("@") && draft.trim().length >= 4 && (
                    <button type="button" onClick={() => { setDraft(exampleAddress); setAddressPicked(true); }} className="flex min-h-11 items-start gap-2 rounded-lg border border-border bg-accent p-3 text-left text-sm leading-relaxed text-accent-foreground focus-visible:outline-2 focus-visible:outline-ring">
                      <MapPin className="size-4 shrink-0" aria-hidden="true" />
                      {exampleAddress}
                    </button>
                  )}
                  <Button type="submit" disabled={!addressPicked}>
                    {t("Find resources")}<ArrowRight data-icon="inline-end" aria-hidden="true" />
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-4">
                <div aria-hidden={step === 2 || undefined} className={cn("flex flex-col gap-1", step === 2 && "select-none blur-[3px]")}>
                  <p className="text-base font-semibold">{t(step === 3 ? "Resources to share" : "Example internet plan")}{step === 3 ? " (1)" : ""}</p>
                  {step !== 3 && <p className="text-sm text-muted-foreground">$25{t("/mo")} · 100 Mbps</p>}
                </div>
                {step === 1 && (
                  <details open={detailsOpen} onToggle={(event) => setDetailsOpen(event.currentTarget.open)}>
                    <summary className="cursor-pointer text-sm font-medium text-primary focus-visible:outline-2 focus-visible:outline-ring">{t("Details & sharing")}</summary>
                    <div className="pt-3">
                      <div className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
                        <p>100 Mbps · {t("No contract")}</p>
                        <p>{t("Example only. Not an available offer.")}</p>
                      </div>
                    </div>
                  </details>
                )}
                {step === 2 && (
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={selected} onChange={(event) => setSelected(event.target.checked)} className="size-4 accent-primary" />
                    {t(selected ? "Selected to share" : "Select to share")}
                  </label>
                )}
                {step === 3 && (
                  <>
                    <Button variant="outline" onClick={() => setShareOpen(true)} aria-expanded={shareOpen}>{t("Share resource list")}</Button>
                    {shareOpen && (
                      <div className="flex flex-col gap-3">
                        <label htmlFor="practice-share" className="text-sm font-medium">{t("Example message")}</label>
                        <textarea id="practice-share" readOnly value={exampleText} rows={4} className="w-full resize-none rounded-lg border border-input bg-card p-3 text-sm leading-relaxed text-card-foreground focus-visible:outline-2 focus-visible:outline-ring" />
                        <Button size="sm" variant="outline" onClick={() => void copyExample()}>{t("Copy example")}</Button>
                        <p role="status" className={cn("text-sm text-muted-foreground", !copyStatus && "sr-only")}>{t(copyStatus)}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </section>
          <aside className="flex items-start gap-2" aria-live="polite" aria-atomic="true">
            <ArrowLeft className="hidden size-6 shrink-0 text-primary sm:block" aria-hidden="true" />
            <ArrowUp className="size-6 shrink-0 text-primary sm:hidden" aria-hidden="true" />
            <div className="flex flex-col gap-2">
              <h3 ref={heading} tabIndex={-1} className="text-base font-semibold outline-none">{t(steps[step].title)}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{t(steps[step].instruction)}</p>
              {step === 3 && shareOpen && <p className="flex items-center gap-2 text-sm text-primary"><Check className="size-4" aria-hidden="true" />{t("Ready to share")}</p>}
            </div>
          </aside>
        </div>
        <div aria-hidden="true" inert className="select-none rounded-xl border border-border bg-muted p-3 text-muted-foreground blur-[3px]">
          <p className="text-sm">{t(step === 0 ? "Resources to share" : "Devices & computer access")}</p>
          <p className="text-sm">{t(step === 0 ? "Internet plans" : "Digital skills training")}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-3">
        <Button variant="ghost" disabled={step === 0} onClick={() => goTo(step - 1)}>{t("Back")}</Button>
        {step === 3 ? (
          <Dialog.Close disabled={!canContinue} render={<Button />}>
            {t("Finish")}
          </Dialog.Close>
        ) : step > 0 ? (
          <Button disabled={!canContinue} onClick={() => goTo(step + 1)}>{t("Next")}<ArrowRight data-icon="inline-end" aria-hidden="true" /></Button>
        ) : <Dialog.Close render={<Button variant="ghost" />}>{t("Skip tour")}</Dialog.Close>}
      </div>
    </div>
  );
}
