import type { ResourceCategory } from "./resource-finder.ts";

export type ResourceFocus = ResourceCategory | "all";
export const GOALS = ["Work & job applications", "School & homework", "Video calls & telehealth", "Everyday tasks", "Online safety"] as const;
export const ACCESS_OPTIONS = ["No internet or computer", "Internet, but no computer", "Computer, but no internet", "Internet and a computer", "Shared or public access"] as const;
export const PEOPLE_OPTIONS = ["1 person", "2–3 people", "4 or more people"] as const;
export const BUDGET_OPTIONS = ["Free options", "Up to $25/month", "Up to $50/month", "Up to $75/month"] as const;
export const COMFORT_OPTIONS = ["Starting from the basics", "Some experience", "Building specific skills"] as const;
export const FORMAT_OPTIONS = ["In person", "Online", "Either format"] as const;
export interface ResidentNeeds {
  goals: string[];
  access: string;
  people: string;
  budget: string;
  comfort: string;
  format: string;
}
export const EMPTY_NEEDS: ResidentNeeds = { goals: [], access: "", people: "", budget: "", comfort: "", format: "" };

export function sanitizeNeeds(input: unknown): ResidentNeeds {
  const data = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const pick = (value: unknown, options: readonly string[]) => typeof value === "string" && options.includes(value) ? value : "";
  return {
    goals: [...new Set(Array.isArray(data.goals) ? data.goals.filter((goal): goal is string => typeof goal === "string" && GOALS.includes(goal as typeof GOALS[number])) : [])],
    access: pick(data.access, ACCESS_OPTIONS), people: pick(data.people, PEOPLE_OPTIONS),
    budget: pick(data.budget, BUDGET_OPTIONS), comfort: pick(data.comfort, COMFORT_OPTIONS), format: pick(data.format, FORMAT_OPTIONS),
  };
}
export function hasNeeds(needs: ResidentNeeds) {
  return needs.goals.length > 0 || !!(needs.access || needs.people || needs.budget || needs.comfort || needs.format);
}
export function needsContext(needs: ResidentNeeds) {
  return [
    needs.goals.length && `Goals: ${needs.goals.join(", ")}`,
    needs.access && `Current access: ${needs.access}`,
    needs.people && `Simultaneous internet users: ${needs.people}`,
    needs.budget && `Preferred internet budget: ${needs.budget}`,
    needs.comfort && `Computer experience: ${needs.comfort}`,
    needs.format && `Learning format: ${needs.format}`,
  ].filter(Boolean).join("\n");
}
export function inferResourceFocus(text: string): ResourceFocus {
  const categories: ResourceCategory[] = [];
  if (/\binternet\b|\bbroadband\b|\bwi-?fi\b|\bplans?\b|conexi[oó]n/i.test(text)) categories.push("internet");
  if (/\blaptops?\b|\btablets?\b|\bdevices?\b|computadora|dispositiv/i.test(text) || (/\bcomputers?\b/i.test(text) && !/\bclasses?\b|\btraining\b|\bskills?\b|\blearn\b/i.test(text))) categories.push("devices");
  if (/\bclasses?\b|\btraining\b|\bskills?\b|\blearn\b|clases|capacita/i.test(text)) categories.push("skills");
  return categories.length === 1 ? categories[0] : "all";
}

export function splitResourceRequest(text: string) {
  const match = /(?:@\s*)?\b\d+[a-z]?\s+(?!people\b|persons?\b|devices?\b|computers?\b|laptops?\b|tablets?\b|mbps\b)(?:[\w.-]+\s+){0,7}(?:street|avenue|boulevard|drive|road|lane|court|place|circle|highway|parkway|square|st|ave|blvd|dr|rd|ln|ct|way|pl|cir|hwy|pkwy|loop|sq)\b\.?([,\s]+(?:north las vegas|las vegas|henderson|boulder city|mesquite))?([,\s]+(?:NV|Nevada))?([,\s]+\d{5}(?:-\d{4})?)?/i.exec(text);
  if (!match) return { address: text.replace(/^@\s*/, ""), question: "" };
  const question = (text.slice(0, match.index) + " " + text.slice(match.index + match[0].length)).replace(/^[\s,.:;-]+|[\s,.:;-]+$/g, "").trim();
  return { address: match[0].replace(/^@\s*/, "").trim(), question: /[a-záéíóúñ]{3}/i.test(question) ? question : "" };
}
