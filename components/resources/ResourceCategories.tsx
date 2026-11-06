"use client";

import { ArrowDown, Check, Layers, Wifi, Laptop, GraduationCap } from "lucide-react";
import { useLanguage } from "@/components/chat/LanguageProvider";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { categoryCounts, CATEGORY_LABELS, type Resource, type ResourceCategory } from "@/lib/resource-finder";
import type { ResourceFocus } from "@/lib/resident-needs";
export type { ResourceFocus } from "@/lib/resident-needs";
const icons = { internet: Wifi, devices: Laptop, skills: GraduationCap };

export default function ResourceCategories({ resources, focus, onFocusChange, onJump, onDone }: {
  resources: Resource[];
  focus: ResourceFocus;
  onFocusChange: (focus: ResourceFocus) => void;
  onJump: (category: ResourceCategory) => void;
  onDone: () => void;
}) {
  const { t } = useLanguage();
  const counts = categoryCounts(resources);
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-3">
        <h3 id="browse-scope" className="text-sm font-semibold">{t("Show resource types")}</h3>
        <ToggleGroup orientation="vertical" value={[focus]} onValueChange={(value) => onFocusChange((value[0] as ResourceFocus | undefined) ?? "all")} aria-labelledby="browse-scope" className="bace-scope-options">
          {[{ category: "all", label: "All resources", icon: Layers }, ...counts.map(({ category }) => ({ category, label: CATEGORY_LABELS[category], icon: icons[category] }))].map(({ category, label, icon: Icon }) => (
            <ToggleGroupItem key={category} value={category} className="bace-scope-option">
              <Icon aria-hidden="true" />
              <span className="flex-1 text-left">{t(label)}</span>
              {focus === category && <Check aria-hidden="true" />}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("Your chat will focus on the resource types shown. Saved resources stay in your share list.")}</p>
      </div>
      {focus === "all" && (
        <nav aria-labelledby="browse-jump" className="flex flex-col gap-3 border-t border-border pt-5">
          <h3 id="browse-jump" className="text-sm font-semibold">{t("Jump to section")}</h3>
          {counts.map(({ category, count }) => (
            <a key={category} href={`#${category}`} className="bace-jump-link" onClick={(event) => { event.preventDefault(); onJump(category); }}>
              <span>{t(CATEGORY_LABELS[category])}</span>
              <span className="flex items-center gap-2 text-muted-foreground"><span className="tabular-nums">{count}</span><ArrowDown className="size-4" aria-hidden="true" /></span>
            </a>
          ))}
        </nav>
      )}
      <Button onClick={onDone}>{t("Show results")}</Button>
    </div>
  );
}
