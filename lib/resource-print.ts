import { CATEGORIES, CATEGORY_LABELS, addressClusters, areaOf, priceLabel, resourceDetails, type Resource } from "./resource-finder.ts";

type Translate = (key: string, values?: Record<string, string | number>) => string;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

export function resourcePrintDocument(title: string, text: string, locale = "en") {
  return `<!doctype html><html lang="${locale === "es" ? "es" : "en"}"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>@page{margin:18mm}body{font-family:Arial,sans-serif;color:#213047;line-height:1.5}h1{font-size:22px;margin:0 0 20px}pre{font-family:inherit;font-size:14px;white-space:pre-wrap;overflow-wrap:anywhere;margin:0}</style></head><body><h1>${escapeHtml(title)}</h1><pre>${escapeHtml(text)}</pre></body></html>`;
}

export interface PrintedExchange { question: string; answer: string; mentioned: string[] }

export const PRINT_TINTS = {
  internet: { fill: "#EEF7EE", border: "#CFE6CF" },
  devices: { fill: "#EEF3FB", border: "#CADAF2" },
  skills: { fill: "#FDF3E7", border: "#F1D7B5" },
} as const;

export function shortenAnswer(text: string, limit = 320) {
  const plain = text.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
  if (plain.length <= limit) return plain;
  const cut = plain.slice(0, limit);
  const sentence = cut.lastIndexOf(". ");
  return `${(sentence > limit * 0.5 ? cut.slice(0, sentence + 1) : cut.replace(/\s+\S*$/, "")).trim()}…`;
}

export function qrPayload(resources: Resource[], t: Translate) {
  const lines = resources.map((resource) => {
    const contact = resource.service?.phone || resource.url || "";
    return `${resource.name}${contact ? ` | ${contact}` : ""}`;
  });
  let text = [t("BACE Hub resource list"), ...lines].join("\n");
  if (text.length > 1400) text = [t("BACE Hub resource list"), ...resources.map((resource) => `${resource.name}${resource.service?.phone ? ` | ${resource.service.phone}` : ""}`)].join("\n").slice(0, 1400);
  return text;
}

export function residentListDocument({ resources, t, locale, area, date, preparedBy, qrSvg, conversation, includeAddresses = false }: {
  resources: Resource[]; t: Translate; locale: string; area: string; date: string; preparedBy?: string; qrSvg?: string; conversation?: PrintedExchange[]; includeAddresses?: boolean;
}) {
  const title = t("Digital resources for {area}", { area });
  const clusters = addressClusters(resources);
  const singleAddress = clusters.length === 1 && includeAddresses && clusters[0].address ? clusters[0].address : "";
  const meta = [date, preparedBy ? t("Prepared by {name}", { name: preparedBy }) : "", singleAddress].filter(Boolean).join(" · ");
  const sections = clusters.length > 1
    ? clusters.map((cluster) => `<div class="cluster"><h2 class="cluster-title">${escapeHtml(includeAddresses ? cluster.address : t("Near {place}", { place: areaOf(cluster.address) }))}</h2>${categorySections(cluster.resources)}</div>`).join("")
    : categorySections(resources);
  function categorySections(list: Resource[]) { return CATEGORIES.map((category) => {
    const items = list.filter((resource) => resource.category === category);
    if (!items.length) return "";
    const tint = PRINT_TINTS[category];
    const cards = items.map((resource) => {
      const details = resourceDetails(resource, t);
      const pick = (label: string) => details.find((detail) => detail.label === label)?.value;
      const lines = resource.plan
        ? [`${priceLabel(resource.plan.price) || t("Price not listed")}${resource.plan.price.trim() ? t("/mo") : ""} · ${resource.plan.downloadMbps} Mbps`, pick("Typical uses")]
        : [pick("Phone"), pick("Address") || pick("Access")];
      if (resource.url) lines.push(resource.url);
      return `<div class="item" style="border-color:${tint.border}"><p class="name">${escapeHtml(resource.name)}</p>${lines.filter(Boolean).map((line) => `<p class="line">${escapeHtml(line!)}</p>`).join("")}</div>`;
    }).join("");
    return `<section style="background:${tint.fill};border-color:${tint.border}"><h2>${escapeHtml(t(CATEGORY_LABELS[category]))}</h2>${cards}</section>`;
  }).join(""); }
  const footer = `<footer><p>${escapeHtml(t("Prices and availability can change. Call each provider first to confirm cost and eligibility."))}</p><p class="help">${escapeHtml(t("Emergency: 911 · Crisis line: 988 · Community services: 211"))}</p></footer>`;
  const page2 = conversation?.length ? `<div class="page"><h1>${escapeHtml(t("Questions and answers"))}</h1><p class="meta">${escapeHtml(t("These answers came from an AI assistant using BACE Hub directory data. Confirm details with each provider."))}</p>${conversation.map((exchange) => `<div class="qa"><p class="q">${escapeHtml(exchange.question)}</p><p>${escapeHtml(exchange.answer)}</p>${exchange.mentioned.length ? `<p class="line">${escapeHtml(t("Resources mentioned"))}: ${escapeHtml(exchange.mentioned.join(", "))}</p>` : ""}</div>`).join("")}${footer}</div>` : "";
  return `<!doctype html><html lang="${locale === "es" ? "es" : "en"}"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
@page{size:letter;margin:14mm}*{box-sizing:border-box}body{margin:0;font-family:"Public Sans",Arial,sans-serif;color:#1b2a41;font-size:12.5px;line-height:1.45;-webkit-print-color-adjust:exact;print-color-adjust:exact}
header{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;border-bottom:2px solid #1F4E9C;padding-bottom:10px;margin-bottom:14px}
h1{margin:0;font-size:20px;color:#1F4E9C}.meta{margin:4px 0 0;color:#4a5568}.qr{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:10px;color:#4a5568;text-align:center;max-width:110px}.qr svg{width:96px;height:96px}
section{border:1px solid;border-radius:8px;padding:10px 12px;margin-bottom:10px;break-inside:avoid-page}h2{margin:0 0 8px;font-size:14px;color:#1F4E9C}
.item{background:#fff;border:1px solid;border-radius:6px;padding:8px 10px;margin-top:6px;break-inside:avoid}.name{margin:0;font-weight:700}.line{margin:2px 0 0;overflow-wrap:anywhere;color:#2d3748}
footer{margin-top:14px;border-top:1px solid #cbd5e0;padding-top:8px;color:#4a5568}footer p{margin:2px 0}.help{font-weight:700;color:#1b2a41}
.cluster{margin-bottom:14px}.cluster-title{margin:0 0 8px;padding-bottom:4px;border-bottom:1px solid #cbd5e0;color:#1b2a41;font-size:15px}
.page{break-before:page}.qa{border-bottom:1px solid #e2e8f0;padding:8px 0}.qa p{margin:2px 0}.q{font-weight:700}
</style></head><body><header><div><h1>${escapeHtml(title)}</h1><p class="meta">${escapeHtml(meta)}</p></div>${qrSvg ? `<div class="qr">${qrSvg}<span>${escapeHtml(t("Scan to save this list on a phone"))}</span></div>` : ""}</header>${sections}${footer}${page2}</body></html>`;
}

export function printHtml(title: string, html: string) {
  const frame = document.createElement("iframe");
  frame.title = title;
  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  frame.style.cssText = "position:fixed;width:1px;height:1px;bottom:0;left:0;border:0;pointer-events:none";
  frame.dataset.resourcePrint = "true";
  const cleanupTimer = window.setTimeout(() => frame.remove(), 120000);
  frame.addEventListener("load", () => {
    const printWindow = frame.contentWindow;
    if (!printWindow) { frame.remove(); window.clearTimeout(cleanupTimer); return; }
    printWindow.addEventListener("afterprint", () => { frame.remove(); window.clearTimeout(cleanupTimer); }, { once: true });
    printWindow.focus();
    printWindow.print();
  }, { once: true });
  frame.srcdoc = html;
  document.body.appendChild(frame);
}

export function printResourceText(title: string, text: string, locale: string) {
  if (!text.trim()) return;
  printHtml(title, resourcePrintDocument(title, text, locale));
}
