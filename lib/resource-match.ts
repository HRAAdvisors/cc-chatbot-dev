import { isOnlineOrNational, type Resource } from "./resource-finder.ts";
import { toNumber } from "./plan-utils.ts";
import type { ResidentNeeds } from "./resident-needs.ts";

export interface ResourceMatch { match: boolean; score: number; reasons: string[] }

const TOPIC_WORDS: Record<string, RegExp> = {
  "Computer basics": /basic|beginner|intro|fundamental|digital literacy|computer (skills|class|course|training)/i,
  "Email & online accounts": /email|e-mail|online account/i,
  "Job applications": /job|career|resume|workforce|employment/i,
  "Online safety": /safety|security|scam|privacy|cyber/i,
  "Video calls": /video|zoom|conferenc|telehealth/i,
};
const DEVICE_WORDS: Record<string, RegExp> = {
  "Laptop or desktop": /laptop|desktop|computer|chromebook/i,
  "Tablet": /tablet|ipad/i,
  "Borrowing or public computer access": /public computer|computer (lab|center|access)|borrow|loan|check ?out|library|wi-?fi|hotspot|internet access/i,
};

function minSpeed(needs: ResidentNeeds) {
  let min = 0;
  if (needs.people === "1 person") min = 25;
  if (needs.people === "2–3 people") min = 100;
  if (needs.people === "4 or more people") min = 200;
  if (needs.goals.some((goal) => /video|work|school/i.test(goal))) min = Math.max(min, 50);
  return min;
}

function matchPlan(resource: Resource, needs: ResidentNeeds): ResourceMatch {
  const plan = resource.plan!;
  const reasons: string[] = [];
  let ok = true;
  let score = 0;
  const price = toNumber(plan.price);
  const cap = needs.budget === "Free options" ? 0 : Number(/\$(\d+)/.exec(needs.budget)?.[1] ?? NaN);
  if (needs.budget) {
    if (price === null || !(price <= (Number.isNaN(cap) ? Infinity : cap))) ok = false;
    else { reasons.push(price === 0 ? "Free" : "Fits the monthly budget"); score += 2; }
  }
  const min = minSpeed(needs);
  if (min) {
    const down = toNumber(plan.downloadMbps);
    if (down === null || down < min) ok = false;
    else { reasons.push("Fast enough for their needs"); score += 1; }
  }
  if (needs.budget && plan.lowIncome === "Y") score += 1;
  return { match: ok, score, reasons };
}

function matchService(resource: Resource, needs: ResidentNeeds): ResourceMatch {
  const service = resource.service!;
  const reasons: string[] = [];
  let ok = true;
  let score = 0;
  const text = `${resource.name} ${service.type} ${service.description ?? ""}`;
  const described = !!service.description?.trim();
  if (resource.category === "devices") {
    if (needs.deviceType) {
      if (DEVICE_WORDS[needs.deviceType]?.test(text)) { reasons.push("Matches the device they need"); score += 2; }
      else ok = false;
    }
    if (needs.deviceCost === "Free only" || needs.deviceCost === "Free or low-cost") {
      if (/free|low[- ]cost|discount|donat|refurbish/i.test(text)) { reasons.push("Free or low-cost"); score += 1; }
    }
  }
  if (resource.category === "skills") {
    const languages = service.languages ?? "";
    if (needs.language === "Spanish" || needs.language === "English") {
      if (languages.toLowerCase().includes(needs.language.toLowerCase())) { reasons.push(`Offered in ${needs.language}`); score += 2; }
      else ok = false;
    }
    if (needs.learningTopics.length) {
      if (needs.learningTopics.some((topic) => TOPIC_WORDS[topic]?.test(text))) { reasons.push("Matches what they want to learn"); score += 2; }
      else if (described) ok = false;
    }
    if (needs.format === "Online" || needs.format === "In person") {
      const online = isOnlineOrNational(service) || /online|virtual|remote/i.test(text);
      const inPerson = !isOnlineOrNational(service) && !!service.address?.trim();
      if (needs.format === "Online" ? online : inPerson) { reasons.push(needs.format === "Online" ? "Online option" : "In-person option"); score += 1; }
      else ok = false;
    }
    if (needs.comfort === "Starting from the basics" && TOPIC_WORDS["Computer basics"].test(text)) score += 1;
  }
  return { match: ok, score, reasons };
}

export function matchResource(resource: Resource, needs: ResidentNeeds): ResourceMatch {
  if (resource.plan) return matchPlan(resource, needs);
  if (resource.service) return matchService(resource, needs);
  return { match: true, score: 0, reasons: [] };
}
