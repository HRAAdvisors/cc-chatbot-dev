"use client";

import { Dialog } from "@base-ui/react/dialog";
import ResourceWalkthrough from "./ResourceWalkthrough";
import { CircleHelp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/chat/LanguageProvider";

export default function HowToUse({ variant = "ghost" }: { variant?: "ghost" | "outline" }) {
  const { t } = useLanguage();

  return (
    <Dialog.Root>
      <Dialog.Trigger render={<Button variant={variant} size="sm" />}>
        <CircleHelp data-icon="inline-start" aria-hidden="true" />
        {t("How to use this tool")}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-background/60 backdrop-blur-md" />
        <Dialog.Viewport className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Popup className="resource-finder flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card font-sans text-left text-card-foreground shadow-lg">
            <div className="shrink-0 border-b border-border p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <Dialog.Title className="text-xl font-semibold tracking-tight">{t("How to use this tool")}</Dialog.Title>
                  <Dialog.Description className="text-sm leading-relaxed text-muted-foreground">{t("Try it with example data. Your search stays unchanged.")}</Dialog.Description>
                </div>
                <Dialog.Close render={<Button variant="ghost" size="icon" />} aria-label={t("Close guide")}>
                  <X aria-hidden="true" />
                </Dialog.Close>
              </div>
            </div>
            <div className="flex min-h-0 flex-col p-5 sm:p-6">
              <ResourceWalkthrough />
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
