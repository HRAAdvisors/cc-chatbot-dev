"use client";

import { useState } from "react";
import { Share2, X, ArrowUpRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { useLanguage } from "@/components/chat/LanguageProvider";
import { CATEGORY_LABELS, type Resource } from "@/lib/resource-finder";
import type { ResourceFocus } from "@/lib/resident-needs";
import ShareRecommendations from "./ShareRecommendations";

export function SharePanel({ resources, address, focus, downloading, disabled, status, onRemove, onDownload }: {
  resources: Resource[]; address: string; focus: ResourceFocus; downloading: boolean; disabled: boolean; status: string;
  onRemove: (id: string) => void; onDownload: (includeAddress: boolean) => void;
}) {
  const { t } = useLanguage();
  const [preview, setPreview] = useState<"list" | "note" | null>(null);
  if (preview && resources.length) return <ShareRecommendations resources={resources} address={address} note={preview === "note"} downloading={downloading} onDownload={onDownload} onClose={() => setPreview(null)} />;
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm leading-relaxed text-muted-foreground">{t("Your handoff, your choice. Only resources you select are included.")}</p>
      {!resources.length ? <Empty className="border border-dashed border-border py-10"><EmptyHeader>
        <Share2 className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
        <EmptyTitle>{t("Your share list starts here")}</EmptyTitle>
        <EmptyDescription>{t("Select Add to share list on any resource. Come back here to review and send it.")}</EmptyDescription>
      </EmptyHeader></Empty> : <>
        <h3 className="text-sm font-semibold">{t("Selected resources")} ({resources.length})</h3>
        <ul className="flex flex-col gap-3">{resources.map((resource) => <li key={resource.id} className="flex items-start justify-between rounded-xl border border-border p-3">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-sm font-medium leading-relaxed">{resource.name}</p>
            <p className="text-sm text-muted-foreground">{t(CATEGORY_LABELS[resource.category])}</p>
            {focus !== "all" && focus !== resource.category && <p className="text-sm text-muted-foreground">{t("Saved from another view")}</p>}
          </div>
          <Button size="icon" variant="ghost" onClick={() => onRemove(resource.id)} aria-label={t("Remove {name} from share list", { name: resource.name })}><X aria-hidden="true" /></Button>
        </li>)}</ul>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("Changing your view never changes this list.")}</p>
        <div className="flex flex-col gap-2">
          <Button disabled={disabled} onClick={() => setPreview("list")}>{t("Prepare resource list")}<ArrowUpRight data-icon="inline-end" aria-hidden="true" /></Button>
          <Button variant="ghost" disabled={disabled} onClick={() => setPreview("note")}><FileText data-icon="inline-start" aria-hidden="true" />{t("Prepare case note")}</Button>
        </div>
      </>}
      <p role="status" className="text-sm text-primary">{t(status)}</p>
    </div>
  );
}
