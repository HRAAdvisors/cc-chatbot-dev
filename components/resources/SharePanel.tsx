"use client";

import { Download, ListChecks, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { useLanguage } from "@/components/chat/LanguageProvider";
import { CATEGORIES, CATEGORY_LABELS, addressClusters, type Resource } from "@/lib/resource-finder";
import type { ResourceFocus } from "@/lib/resident-needs";
import ShareActions from "./ShareActions";

export function SharePanel({ resources, focus, downloading, disabled, status, onRemove, onDownload, onPrint }: {
  resources: Resource[]; focus: ResourceFocus; downloading: boolean; disabled: boolean; status: string;
  onRemove: (id: string) => void; onDownload: () => void; onPrint: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm leading-relaxed text-muted-foreground">{t("Share these resources with residents, print out these resources, or export a case note")}</p>
      {!resources.length ? <Empty className="border border-dashed border-border py-10"><EmptyHeader>
        <ListChecks className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
        <EmptyTitle>{t("The resident's list is empty")}</EmptyTitle>
        <EmptyDescription>{t("Select Share with resident on any resource to build the list.")}</EmptyDescription>
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
      <Button variant="outline" size="sm" className="self-start" disabled={disabled || downloading || !resources.length} onClick={onDownload}><Download data-icon="inline-start" aria-hidden="true" />{t(downloading ? "Preparing PDF…" : "Download resource list (PDF)")}</Button>
      <p role="status" className="text-sm text-primary empty:hidden">{t(status)}</p>
    </div>
  );
}
