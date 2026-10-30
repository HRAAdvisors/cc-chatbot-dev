"use client";

import Image from "next/image";
import { useLanguage } from "@/components/chat/LanguageProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const topics = [
  {
    title: "Internet plans",
    category: "internet",
    description: "Compare broadband options at your client’s address, including monthly prices, speeds, and income-based discounts.",
  },
  {
    title: "Digital skills training",
    category: "skills",
    description: "Explore classes and one-on-one support for everyday computer skills, online safety, and using digital services.",
  },
  {
    title: "Free or low-cost devices",
    category: "devices",
    description: "Find computer and tablet programs, borrowing options, and eligibility details to help your client get connected.",
  },
];

export default function ResourceTopics() {
  const { t } = useLanguage();

  return (
    <section aria-labelledby="resource-topics-title" className="flex flex-col gap-5">
      <h2 id="resource-topics-title" className="text-2xl font-semibold tracking-tight">
        {t("Ask me about:")}
      </h2>
      <ul className="flex flex-col gap-5 md:flex-row">
        {topics.map(({ title, category, description }) => (
          <li key={title} data-category={category} className="min-w-0 flex-1">
            <Card className="h-full rounded-3xl pt-0 shadow-sm [--card-spacing:--spacing(6)]">
              <div className="relative aspect-[8/5] w-full overflow-hidden">
                <Image
                  src={category === "skills" ? "/images/senior-computer-class.jpg" : `/images/topic-${category}.png`}
                  alt=""
                  fill
                  sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1023px) 30vw, 307px"
                  className="object-cover"
                />
              </div>
              <CardHeader>
                <CardTitle>
                  <h3 className="text-pretty text-lg font-semibold">{t(title)}</h3>
                </CardTitle>
              </CardHeader>
              <CardContent className="-mt-2">
                <p className="text-pretty text-base leading-relaxed text-muted-foreground">{t(description)}</p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
