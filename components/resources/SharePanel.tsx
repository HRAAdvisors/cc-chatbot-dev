"use client";

import { useState } from "react";
import { ListChecks, MapPin, X, Table2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { useLanguage } from "@/components/chat/LanguageProvider";
import { CATEGORIES, CATEGORY_LABELS, addressClusters, type Resource } from "@/lib/resource-finder";
import type { ResourceFocus } from "@/lib/resident-needs";
import ShareRecommendations from "./ShareRecommendations";
import ShareActions from "./ShareActions";

export function SharePanel({ resources, address, focus, downloading, disabled, status, onRemove, onDownload, onPrint, onOpenTable }: {
  resources: Resource[]; address: string; focus: ResourceFocus; downloading: boolean; disabled: boolean; status: string;
  onRemove: (id: string) => void; onDownload: (includeAddress: boolean) => void; onPrint: () => void; onOpenTable?: () => void;
}) {
  const { t } = useLanguage();
  const [preview, setPreview] = useState(false);
  if (preview && resources.length) return <ShareRecommendations resources={resources} address={address} downloading={downloading} onDownload={onDownload} onClose={() => setPreview(false)} />;
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm leading-relaxed text-muted-foreground">{t("Only resources in this list are printed or shared.")}</p>
      {!resources.length ? <Empty className="border border-dashed border-border py-10"><EmptyHeader>
        <ListChecks className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
        <EmptyTitle>{t("The resident's list is empty")}</EmptyTitle>
        <EmptyDescription>{t("Select Add to list on any resource to build the list.")}</EmptyDescription>
      </EmptyHeader></Empty> : <div className="flex flex-col gap-5">
        {addressClusters(resources).map((cluster, index, clusters) => <div key={cluster.id} className="flex flex-col gap-3">
        {clusters.length > 1 && <p className="bace-list-address"><MapPin className="size-4 shrink-0" aria-hidden="true" /><span className="min-w-0 truncate">{cluster.address.split(",")[0] || t("Address {number}", { number: index + 1 })}</span></p>}
        {CATEGORIES.map((category) => {
          const items = cluster.resources.filter((resource) => resource.category === category);
          if (!items.length) return null;
          return <section key={category} data-category={category} className="bace-list-group" aria-labelledby={`list-${cluster.id}-${category}`}>
            <h3 id={`list-${cluster.id}-${category}`} className="bace-list-group-title">{t(CATEGORY_LABELS[category])}<span className="tabular-nums">{items.length}</span></h3>
            <ul className="flex flex-col">{items.map((resource) => <li key={resource.id} className="bace-list-item">
              <div className="flex min-w-0 flex-col">
                <p className="text-sm font-medium leading-relaxed">{resource.name}</p>
                {focus !== "all" && focus !== resource.category && <p className="text-sm text-muted-foreground">{t("Saved from another view")}</p>}
              </div>
              <Button size="icon" variant="ghost" className="shrink-0" onClick={() => onRemove(resource.id)} aria-label={t("Remove {name} from share list", { name: resource.name })}><X aria-hidden="true" /></Button>
            </li>)}</ul>
          </section>;
        })}
        </div>)}
      </div>}
      <ShareActions resources={resources} onPrint={onPrint} disabled={disabled} />
      <div className="flex flex-wrap gap-2">
        {onOpenTable && <Button variant="outline" size="sm" onClick={onOpenTable}><Table2 data-icon="inline-start" aria-hidden="true" />{t("Open full results")}</Button>}
        {resources.length > 0 && <Button variant="ghost" size="sm" disabled={disabled} onClick={() => setPreview(true)}><SlidersHorizontal data-icon="inline-start" aria-hidden="true" />{t("Preview and more options")}</Button>}
      </div>
      <p role="status" className="text-sm text-primary empty:hidden">{t(status)}</p>
    </div>
  );
}
