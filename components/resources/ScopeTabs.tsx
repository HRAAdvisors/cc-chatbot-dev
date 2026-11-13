"use client";

import { Wifi, Laptop, GraduationCap, Layers } from "lucide-react";
import { useLanguage } from "@/components/chat/LanguageProvider";
import { CATEGORY_LABELS } from "@/lib/resource-finder";
import type { ResourceFocus } from "@/lib/resident-needs";

const OPTIONS = [
  { value: "all" as const, label: "All resources", icon: Layers },
  { value: "internet" as const, label: CATEGORY_LABELS.internet, icon: Wifi },
  { value: "devices" as const, label: CATEGORY_LABELS.devices, icon: Laptop },
  { value: "skills" as const, label: CATEGORY_LABELS.skills, icon: GraduationCap },
];

// Inline resource-type filter (same icons as the Browse tab) shown above the results.
export default function ScopeTabs({ focus, onChange }: { focus: ResourceFocus; onChange: (focus: ResourceFocus) => void }) {
  const { t } = useLanguage();
  return (
    <div role="group" aria-label={t("Show resource types")} className="bace-scope-tabs">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button key={value} type="button" className="bace-scope-tab" aria-pressed={focus === value} onClick={() => onChange(value)}>
          <Icon className="size-4 shrink-0" aria-hidden="true" />{t(label)}
        </button>
      ))}
    </div>
  );
}
