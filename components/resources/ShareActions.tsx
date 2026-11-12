"use client";

import { useState } from "react";
import { Copy, Mail, MessageSquare, Printer } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useLanguage } from "@/components/chat/LanguageProvider";
import { cn } from "@/lib/utils";
import { recommendationsText, resourceCaseNote, type Resource } from "@/lib/resource-finder";

export default function ShareActions({ resources, onPrint, disabled, className }: {
  resources: Resource[]; onPrint: () => void; disabled?: boolean; className?: string;
}) {
  const { t } = useLanguage();
  const [status, setStatus] = useState("");
  const empty = !resources.length || disabled;
  const text = recommendationsText(resources, t);
  const email = `mailto:?subject=${encodeURIComponent(t("Clark County digital resources"))}&body=${encodeURIComponent(text)}`;
  const sms = `sms:${typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent) ? "&" : "?"}body=${encodeURIComponent(text)}`;
  async function copyNote() {
    try { await navigator.clipboard.writeText(resourceCaseNote(resources, t)); setStatus("Case note copied."); }
    catch { setStatus("Clipboard access is blocked. Copy the selected text manually."); }
  }
  const linkClass = cn(buttonVariants({ variant: "outline", size: "sm" }), "bace-share-action", empty && "pointer-events-none opacity-50");
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="bace-share-actions" role="group" aria-label={t("Share the resident's list")}>
        <Button size="sm" className="bace-share-action" disabled={empty} onClick={onPrint}><Printer data-icon="inline-start" aria-hidden="true" />{t("Print")}</Button>
        <a className={linkClass} href={empty ? undefined : sms} aria-disabled={empty || undefined}><MessageSquare data-icon="inline-start" aria-hidden="true" />{t("Text")}</a>
        <a className={linkClass} href={empty ? undefined : email} aria-disabled={empty || undefined}><Mail data-icon="inline-start" aria-hidden="true" />{t("Email")}</a>
        <Button size="sm" variant="outline" className="bace-share-action" disabled={empty} onClick={() => void copyNote()}><Copy data-icon="inline-start" aria-hidden="true" />{t("Copy case note")}</Button>
      </div>
      <p role="status" className="text-sm text-primary empty:hidden">{t(status)}</p>
    </div>
  );
}
