"use client";

import { useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/chat/LanguageProvider";
import ResourceIntro from "./ResourceIntro";
import ResourceWalkthrough from "./ResourceWalkthrough";

export default function HowToUse({ startTour = false }: { startTour?: boolean }) {
  const { t } = useLanguage();
  const [tourStarted, setTourStarted] = useState(startTour);
  const titleRef = useRef<HTMLHeadingElement>(null);
  return (
    <>
      {tourStarted ? (
        <div className="bace-guide-tour flex min-h-0 flex-col gap-5 p-5 sm:p-6">
          <Dialog.Title ref={titleRef} tabIndex={-1} className="pr-12 text-xl font-semibold tracking-tight focus:outline-none">{t("How to use this tool")}</Dialog.Title>
          <ResourceWalkthrough />
        </div>
      ) : (
        <ResourceIntro
          heading={<Dialog.Title className="text-sm font-semibold text-primary">{t("How to use this tool")}</Dialog.Title>}
          onTour={() => { setTourStarted(true); requestAnimationFrame(() => titleRef.current?.focus({ preventScroll: true })); }}
        />
      )}
      <Dialog.Close data-guide-close render={<Button size="icon" variant="ghost" className="bace-guide-close" />} aria-label={t("Close guide")}><X aria-hidden="true" /></Dialog.Close>
    </>
  );
}
