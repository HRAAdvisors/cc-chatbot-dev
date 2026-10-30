"use client";

import Image from "next/image";
import { useLanguage } from "@/components/chat/LanguageProvider";

export default function ResourceIntro() {
  const { t } = useLanguage();

  return (
    <section aria-labelledby="finder-intro-title" className="overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col md:flex-row">
        <div className="relative min-h-60 md:min-h-96 md:w-1/2 md:shrink-0">
          <Image
            src="/images/clark-county-valley.png"
            alt={t("A view of the Las Vegas Valley and surrounding mountains.")}
            fill
            sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1023px) calc((100vw - 64px) / 2), 480px"
            className="object-cover object-center"
          />
        </div>
        <div className="flex-1 p-7 sm:p-8 lg:p-10">
          <div className="flex flex-col items-start gap-5">
            <p className="text-sm font-semibold text-primary">{t("Clark County, Nevada")}</p>
            <h2 id="finder-intro-title" className="text-balance text-2xl font-semibold tracking-tight">{t("Local help. Wider possibilities.")}</h2>
            <dl className="flex max-w-lg flex-col gap-5 text-sm leading-relaxed">
              <div className="flex flex-col gap-1">
                <dt className="font-semibold text-foreground">{t("Nearby programs")}</dt>
                <dd className="text-muted-foreground">{t("Libraries and community organizations can offer computer access, device support, and hands-on learning close to home.")}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="font-semibold text-foreground">{t("Online or nationwide")}</dt>
                <dd className="text-muted-foreground">{t("Explore remote learning and programs with a wider reach. Delivery, eligibility, and in-person requirements vary by provider.")}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
