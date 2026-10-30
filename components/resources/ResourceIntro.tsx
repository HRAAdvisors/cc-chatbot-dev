"use client";

import Image from "next/image";
import { useLanguage } from "@/components/chat/LanguageProvider";
import { Button } from "@/components/ui/button";

export default function ResourceIntro({ onFeedback }: { onFeedback: () => void }) {
  const { t } = useLanguage();

  return (
    <footer aria-labelledby="finder-intro-title" className="w-full border-t border-border bg-card text-card-foreground">
      <div className="flex flex-col md:flex-row">
        <div className="relative min-h-44 md:min-h-60 md:w-1/3 md:shrink-0">
          <Image
            src="/images/clark-county-valley.png"
            alt={t("A view of the Las Vegas Valley and surrounding mountains.")}
            fill
            sizes="(max-width: 767px) 100vw, 33vw"
            className="object-cover object-center"
          />
        </div>
        <div className="flex-1 p-7 sm:p-8 lg:p-10">
          <div className="flex flex-col items-start gap-5">
            <p className="text-sm font-semibold text-primary">{t("Clark County, Nevada")}</p>
            <h2 id="finder-intro-title" className="text-balance text-2xl font-semibold tracking-tight">{t("Local help. Wider possibilities.")}</h2>
            <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
              {t("Have a suggestion or found something that needs fixing?")}
            </p>
            <Button variant="outline" onClick={onFeedback}>
              {t("Give feedback/report issues")}
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
}
