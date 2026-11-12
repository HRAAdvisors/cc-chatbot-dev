"use client";

import { useRef, useState, type FormEvent } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/components/chat/LanguageProvider";
import { ISSUE_REASONS, type Resource } from "@/lib/resource-finder";

const REPORT_CHOICES = {
  "incorrect-details": ISSUE_REASONS["incorrect-details"],
  "broken-link": ISSUE_REASONS["broken-link"],
  unavailable: ISSUE_REASONS.unavailable,
  other: ISSUE_REASONS.other,
};

export default function ReportIssue({
  resource,
  onClose,
}: {
  resource?: Resource;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [reason, setReason] = useState(resource ? "incorrect-details" : "bug");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const reportId = useRef<string | null>(null);
  const sending = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError("");
    reportId.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/resource-issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: reportId.current,
          resourceKey: resource?.id || "general-feedback",
          resourceName: resource?.name || "General feedback",
          category: resource?.category || "general",
          reason,
          details,
        }),
      });
      if (!response.ok) throw new Error("Report failed");
      setSubmitted(true);
    } catch {
      setError("Your report was not saved. Please try again.");
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-foreground/40" />
        <Dialog.Popup className="resource-finder font-sans fixed top-1/2 left-1/2 max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-background p-5 text-foreground shadow-lg">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Dialog.Title className="text-xl font-semibold">
                {t(
                  submitted
                    ? "Report received"
                    : "Report a problem",
                )}
              </Dialog.Title>
              <Dialog.Description className="text-sm leading-relaxed text-muted-foreground">
                {submitted
                  ? t(
                      "Saved for staff review. Published resource details have not been changed.",
                    )
                  : resource?.name ||
                    t("Tell us about a problem with this tool.")}
              </Dialog.Description>
            </div>
            {submitted ? (
              <Dialog.Close render={<Button />}>{t("Done")}</Dialog.Close>
            ) : (
              <form onSubmit={submit}>
                <FieldGroup>
                  <fieldset className="flex flex-col gap-2" disabled={busy}>
                    <legend className="pb-2 text-sm font-medium">{t("What's wrong?")}</legend>
                    {Object.entries(
                      resource
                        ? REPORT_CHOICES
                        : { bug: "A bug in the tool", other: "Other feedback" },
                    ).map(([value, label]) => (
                      <label key={value} className="bace-print-option" data-checked={reason === value}>
                        <input type="radio" name="issue-reason" value={value} checked={reason === value} onChange={() => setReason(value)} className="size-4 accent-primary" />
                        <span className="text-sm font-medium">{t(label)}</span>
                      </label>
                    ))}
                  </fieldset>
                  <Field data-disabled={busy}>
                    <FieldLabel htmlFor="issue-details">
                      {t(resource ? "Details (optional)" : "Additional details")}
                    </FieldLabel>
                    <Textarea
                      id="issue-details"
                      disabled={busy}
                      value={details}
                      onChange={(event) => setDetails(event.target.value)}
                      maxLength={2000}
                      required={!resource}
                      rows={4}
                      aria-describedby="issue-privacy"
                    />
                    <FieldDescription id="issue-privacy">
                      {t(
                        "Do not include resident names, addresses, or other personal information.",
                      )}
                    </FieldDescription>
                  </Field>
                  {error && (
                    <p role="alert" className="text-sm text-destructive">
                      {t(error)}
                    </p>
                  )}
                  <p className="rounded-xl bg-accent px-4 py-3 text-sm leading-relaxed">
                    {t("The hub team reviews reports within 2 business days.")}
                  </p>
                  <div className="flex justify-end gap-2">
                    <Dialog.Close
                      disabled={busy}
                      render={<Button variant="outline" />}
                    >
                      {t("Cancel")}
                    </Dialog.Close>
                    <Button type="submit" disabled={busy}>
                      {t(busy ? "Sending…" : "Send to the hub team")}
                    </Button>
                  </div>
                </FieldGroup>
              </form>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
