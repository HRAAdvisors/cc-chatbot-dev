"use client";

import { useState } from "react";
import { Copy, ExternalLink, Wifi, Laptop, GraduationCap, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useLanguage } from "@/components/chat/LanguageProvider";
import {
  CATEGORY_LABELS,
  priceLabel,
  resourceText,
  resourceDetails,
  serviceLocationLabel,
  type Resource,
  type ResourceCategory,
} from "@/lib/resource-finder";
import { speedUseGuidance, toNumber } from "@/lib/plan-utils";

export type ResourceSort = "price" | "speed" | "distance" | "name";
export const SORT_OPTIONS: Record<ResourceCategory, Array<{ value: ResourceSort; label: string }>> = {
  internet: [{ value: "price", label: "Cheapest first" }, { value: "speed", label: "Fastest first" }, { value: "name", label: "Name: A to Z" }],
  devices: [{ value: "distance", label: "Nearest first" }, { value: "name", label: "Name: A to Z" }],
  skills: [{ value: "distance", label: "Nearest first" }, { value: "name", label: "Name: A to Z" }],
};
export const defaultSort = (category: ResourceCategory): ResourceSort => SORT_OPTIONS[category][0].value;

export function sortResources(resources: Resource[], sort: ResourceSort) {
  return resources.slice().sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "speed") return ((toNumber(b.plan?.downloadMbps ?? "") ?? -1) - (toNumber(a.plan?.downloadMbps ?? "") ?? -1)) || a.name.localeCompare(b.name);
    const first = sort === "price" ? toNumber(a.plan?.price ?? "") : a.service?.distanceMiles;
    const second = sort === "price" ? toNumber(b.plan?.price ?? "") : b.service?.distanceMiles;
    return ((first ?? Infinity) - (second ?? Infinity)) || a.name.localeCompare(b.name);
  });
}

export function SortSelect({ category, value, onChange }: { category: ResourceCategory; value: ResourceSort; onChange: (sort: ResourceSort) => void }) {
  const { t } = useLanguage();
  return (
    <label className="bace-sort">
      <span className="text-sm text-muted-foreground">{t("Sort")}</span>
      <select aria-label={`${t("Sort resources")}: ${t(CATEGORY_LABELS[category])}`} value={value} onChange={(event) => onChange(event.target.value as ResourceSort)}>
        {SORT_OPTIONS[category].map((option) => <option key={option.value} value={option.value}>{t(option.label)}</option>)}
      </select>
    </label>
  );
}

export default function ResourceSection({
  idPrefix = "",
  category,
  resources,
  selected,
  onToggle,
  onShare,
  onReport,
}: {
  idPrefix?: string;
  category: ResourceCategory;
  resources: Resource[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onShare: (resource: Resource) => void;
  onReport: (resource: Resource) => void;
}) {
  const { t } = useLanguage();
  const CategoryIcon = category === "internet" ? Wifi : category === "devices" ? Laptop : GraduationCap;
  const [expanded, setExpanded] = useState(false);
  const [budget, setBudget] = useState("");
  const [noContract, setNoContract] = useState(false);
  const [sort, setSort] = useState<ResourceSort>(defaultSort(category));
  const filtered = resources.filter(
    ({ plan }) =>
      !plan ||
      ((!budget ||
        (toNumber(plan.price) !== null &&
          toNumber(plan.price)! <= Number(budget))) &&
        (!noContract || plan.contract === "N")),
  );
  const ordered = sortResources(filtered, sort);
  const shown = expanded ? ordered : ordered.slice(0, 4);
  return (
    <section
      id={`${idPrefix}${category}`}
      aria-labelledby={`${idPrefix}${category}-title`}
      className="finder-resource-section scroll-mt-6"
      data-category={category}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={`${idPrefix}${category}-title`} tabIndex={-1} className="flex items-center gap-2 text-base font-semibold focus:outline-none">
            <CategoryIcon className="size-4 shrink-0" aria-hidden="true" />
            {t(CATEGORY_LABELS[category])}
            <span className="text-sm font-normal tabular-nums text-muted-foreground">{resources.length}</span>
          </h2>
          {resources.length > 1 && <SortSelect category={category} value={sort} onChange={setSort} />}
        </div>
        {category === "internet" && resources.length > 0 && (
          <details className="rounded-lg border border-border bg-card px-4 py-3 text-card-foreground">
            <summary className="cursor-pointer text-sm font-medium">
              {t("Filter plans")}
            </summary>
            <div className="pt-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor={`${idPrefix}plan-budget`}>
                    {t("Maximum monthly price")}
                  </FieldLabel>
                  <select
                    id={`${idPrefix}plan-budget`}
                    value={budget}
                    onChange={(event) => {
                      setBudget(event.target.value);
                      setExpanded(false);
                    }}
                    className="min-h-11 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                  >
                    <option value="">{t("Any price")}</option>
                    {[25, 50, 75, 100].map((value) => (
                      <option key={value} value={value}>
                        ${value}
                      </option>
                    ))}
                  </select>
                </Field>
                <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={noContract}
                    onChange={(event) => {
                      setNoContract(event.target.checked);
                      setExpanded(false);
                    }}
                    className="size-4 accent-primary"
                  />
                  {t("Only plans without a contract")}
                </label>
              </FieldGroup>
            </div>
          </details>
        )}
        {!filtered.length ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{t("No matches to show")}</EmptyTitle>
              <EmptyDescription>
                {t(
                  resources.length
                    ? "Try removing your filters. Other categories are still available below."
                    : "No matching records were returned for this category. Try another address or contact a local provider.",
                )}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="bace-resource-grid grid gap-4 sm:grid-cols-2">
            {shown.map((resource) => (
              <ResourceRow
                key={resource.id}
                resource={resource}
                selected={selected.has(resource.id)}
                onToggle={() => onToggle(resource.id)}
                onShare={() => onShare(resource)}
                onReport={() => onReport(resource)}
              />
            ))}
          </ul>
        )}
        {filtered.length > 4 && (
          <div>
            <Button
              variant="outline"
              onClick={() => setExpanded((value) => !value)}
              aria-expanded={expanded}
            >
              {expanded
                ? t("Show fewer")
                : t("Show all {count} options", { count: filtered.length })}
            </Button>
          </div>
        )}
        {(budget || noContract) && (
          <p className="text-sm text-muted-foreground">
            {t("Filters change the list, not your selected shortlist.")}
          </p>
        )}
      </div>
    </section>
  );
}

export function ResourceRow({
  resource,
  selected,
  onToggle,
  onShare,
  onReport,
  onDismiss,
}: {
  resource: Resource;
  selected: boolean;
  onToggle: () => void;
  onShare: () => void;
  onReport: () => void;
  onDismiss?: () => void;
}) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const plan = resource.plan;
  const service = resource.service;
  const useLine = plan ? speedUseGuidance(plan.downloadMbps, plan.uploadMbps) : null;
  async function copy() {
    try {
      await navigator.clipboard.writeText(resourceText(resource, t));
      setCopied(true);
    } catch {
      onShare();
    }
  }
  return (
    <li className="min-w-0">
      <article aria-label={resource.name} className="h-full">
        <Card className="resource-card h-full [--card-spacing:--spacing(4)]" data-selected={selected}>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <CardTitle><h3 className="text-pretty">{resource.name}</h3></CardTitle>
                <CardDescription>
                  {plan ? t(plan.technology) : service ? serviceLocationLabel(service, t) : null}
                </CardDescription>
              </div>
              {plan && (
                <div className="flex flex-col gap-1 text-right">
                  <p className="text-2xl font-semibold tracking-tight tabular-nums">
                    {priceLabel(plan.price) || t("Price not listed")}
                    <span className="text-sm font-normal tracking-normal text-muted-foreground">{plan.price.trim() ? t("/mo") : ""}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">{plan.downloadMbps} Mbps {t("download")}</p>
                </div>
              )}
              {onDismiss && <Button size="icon-sm" variant="ghost" className="bace-card-dismiss -mt-1 -mr-2 shrink-0" onClick={onDismiss} aria-label={t("Remove {name} from results", { name: resource.name })} title={t("Remove from results")}><X aria-hidden="true" /></Button>}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {plan && useLine && <p className="bace-plan-use text-sm leading-relaxed">{t(useLine)}</p>}
              {service?.description && (
                <div className="flex flex-col gap-1 text-sm leading-relaxed">
                  <p className="font-semibold text-muted-foreground">{t("About this program")}</p>
                  <p className="text-pretty">{t(service.description)}</p>
                </div>
              )}
              {plan?.lowIncome === "Y" && (
                <p className="text-sm leading-relaxed text-muted-foreground">{t("Income-based discount")}</p>
              )}
              <details>
                <summary className="cursor-pointer text-sm font-medium text-primary">{t("View details")}</summary>
                <div className="pt-4">
                  <div className="flex flex-col gap-4">
                    <dl className="flex flex-col gap-3 text-sm leading-relaxed">
                      {resourceDetails(resource, t)
                        .filter(({ label }) => !["About this program", "Access", "Distance"].includes(label))
                        .map(({ label, value }) => (
                          <div key={label} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                            <dt className="font-semibold text-muted-foreground">{t(label)}:</dt>
                            <dd className="min-w-0 break-words">{value}</dd>
                          </div>
                        ))}
                    </dl>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => void copy()}>
                        <Copy data-icon="inline-start" aria-hidden="true" />{t(copied ? "Copied" : "Copy details")}
                      </Button>
                      <Button size="sm" variant="outline" onClick={onShare}>{t("Review share list")}</Button>
                    </div>
                  </div>
                </div>
              </details>
            </div>
          </CardContent>
          <CardFooter className="flex-wrap justify-between gap-3">
            <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={selected} onChange={onToggle} className="size-4 shrink-0 accent-primary" />
              {t(selected ? "In resident's list" : "Add to list")}
              <span className="sr-only">: {resource.name}</span>
            </label>
            {resource.url && (
              <a href={resource.url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "ghost", size: "lg" })}>
                {t(plan ? "Visit provider" : "Program website")}
                <ExternalLink data-icon="inline-end" aria-hidden="true" />
              </a>
            )}
            <button type="button" className="bace-card-report" onClick={onReport}>{t("Report a problem")}<span className="sr-only">: {resource.name}</span></button>
          </CardFooter>
          {copied && <span role="status" className="sr-only">{t("Details copied.")}</span>}
        </Card>
      </article>
    </li>
  );
}
