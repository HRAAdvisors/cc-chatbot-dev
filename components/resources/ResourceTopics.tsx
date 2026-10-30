"use client";

import { Globe, GraduationCap, Laptop } from "lucide-react";
import { useLanguage } from "@/components/chat/LanguageProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const topics = [
  {
    title: "Internet plans",
    category: "internet",
    icon: Globe,
    description: "Compare broadband options at your client’s address, including monthly prices, speeds, and income-based discounts.",
  },
  {
    title: "Digital skills training",
    category: "skills",
    icon: GraduationCap,
    description: "Explore classes and one-on-one support for everyday computer skills, online safety, and using digital services.",
  },
  {
    title: "Free or low-cost devices",
    category: "devices",
    icon: Laptop,
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
        {topics.map(({ title, category, icon: Icon, description }) => (
          <li key={title} data-category={category} className="min-w-0 flex-1">
            <Card className="h-full rounded-3xl shadow-sm [--card-spacing:--spacing(6)]">
              <CardHeader className="gap-5">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-[var(--topic-muted)] text-[var(--topic)]">
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                <CardTitle>
                  <h3 className="text-pretty text-lg font-semibold">{t(title)}</h3>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-pretty text-base leading-relaxed text-muted-foreground">{t(description)}</p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
