"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/chat/LanguageProvider";

export default function PrintDialog({ count, hasConversation, addressCount = 0, onClose, onPrint }: {
  count: number; hasConversation: boolean; addressCount?: number; onClose: () => void;
  onPrint: (options: { includeConversation: boolean; preparedBy: string; includeAddresses: boolean }) => Promise<void> | void;
}) {
  const { t } = useLanguage();
  const [choice, setChoice] = useState<"list" | "conversation">("list");
  const [preparedBy, setPreparedBy] = useState("");
  const [includeAddresses, setIncludeAddresses] = useState(false);
  const [busy, setBusy] = useState(false);
  const options = [
    { value: "list" as const, title: t("Selected resources only"), detail: t("{count} resources on one page", { count }) },
    { value: "conversation" as const, title: t("Resources and the conversation"), detail: t(hasConversation ? "Adds the questions and answers as a second page" : "No questions have been asked yet"), disabled: !hasConversation },
  ];
  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="bace-panel-backdrop" />
        <Dialog.Viewport className="bace-guide-viewport">
          <Dialog.Popup className="resource-finder bace-print-dialog font-sans">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <Dialog.Title className="text-xl font-semibold tracking-tight text-primary">{t("What should we print?")}</Dialog.Title>
                <Dialog.Description className="text-sm leading-relaxed text-muted-foreground">{t("The resident takes home only what you choose.")}</Dialog.Description>
              </div>
              <Dialog.Close render={<Button size="icon" variant="ghost" />} aria-label={t("Close")}><X aria-hidden="true" /></Dialog.Close>
            </div>
            <form className="flex flex-col gap-5" onSubmit={async (event) => { event.preventDefault(); setBusy(true); try { await onPrint({ includeConversation: choice === "conversation", preparedBy: preparedBy.trim(), includeAddresses }); } finally { setBusy(false); } }}>
              <fieldset className="flex flex-col gap-3">
                <legend className="sr-only">{t("What should we print?")}</legend>
                {options.map((option) => <label key={option.value} className="bace-print-option" data-checked={choice === option.value} data-disabled={option.disabled || undefined}>
                  <input type="radio" name="print-choice" value={option.value} checked={choice === option.value} disabled={option.disabled} onChange={() => setChoice(option.value)} className="size-4 accent-primary" />
                  <span className="flex flex-col"><span className="font-medium">{option.title}</span><span className="text-sm text-muted-foreground">{option.detail}</span></span>
                </label>)}
              </fieldset>
              {addressCount > 0 && <label className="bace-print-option" data-checked={includeAddresses}>
                <input type="checkbox" checked={includeAddresses} onChange={(event) => setIncludeAddresses(event.target.checked)} className="size-4 accent-primary" />
                <span className="flex flex-col"><span className="font-medium">{t(addressCount > 1 ? "Include the addresses" : "Include the address")}</span><span className="text-sm text-muted-foreground">{t(addressCount > 1 ? "Resources stay grouped by address either way. Without this, only the city and ZIP are shown." : "Without this, only the city and ZIP are shown.")}</span></span>
              </label>}
              <Field>
                <FieldLabel htmlFor="print-prepared-by">{t("Your first name (optional)")}</FieldLabel>
                <Input id="print-prepared-by" value={preparedBy} maxLength={40} autoComplete="given-name" onChange={(event) => setPreparedBy(event.target.value)} className="min-h-11" />
                <FieldDescription>{t("Shown on the printout so the resident knows who helped.")}</FieldDescription>
              </Field>
              <div className="flex flex-wrap justify-end gap-2">
                <Dialog.Close render={<Button variant="outline" />}>{t("Cancel")}</Dialog.Close>
                <Button type="submit" disabled={busy || !count}><Printer data-icon="inline-start" aria-hidden="true" />{t(busy ? "Preparing…" : "Print")}</Button>
              </div>
            </form>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
