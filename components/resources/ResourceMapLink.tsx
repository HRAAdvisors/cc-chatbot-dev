"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Map as MapIcon } from "lucide-react";
import { useLanguage } from "@/components/chat/LanguageProvider";
import { useResourceMapSession, type ResourceMapSession } from "./useResourceMapSession";
import { resourcesFromLookup } from "@/lib/resource-finder";
import { mappedIdsFromResources } from "@/lib/resource-map";

export function useOpenResourceMap(snapshot: ResourceMapSession, disabled = false) {
  const router = useRouter();
  const { mutate } = useResourceMapSession();
  const resources = snapshot.result ? resourcesFromLookup(snapshot.result) : [];
  const selectedCount = mappedIdsFromResources(resources.filter((resource) => snapshot.selected.includes(resource.id))).size;
  const count = selectedCount || mappedIdsFromResources(resources).size;
  const open = () => { if (!disabled) void mutate(snapshot, { revalidate: false }).then(() => router.push("/map")); };
  return { count, open };
}

export default function ResourceMapLink({ snapshot, disabled = false, variant = "rail" }: { snapshot: ResourceMapSession; disabled?: boolean; variant?: "rail" | "header" }) {
  const { t } = useLanguage();
  const { count, open } = useOpenResourceMap(snapshot, disabled);
  if (variant === "header") return (
    <Link href="/map" className="bace-header-link" aria-label={count ? t("Open resource map ({count} resources)", { count }) : t("Open resource map")} aria-disabled={disabled || undefined}
      onNavigate={(event) => { event.preventDefault(); open(); }}>
      {t("Map")}
    </Link>
  );
  return (
    <Link href="/map" className="bace-rail-action" aria-label={count ? t("Open resource map ({count} resources)", { count }) : t("Open resource map")} title={count ? t("Resource map ({count} resources)", { count }) : t("Resource map")} aria-disabled={disabled || undefined}
      onNavigate={(event) => { event.preventDefault(); open(); }}>
      <span className="relative flex size-6 items-center justify-center"><MapIcon className="size-5" aria-hidden="true" />{count > 0 && <span className="bace-selection-count" aria-hidden="true">{count}</span>}</span>
      <span>{t("Map")}</span>
    </Link>
  );
}
