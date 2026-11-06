"use client";

import { Wifi, Laptop, GraduationCap, ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/components/chat/LanguageProvider";

const suggestions = [
  { icon: Wifi, title: "Affordable internet", prompt: "Help me find low-cost internet for my client." },
  { icon: Laptop, title: "A computer or tablet", prompt: "Help me find a free or low-cost computer for my client." },
  { icon: GraduationCap, title: "Digital skills", prompt: "Help me find computer classes for my client." },
];

export default function ResourceTopics({ onChoose }: { onChoose: (prompt: string) => void }) {
  const { t } = useLanguage();
  return (
    <nav aria-label={t("Suggested questions")} className="bace-suggestions">
      {suggestions.map(({ icon: Icon, title, prompt }) => (
        <button type="button" key={title} className="bace-suggestion" onClick={() => onChoose(t(prompt))}>
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          <span>{t(title)}</span>
          <ArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
        </button>
      ))}
    </nav>
  );
}
