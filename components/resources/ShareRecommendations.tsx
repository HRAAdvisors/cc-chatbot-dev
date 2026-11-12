"use client";

import { useRef, useState } from "react";
import { ArrowLeft, Copy, Download, Mail, MessageSquare, Printer } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/components/chat/LanguageProvider";
import { resourceCaseNote, recommendationsText, type Resource } from "@/lib/resource-finder";
import { printResourceText } from "@/lib/resource-print";

export default function ShareRecommendations({ resources, address, note, downloading, onDownload, onClose }: {
  resources: Resource[]; address: string; note?: boolean; downloading: boolean; onDownload: (includeAddress: boolean) => void; onClose: () => void;
}) {
  const { t, locale } = useLanguage();
  const [includeAddress, setIncludeAddress] = useState(false);
  const [status, setStatus] = useState("");
  const textRef = useRef<HTMLTextAreaElement>(null);
  const text = note ? resourceCaseNote(resources, t, includeAddress ? address : undefined) : recommendationsText(resources, t, includeAddress ? address : undefined);
  const email = `mailto:?subject=${encodeURIComponent(t("Clark County digital resources"))}&body=${encodeURIComponent(text)}`;
  const sms = `sms:${typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent) ? "&" : "?"}body=${encodeURIComponent(text)}`;
  async function copy() {
    try { await navigator.clipboard.writeText(text); setStatus(note ? "Case note copied." : "Details copied."); }
    catch { textRef.current?.focus(); textRef.current?.select(); setStatus("Clipboard access is blocked. Copy the selected text manually."); }
  }
  return (
    <div className="flex flex-col gap-5">
      <Button variant="ghost" className="self-start" onClick={onClose}><ArrowLeft data-icon="inline-start" aria-hidden="true" />{t("Back to selections")}</Button>
      <div className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">{t(note ? "Case note" : "Preview resource list")}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("Review before sharing. Email and text open your own app; nothing is sent automatically.")}</p>
      </div>
      <FieldGroup>
        {address && <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={includeAddress} onChange={(event) => { setIncludeAddress(event.target.checked); setStatus(""); }} className="size-4 accent-primary" />{t("Include resident address")}</label>}
        <Field>
          <FieldLabel htmlFor="recommendation-preview">{t(note ? "Case note" : "Details to share")}</FieldLabel>
          <Textarea ref={textRef} id="recommendation-preview" readOnly value={text} rows={10} className="min-h-56" />
        </Field>
      </FieldGroup>
      <div className="flex flex-col gap-2">
        <Button onClick={() => void copy()} disabled={!resources.length}><Copy data-icon="inline-start" aria-hidden="true" />{t(note ? "Copy case note" : "Copy resource list")}</Button>
        {!note && resources.length > 0 && <>
          <Button variant="outline" disabled={downloading} onClick={() => onDownload(includeAddress)}><Download data-icon="inline-start" aria-hidden="true" />{t(downloading ? "Preparing PDF…" : "Download resource list (PDF)")}</Button>
          <Button variant="outline" onClick={() => printResourceText(t("Resident recommendations"), text, locale)}><Printer data-icon="inline-start" aria-hidden="true" />{t("Print resources")}</Button>
          <a className={buttonVariants({ variant: "outline" })} href={email}><Mail data-icon="inline-start" aria-hidden="true" />{t("Open email app")}</a>
          <a className={buttonVariants({ variant: "outline" })} href={sms}><MessageSquare data-icon="inline-start" aria-hidden="true" />{t("Open text app")}</a>
        </>}
      </div>
      <p role="status" className="text-sm text-primary">{t(status)}</p>
      <p className="text-sm leading-relaxed text-muted-foreground">{t("Resident needs and conversation history are not included. Store and share securely.")}</p>
    </div>
  );
}
