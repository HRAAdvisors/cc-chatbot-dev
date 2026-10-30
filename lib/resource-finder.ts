import {
  flattenPlans,
  getCheapestPlan,
  getFastestPlan,
  getProviderWebsite,
  type Plan,
  type PlanGroups,
} from "./plan-utils.ts";
import type { ServiceGroups, ServiceWithDistance } from "./services-lookup";

export function isAddressQuery(text: string) {
  return /(?:^|\s)@\s*\d/.test(text)
    || /\b\d+[\w\s.#-]+\s(?:street|avenue|boulevard|drive|road|lane|court|place|circle|highway|parkway|square|st|ave|blvd|dr|rd|ln|ct|way|pl|cir|hwy|pkwy|loop|sq)\b/i.test(text)
    || /^\s*\d+\s+(?!(?:mbps|gbps|gb|devices?|people|person|dollars?|computers?|laptops?|tablets?|months?|years?)\b)[a-z][\w\s.,#-]+$/i.test(text);
}

export type ResourceCategory = "internet" | "devices" | "skills";
export const CATEGORIES: ResourceCategory[] = ["internet", "devices", "skills"];
export const CATEGORY_LABELS: Record<ResourceCategory, string> = {
  internet: "Internet plans",
  devices: "Devices & computer access",
  skills: "Digital skills training",
};
export interface Resource {
  id: string;
  category: ResourceCategory;
  name: string;
  url?: string;
  plan?: Plan;
  service?: ServiceWithDistance;
}
export interface LookupResponse {
  planGroups: PlanGroups | null;
  serviceGroups: ServiceGroups | null;
  found: boolean;
  validated?: boolean;
  address?: string;
  confirmAddress?: string;
  lat?: number;
  lon?: number;
  nearbyAddresses?: Array<{
    addr: string;
    city: string;
    state: string;
    zip: string;
    lat: number;
    lon: number;
  }>;
}
export const planKey = (plan: Plan) =>
  JSON.stringify([
    plan.provider,
    plan.planName,
    plan.technology,
    plan.price,
    plan.downloadMbps,
    plan.uploadMbps,
  ]);
export function resourcesFromLookup(result: LookupResponse): Resource[] {
  const plans = result.planGroups ? flattenPlans(result.planGroups) : [];
  const cheapest = getCheapestPlan(plans);
  const fastest = getFastestPlan(plans);
  const ordered = [
    ...new Map(
      [cheapest, fastest, ...plans]
        .filter((p): p is Plan => !!p)
        .map((p) => [planKey(p), p]),
    ).values(),
  ];
  const services = result.serviceGroups
    ? (Object.values(result.serviceGroups).flat() as ServiceWithDistance[])
    : [];
  const resources: Resource[] = ordered.map((plan) => ({
    id: `internet:${planKey(plan)}`,
    category: "internet",
    name: [plan.provider, plan.planName].filter(Boolean).join(" · "),
    url: getProviderWebsite(plan.provider),
    plan,
  }));
  for (const service of services) {
    const categories: ResourceCategory[] = [];
    if (/device/i.test(service.type)) categories.push("devices");
    if (/skills|training/i.test(service.type)) categories.push("skills");
    for (const category of categories)
      resources.push({
        id: JSON.stringify([
          category,
          service.name,
          service.type,
          service.address,
          service.url,
        ]),
        category,
        name: service.name,
        url: safeWebsite(service.url),
        service,
      });
  }
  return [
    ...new Map(resources.map((resource) => [resource.id, resource])).values(),
  ];
}
export function defaultShortlist(resources: Resource[]) {
  return new Set(
    CATEGORIES.flatMap((category) => {
      const first = resources.find(
        (resource) => resource.category === category,
      );
      return first ? [first.id] : [];
    }),
  );
}
export function safeWebsite(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
export const priceLabel = (price: string) =>
  price.trim() ? `$${price.trim().replace(/^\$/, "")}` : "";
type Translate = (
  key: string,
  values?: Record<string, string | number>,
) => string;
export function isOnlineOrNational(service: ServiceWithDistance) {
  return /^(?:online\s*\/\s*national|national\s*\/\s*online|online resource)$/i.test(service.address?.trim() ?? "");
}

export function serviceLocationLabel(service: ServiceWithDistance, t: Translate) {
  if (isOnlineOrNational(service)) return t("Online or nationwide");
  if (service.distanceMiles != null)
    return t("{distance} miles away", { distance: service.distanceMiles.toFixed(1) });
  return t(service.address?.trim() ? "Local program" : "Location not listed");
}

export function resourceDetails(resource: Resource, t: Translate) {
  const details: Array<{ label: string; value: string }> = [];
  const add = (label: string, value: string) => details.push({ label, value });
  if (resource.plan) {
    const p = resource.plan;
    add("Monthly price", `${priceLabel(p.price) || t("Price not listed")}${p.price.trim() ? t("/mo") : ""}`);
    add("Download speed", `${p.downloadMbps} Mbps`);
    add("Upload speed", `${p.uploadMbps} Mbps`);
    add("Connection type", t(p.technology));
    if (p.lowIncome === "Y") add("Low-income discount", priceLabel(p.liDiscount) || t("Confirm with provider"));
    if (p.contract === "Y") add("Contract", p.contractMonths ? t("{months} months", { months: p.contractMonths }) : t("Confirm with provider"));
    if (p.contract === "N") add("Contract", t("No contract"));
    if (p.introDiscount) add("Introductory offer", t("Intro: {discount} for {months} mo", { discount: p.introDiscount, months: p.introPeriod }));
    if (p.installFee) add("Installation", p.installFee);
    if (p.otherFeesNote) add("Other fees", p.otherFeesNote);
  }
  if (resource.service) {
    const s = resource.service;
    if (s.description) add("About this program", t(s.description));
    if (isOnlineOrNational(s)) add("Access", t("Online or nationwide"));
    else if (s.address?.trim()) add("Address", t(s.address));
    else add("Address", t("Location not listed"));
    if (!isOnlineOrNational(s) && s.distanceMiles != null) add("Distance", serviceLocationLabel(s, t));
    if (s.phone) add("Phone", s.phone);
    if (s.languages) add("Languages", t(s.languages));
  }
  return details;
}

export function resourceText(resource: Resource, t: Translate) {
  return [
    resource.name,
    ...resourceDetails(resource, t).map(({ label, value }) => `${t(label)}: ${value}`),
    ...(resource.url ? [resource.url] : []),
  ].join("\n");
}
export function recommendationsText(
  resources: Resource[],
  t: Translate,
  address?: string,
) {
  return [
    t("Clark County digital resources"),
    ...(address ? [`${t("Current address")}: ${address}`] : []),
    ...CATEGORIES.flatMap((category) => {
      const matches = resources.filter(
        (resource) => resource.category === category,
      );
      return matches.length
        ? [
            `${t(CATEGORY_LABELS[category])}\n\n${matches.map((resource) => resourceText(resource, t)).join("\n\n")}`,
          ]
        : [];
    }),
    t(
      "Directory matches only. Contact each provider to confirm availability, cost, and eligibility. Service receipt is not confirmed.",
    ),
  ].join("\n\n");
}
export function resourceCaseNote(resources: Resource[], t: Translate, address?: string) {
  return [
    t("Clark County resource case note"),
    `${t("Search query")}: ${t("Internet, device access, and digital skills resources")}`,
    ...(address ? [`${t("Current address")}: ${address}`] : []),
    `${t("Selected resources")}:`,
    ...resources.map((resource) => `- ${resource.name} · ${t(CATEGORY_LABELS[resource.category])}${resource.url ? ` | ${resource.url}` : ""}`),
    `${t("Status")}: ${t("Directory match only. Referral completion and service receipt are unconfirmed.")}`,
  ].join("\n");
}

export function categoryCounts(resources: Resource[]) {
  return CATEGORIES.map((category) => ({
    category,
    count: resources.filter((resource) => resource.category === category).length,
  })).sort((a, b) => Number(a.count === 0) - Number(b.count === 0));
}

export const ISSUE_REASONS = {
  "incorrect-details": "Incorrect contact or program details",
  unavailable: "Resource is no longer available",
  "broken-link": "Website link does not work",
  eligibility: "Eligibility or price is incorrect",
  other: "Something else",
} as const;
