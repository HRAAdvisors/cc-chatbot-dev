"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { ClipboardCheck } from "lucide-react";
import { useLanguage } from "@/components/chat/LanguageProvider";

const STARTERS = [
  { label: "Internet plans near me", prompt: "What low-cost internet plans are available near the resident?" },
  { label: "Cheap or free devices near me", prompt: "Where can the resident get a free or low-cost computer nearby?" },
  { label: "Digital skills training near me", prompt: "Where can the resident take free computer classes nearby?" },
] as const;

export default function ResourceHome({ input, feedback, onNeeds, onTour, onStarter, returnAction }: {
  input: ReactNode; feedback: ReactNode; needsApplied?: boolean; onNeeds: () => void; onTour: () => void; onStarter: (prompt: string) => void; returnAction?: ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <section aria-labelledby="finder-title" className="bace-home-content">
      <div className="bace-home-intro">
        <h1 id="finder-title" className="bace-home-title text-balance">{t("What does your resident need?")}</h1>
        <p className="bace-home-subtitle">{t("Internet plans · Devices · Digital skills help")}</p>
      </div>
      <div className="bace-home-search">
        {input}
        <p className="bace-home-helper">{t("Type an address to see nearby resources, ask the assistant a question or")}</p>
        {feedback}
        <button type="button" className="bace-needs-entry" onClick={onNeeds} aria-haspopup="dialog">
          <ClipboardCheck className="size-4 shrink-0" aria-hidden="true" />
          {t("Search by resident needs")}
        </button>
        {returnAction}
      </div>
      <article className="bace-tool-panel" aria-labelledby="tool-panel-title">
        <div className="bace-tool-photo"><Image src="/images/clark-county-valley.png" alt={t("A view of the Las Vegas Valley and surrounding mountains.")} fill loading="eager" sizes="(max-width: 767px) 100vw, 480px" className="object-cover" /></div>
        <div className="bace-tool-copy">
          <h2 id="tool-panel-title" className="bace-tool-title">{t("What this tool does")}</h2>
          <p className="bace-tool-text">
            {t("BACE Hub finds low-cost internet, free or low-cost devices, and digital skills help near a resident's address, then lets you print or send the list.")}{" "}
            <button type="button" className="bace-inline-tour" onClick={onTour}>{t("Take a tour")}</button>{t(", or start with one of these:")}
          </p>
          <nav aria-label={t("Start with a common question")} className="bace-tool-links">
            {STARTERS.map(({ label, prompt }) => (
              <button type="button" key={label} className="bace-text-link" onClick={() => onStarter(t(prompt))}>{t(label)} <span aria-hidden="true">→</span></button>
            ))}
          </nav>
        </div>
      </article>
    </section>
  );
}
