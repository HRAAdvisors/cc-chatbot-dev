"use client";

import { useState } from "react";
import { ArrowLeft, ClipboardCheck, GraduationCap, Laptop, ListChecks, MapPin, RotateCcw, Wifi, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/chat/LanguageProvider";
import { CATEGORIES, CATEGORY_LABELS, type Resource, type ResourceCategory } from "@/lib/resource-finder";
import { ResourceRow, SortSelect, defaultSort, sortResources, type ResourceSort } from "./ResourceSection";
import ShareActions from "./ShareActions";

const ICONS = { internet: Wifi, devices: Laptop, skills: GraduationCap } as const;

export interface TableGroup { id: string; address: string; resources: Resource[] }

export default function ResultsTable({ groups, selected, shortlist, hiddenKeys, dismissed, editable, needsApplied, onToggle, onShare, onReport, onDismiss, onRemoveCategory, onRestore, onPrint, onBack, onChangeAddress, onEditNeeds }: {
  groups: TableGroup[]; selected: Set<string>; shortlist: Resource[]; hiddenKeys: Set<string>; dismissed: Set<string>; editable: boolean; needsApplied: boolean;
  onToggle: (id: string) => void; onShare: (resource: Resource) => void; onReport: (resource: Resource) => void; onDismiss: (id: string) => void;
  onRemoveCategory: (groupId: string, category: ResourceCategory) => void; onRestore: () => void; onPrint: () => void; onBack?: () => void; onChangeAddress?: () => void; onEditNeeds?: () => void;
}) {
  const { t } = useLanguage();
  const [sorts, setSorts] = useState<Record<string, ResourceSort>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const removedCount = hiddenKeys.size + dismissed.size;
  const ordered = groups.slice().reverse();
  return (
    <section className="flex flex-col gap-6" aria-labelledby="table-title">
      <div className="bace-table-sharebar">
        <div className="flex min-w-0 items-center gap-3">
          <ListChecks className="size-5 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-sm font-medium"><span>{t("Resident's list")}</span> <span className="bace-count-pill">{shortlist.length}</span></p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {editable && removedCount > 0 && <Button size="sm" variant="ghost" onClick={onRestore}><RotateCcw data-icon="inline-start" aria-hidden="true" />{t("Restore removed ({count})", { count: removedCount })}</Button>}
          <ShareActions resources={shortlist} onPrint={onPrint} />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {onBack && <Button variant="link" size="sm" className="self-start px-0" onClick={onBack}><ArrowLeft data-icon="inline-start" aria-hidden="true" />{t("Back to conversation")}</Button>}
        <div className="flex items-center justify-between gap-3">
          <h1 id="table-title" tabIndex={-1} className="text-balance text-2xl font-semibold tracking-tight text-primary focus:outline-none">{t("Resources for this resident")}</h1>
          {onEditNeeds && <button type="button" className="bace-needs-icon" onClick={onEditNeeds} aria-haspopup="dialog" aria-label={t("Edit resident needs")} title={t("Edit resident needs")}>
            <ClipboardCheck className="size-5" aria-hidden="true" />
            {needsApplied && <span className="bace-needs-icon-dot" aria-hidden="true" />}
          </button>}
        </div>
      </div>
      {ordered.map((group, groupIndex) => {
        const visible = CATEGORIES.filter((category) => !hiddenKeys.has(`${group.id}:${category}`));
        return <section key={group.id} className="bace-table-group" aria-labelledby={`table-group-${group.id}`}>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 id={`table-group-${group.id}`} className="flex items-center gap-2 text-base font-semibold"><MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="min-w-0 break-words">{group.address}</span></h2>
            {groupIndex === 0 && onChangeAddress && <button type="button" className="bace-inline-action" onClick={onChangeAddress}>{t("Change address")}</button>}
            {groupIndex > 0 && <span className="text-sm text-muted-foreground">{t("Earlier search")}</span>}
          </div>
          {!visible.length ? <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border p-6">
            <p className="text-sm text-muted-foreground">{t("All categories were removed.")}</p>
            {editable && <Button variant="outline" onClick={onRestore}>{t("Restore removed ({count})", { count: removedCount })}</Button>}
          </div> : <div className="bace-table-columns" data-count={visible.length}>
            {visible.map((category) => {
              const Icon = ICONS[category];
              const key = `${group.id}:${category}`;
              const sort = sorts[key] ?? defaultSort(category);
              const items = sortResources(group.resources.filter((resource) => resource.category === category && !dismissed.has(resource.id)), sort);
              const open = expanded.has(key);
              const shown = open ? items : items.slice(0, 5);
              return <section key={category} data-category={category} className="bace-table-column" aria-labelledby={`table-${group.id}-${category}`}>
                <header className="bace-table-column-head">
                  <h3 id={`table-${group.id}-${category}`} {...(groupIndex === 0 ? { "data-latest-category": category } : {})} className="flex items-center gap-2 text-base font-semibold text-primary"><Icon className="size-5 shrink-0" aria-hidden="true" /><span className="min-w-0 flex-1">{t(CATEGORY_LABELS[category])}</span><span className="bace-column-count">{items.length}</span></h3>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {items.length > 1 ? <SortSelect category={category} value={sort} onChange={(next) => setSorts((current) => ({ ...current, [key]: next }))} /> : <span />}
                    {editable && <Button size="sm" variant="ghost" className="bace-column-remove" onClick={() => onRemoveCategory(group.id, category)} aria-label={t("Remove {category} from the list", { category: t(CATEGORY_LABELS[category]) })}><X data-icon="inline-start" aria-hidden="true" />{t("Remove")}</Button>}
                  </div>
                </header>
                {!items.length ? <p className="px-1 text-sm leading-relaxed text-muted-foreground">{t(category === "internet" ? "No plans were confirmed for this address. Check with a provider." : "No matches in this category.")}</p>
                  : <ul className="flex flex-col gap-3">{shown.map((resource) => <ResourceRow key={resource.id} resource={resource} selected={selected.has(resource.id)} onToggle={() => onToggle(resource.id)} onShare={() => onShare(resource)} onReport={() => onReport(resource)} onDismiss={editable ? () => onDismiss(resource.id) : undefined} />)}</ul>}
                {items.length > 5 && <Button variant="outline" size="sm" aria-expanded={open} onClick={() => setExpanded((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; })}>{open ? t("Show fewer") : t("Show all {count} options", { count: items.length })}</Button>}
              </section>;
            })}
          </div>}
        </section>;
      })}
    </section>
  );
}
