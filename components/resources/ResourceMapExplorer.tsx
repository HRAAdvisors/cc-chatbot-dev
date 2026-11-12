"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, ExternalLink, Layers, LocateFixed, MapPin, Search, Wifi } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LanguageLink, useLanguage } from "@/components/chat/LanguageProvider";
import { resourcesFromLookup, safeWebsite } from "@/lib/resource-finder";
import { filterMapEntries, mapIdsFromResources, type MapEntry, type MapCategory } from "@/lib/resource-map";
import { useResourceMapSession } from "./useResourceMapSession";
import ResourceMapCanvas from "./ResourceMapCanvas";

type MapScope = "auto" | "all" | "search";
const categoryLabels = { devices: "Device access", skills: "Digital skills training" };

export default function ResourceMapExplorer({ entries }: { entries: MapEntry[] }) {
  const { t } = useLanguage();
  const { data: session } = useResourceMapSession();
  const [category, setCategory] = useState<MapCategory | "all">("all");
  const [scope, setScope] = useState<MapScope>("auto");
  const [onlySelectedChoice, setOnlySelectedChoice] = useState<boolean | null>(null);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [fitVersion, setFitVersion] = useState(0);
  const entryRefs = useRef(new Map<string, HTMLLIElement>());
  function activate(id: string) {
    setActiveId(id);
    requestAnimationFrame(() => entryRefs.current.get(id)?.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }));
  }
  const currentResources = useMemo(() => session?.result ? resourcesFromLookup(session.result) : [], [session]);
  const searchIds = useMemo(() => mapIdsFromResources(currentResources), [currentResources]);
  const selectedIds = useMemo(() => mapIdsFromResources(currentResources.filter((resource) => session?.selected.includes(resource.id))), [currentResources, session]);
  const selectedPinCount = entries.filter((entry) => entry.hasLocation && selectedIds.has(entry.id)).length;
  const effectiveScope = scope === "auto" ? session?.result ? "search" : "all" : scope;
  const onlySelected = selectedIds.size > 0 && (onlySelectedChoice ?? selectedPinCount > 0);
  const filtered = useMemo(() => filterMapEntries(entries, category, query, onlySelected ? selectedIds : effectiveScope === "search" ? searchIds : undefined), [entries, category, query, onlySelected, effectiveScope, searchIds, selectedIds]);
  const mapped = useMemo(() => filtered.filter((entry) => entry.hasLocation), [filtered]);
  const unmapped = useMemo(() => filtered.filter((entry) => !entry.hasLocation), [filtered]);
  const active = filtered.find((entry) => entry.id === activeId);

  function renderEntry(entry: MapEntry) {
    const website = safeWebsite(entry.url ?? undefined);
    const expanded = entry.id === activeId;
    return <li key={entry.id} ref={(node) => { if (node) entryRefs.current.set(entry.id, node); else entryRefs.current.delete(entry.id); }} className="bace-map-entry" data-active={expanded}>
      <button type="button" className="bace-map-entry-button" onClick={() => setActiveId(expanded ? null : entry.id)} aria-expanded={expanded}>
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="text-pretty text-base font-semibold">{entry.name}</span>
          <span className="flex flex-wrap gap-2">{entry.categories.map((type) => <span key={type} className="bace-map-type" data-category={type}>{t(categoryLabels[type])}</span>)}</span>
          <span className="text-sm leading-relaxed text-muted-foreground">{entry.remote ? t("Online or nationwide") : entry.address || t("Location not listed")}</span>
          {selectedIds.has(entry.id) && <span className="flex items-center gap-1 text-sm font-medium text-primary"><Check className="size-4" aria-hidden="true" />{t("In your share list")}</span>}
        </span>
        <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
      </button>
      {expanded && <div className="flex flex-col gap-3 border-t border-border p-4">
        {entry.description && <p className="text-sm leading-relaxed">{t(entry.description)}</p>}
        {entry.languages && <p className="text-sm"><strong className="font-medium">{t("Languages")}:</strong> {t(entry.languages)}</p>}
        {entry.phone && <p className="text-sm"><strong className="font-medium">{t("Phone")}:</strong> {entry.phone}</p>}
        <p className="text-sm leading-relaxed text-muted-foreground">{t("Confirm cost, eligibility, hours, and availability directly with the program.")}</p>
        <div className="flex flex-wrap gap-2">
          {entry.hasLocation && <a className={buttonVariants({ variant: "outline", size: "sm" })} href={`https://www.google.com/maps/search/?api=1&query=${entry.lat},${entry.long}`} target="_blank" rel="noopener noreferrer">{t("Directions")}<ExternalLink data-icon="inline-end" aria-hidden="true" /></a>}
          {website && <a className={buttonVariants({ variant: "outline", size: "sm" })} href={website} target="_blank" rel="noopener noreferrer">{t("Program website")}<ExternalLink data-icon="inline-end" aria-hidden="true" /></a>}
        </div>
      </div>}
    </li>;
  }

  return <div className="resource-finder bace-map-page bg-background font-sans text-foreground">
    <header className="bace-header">
      <Link href="/" aria-label={t("BACE Hub home")} className="bace-brand"><Wifi className="size-5" aria-hidden="true" /><span>BACE Hub</span></Link>
      <nav aria-label={t("Workspace tools")} className="bace-header-nav"><Link href="/" className="bace-header-link"><ArrowLeft className="size-4" aria-hidden="true" />{t(session?.result ? "Back to results" : "Back to search")}</Link><LanguageLink className="bace-header-link" /></nav>
    </header>
    <main className="bace-map-main">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2"><span className="bace-location"><MapPin className="size-4" aria-hidden="true" />{t("Clark County, Nevada")}</span><h1 className="text-3xl font-medium tracking-tight">{t("Resource map")}</h1><p className="text-sm leading-relaxed text-muted-foreground">{t("Explore listed device-access and training resources. Locations are not service coverage areas.")}</p></div>
        <Button variant="outline" onClick={() => setFitVersion((value) => value + 1)}><LocateFixed data-icon="inline-start" aria-hidden="true" />{t("Fit locations")}</Button>
      </div>
      <div className="bace-map-filters">
        <Field className="bace-map-search"><FieldLabel htmlFor="map-keyword" className="sr-only">{t("Search resources by name, area, or keyword")}</FieldLabel><div className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" aria-hidden="true" /><input id="map-keyword" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Search names, areas, or keywords…")} className="min-h-11 w-full rounded-xl border border-input bg-background py-2 pl-10 pr-3 text-sm text-foreground" /></div></Field>
        <ToggleGroup value={[category]} onValueChange={(values) => setCategory((values[0] as MapCategory | "all" | undefined) ?? "all")} variant="outline" size="sm" aria-label={t("Resource types on the map")} className="bace-map-toggle">
          <ToggleGroupItem value="all">{t("All types")}</ToggleGroupItem><ToggleGroupItem value="devices">{t("Device access")}</ToggleGroupItem><ToggleGroupItem value="skills">{t("Digital skills training")}</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup value={[effectiveScope]} onValueChange={(values) => setScope((values[0] as MapScope | undefined) ?? "all")} variant="outline" size="sm" aria-label={t("Map resource scope")} className="bace-map-toggle">
          <ToggleGroupItem value="all">{t("Entire directory")}</ToggleGroupItem><ToggleGroupItem value="search" disabled={!session?.result}>{t("Current search")}</ToggleGroupItem>
        </ToggleGroup>
        <button type="button" role="switch" aria-checked={onlySelected} disabled={!selectedIds.size} onClick={() => setOnlySelectedChoice(!onlySelected)} className="bace-map-switch">
          <span className="bace-map-switch-track" aria-hidden="true"><span className="bace-map-switch-thumb" /></span>
          <span>{t("Show only selected resources")} ({selectedPinCount})</span>
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm leading-relaxed">
        <p role="status">{t("{mapped} mapped · {unmapped} online or without coordinates", { mapped: mapped.length, unmapped: unmapped.length })}</p>
        <p className="text-muted-foreground">{t("Internet plans are address-based and are not mapped.")}</p>
      </div>
      <div className="bace-map-layout">
        <section className="bace-map-geography" aria-label={t("Resource locations")}>
          <ResourceMapCanvas entries={mapped} selected={selectedIds} activeId={activeId} onActive={activate} fitVersion={fitVersion} />
          <div className="bace-map-legend" aria-label={t("Map legend")}><span data-category="devices"><span className="bace-map-dot" />{t("Device access")}</span><span data-category="skills"><span className="bace-map-dot" />{t("Digital skills training")}</span><span><span className="bace-map-dot" />{t("Both types")}</span></div>
          <p className="text-sm leading-relaxed text-muted-foreground">{t("Markers show directory locations, not guaranteed coverage. No resident address is placed on the map.")}</p>
        </section>
        <aside className="bace-map-results" aria-label={t("Map resource list")}>
          {!filtered.length && <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border p-5"><Layers className="size-6 text-primary" aria-hidden="true" /><h2 className="text-base font-semibold">{t("No resources in this view")}</h2><p className="text-sm leading-relaxed text-muted-foreground">{t("Change the resource type, clear the search, or switch to the entire directory.")}</p><Button variant="outline" onClick={() => { setScope("all"); setOnlySelectedChoice(false); setCategory("all"); setQuery(""); }}>{t("Show entire directory")}</Button></div>}
          {mapped.length > 0 && <section className="flex flex-col gap-3"><h2 className="text-sm font-semibold">{t("Map locations")} ({mapped.length})</h2><ul className="flex flex-col gap-3">{mapped.map(renderEntry)}</ul></section>}
          {unmapped.length > 0 && <details open={!mapped.length} className="bace-map-online"><summary className="cursor-pointer text-sm font-semibold">{t("Online or no mapped location")} ({unmapped.length})</summary><p className="py-3 text-sm leading-relaxed text-muted-foreground">{t("These resources have no usable map coordinates. We do not invent a location or service area.")}</p><ul className="flex flex-col gap-3">{unmapped.map(renderEntry)}</ul></details>}
          {active && !active.hasLocation && <span className="sr-only" role="status">{t("This resource has no mapped location.")}</span>}
        </aside>
      </div>
    </main>
  </div>;
}
