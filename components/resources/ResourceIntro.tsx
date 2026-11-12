"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { MapPin, ArrowRight } from "lucide-react";
import { useLanguage } from "@/components/chat/LanguageProvider";
import { Button } from "@/components/ui/button";

export default function ResourceIntro({ onTour, heading }: { onTour: () => void; heading?: ReactNode }) {
  const { t } = useLanguage();
  return (
    <div className="bace-about-content">
      <div className="bace-about-image"><Image src="/images/clark-county-valley.png" alt={t("A view of the Las Vegas Valley and surrounding mountains.")} fill sizes="(max-width: 639px) 100vw, 400px" className="object-cover" /></div>
      <div className="flex flex-1 flex-col items-start justify-center gap-5 p-6 sm:p-8">
        {heading ?? <span className="bace-location"><MapPin className="size-4" aria-hidden="true" />{t("Clark County, Nevada")}</span>}
        <h3 className="text-balance text-3xl font-medium tracking-tight">{t("Local help. Wider possibilities.")}</h3>
        <p className="text-pretty text-base leading-relaxed">{t("BACE Hub helps staff and community partners connect Clark County residents with internet plans, free or low-cost device access, and digital skills training.")}</p>
        <p className="text-pretty text-base leading-relaxed">{t("Search an address, ask questions, compare options, and share a tailored resource list. Providers confirm cost, availability, and eligibility.")}</p>
        <Button onClick={onTour}>{t("Start tour")}<ArrowRight data-icon="inline-end" aria-hidden="true" /></Button>
      </div>
    </div>
  );
}
