"use client";

import { useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
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
import { toNumber } from "@/lib/plan-utils";

export default function ResourceSection({
  category,
  resources,
  selected,
  onToggle,
  onShare,
  onReport,
}: {
  category: ResourceCategory;
  resources: Resource[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onShare: (resource: Resource) => void;
  onReport: (resource: Resource) => void;
}) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [budget, setBudget] = useState("");
  const [noContract, setNoContract] = useState(false);
  const [sort, setSort] = useState("default");
  const filtered = resources.filter(
    ({ plan }) =>
      !plan ||
      ((!budget ||
        (toNumber(plan.price) !== null &&
          toNumber(plan.price)! <= Number(budget))) &&
        (!noContract || plan.contract === "N")),
  );
  const ordered = sort === "default" ? filtered : filtered.slice().sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    const first = sort === "price" ? toNumber(a.plan?.price ?? "") : a.service?.distanceMiles;
    const second = sort === "price" ? toNumber(b.plan?.price ?? "") : b.service?.distanceMiles;
    return ((first ?? Infinity) - (second ?? Infinity)) || a.name.localeCompare(b.name);
  });
  const shown = expanded ? ordered : ordered.slice(0, 3);
  return (
    <section
      id={category}
      aria-labelledby={`${category}-title`}
      className="finder-resource-section scroll-mt-6"
      data-category={category}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={`${category}-title`} tabIndex={-1} className="flex items-center gap-3 text-xl font-medium tracking-tight focus:outline-none">
            {t(CATEGORY_LABELS[category])}
            <span className="text-sm font-normal tabular-nums text-muted-foreground">{resources.length}</span>
          </h2>
          {resources.length > 1 && <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="sr-only">{t("Sort resources")}: {t(CATEGORY_LABELS[category])}</span>
            <select aria-label={`${t("Sort resources")}: ${t(CATEGORY_LABELS[category])}`} value={sort} onChange={(event) => setSort(event.target.value)} className="min-h-10 max-w-44 rounded-lg border-0 bg-background px-2 text-sm text-muted-foreground">
              <option value="default">{t("Default order")}</option>
              <option value={category === "internet" ? "price" : "distance"}>{t(category === "internet" ? "Price: low to high" : "Distance: nearest first")}</option>
              <option value="name">{t("Name: A to Z")}</option>
            </select>
          </label>}
        </div>
        {category === "internet" && resources.length > 0 && (
          <details className="rounded-lg border border-border bg-card px-4 py-3 text-card-foreground">
            <summary className="cursor-pointer text-sm font-medium">
              {t("Filter plans")}
            </summary>
            <div className="pt-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="plan-budget">
                    {t("Maximum monthly price")}
                  </FieldLabel>
                  <select
                    id="plan-budget"
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
          <ul className="flex flex-col gap-3">
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
        {filtered.length > 3 && (
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

function ResourceRow({
  resource,
  selected,
  onToggle,
  onShare,
  onReport,
}: {
  resource: Resource;
  selected: boolean;
  onToggle: () => void;
  onShare: () => void;
  onReport: () => void;
}) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const plan = resource.plan;
  const service = resource.service;
  async function copy() {
    try {
      await navigator.clipboard.writeText(resourceText(resource, t));
      setCopied(true);
    } catch {
      onShare();
    }
  }
  return (
    <li>
      <article aria-label={resource.name}>
        <Card className="resource-card [--card-spacing:--spacing(5)]" data-selected={selected}>
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
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
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
                      <Button size="sm" variant="ghost" onClick={onReport}>{t("Report an issue")}</Button>
                    </div>
                  </div>
                </div>
              </details>
            </div>
          </CardContent>
          <CardFooter className="flex-wrap justify-between gap-3">
            <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={selected} onChange={onToggle} className="size-4 shrink-0 accent-primary" />
              {t(selected ? "Added to share list" : "Add to share list")}
              <span className="sr-only">: {resource.name}</span>
            </label>
            {resource.url && (
              <a href={resource.url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "ghost", size: "lg" })}>
                {t(plan ? "Visit provider" : "Program website")}
                <ExternalLink data-icon="inline-end" aria-hidden="true" />
              </a>
            )}
          </CardFooter>
          {copied && <span role="status" className="sr-only">{t("Details copied.")}</span>}
        </Card>
      </article>
    </li>
  );
}
