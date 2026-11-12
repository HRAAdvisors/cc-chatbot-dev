import type { Resource } from "./resource-finder.ts";

export type MapCategory = "devices" | "skills";
export interface DirectoryService {
  name: string; type: string; phone: string | null; url: string | null; address: string | null;
  lat: number | null; long: number | null; description: string | null; languages: string;
}
export interface MapEntry extends DirectoryService {
  id: string;
  categories: MapCategory[];
  hasLocation: boolean;
  remote: boolean;
}
export function mapServiceId(service: Pick<DirectoryService, "name" | "type" | "address" | "url">) {
  return JSON.stringify([service.name, service.type, service.address ?? "", service.url ?? ""]);
}
export function toMapEntries(services: DirectoryService[]): MapEntry[] {
  const entries = services.flatMap((service) => {
    const categories: MapCategory[] = [];
    if (/device/i.test(service.type)) categories.push("devices");
    if (/skills|training/i.test(service.type)) categories.push("skills");
    if (!categories.length) return [];
    const remote = /^(?:online\s*\/\s*national|national\s*\/\s*online|online resource)$/i.test(service.address?.trim() ?? "");
    const hasLocation = !remote && typeof service.lat === "number" && Number.isFinite(service.lat) && Math.abs(service.lat) <= 90 && typeof service.long === "number" && Number.isFinite(service.long) && Math.abs(service.long) <= 180 && !(service.lat === 0 && service.long === 0);
    return [{ ...service, id: mapServiceId(service), categories, hasLocation, remote }];
  });
  return [...new Map(entries.map((entry) => [entry.id, entry])).values()].sort((a, b) => a.name.localeCompare(b.name));
}
export function mapIdsFromResources(resources: Resource[]) {
  return new Set(resources.flatMap((resource) => resource.service && resource.category !== "internet" ? [mapServiceId(resource.service)] : []));
}
export function mappedIdsFromResources(resources: Resource[]) {
  const services = resources.flatMap((resource) => resource.service && resource.category !== "internet" ? [resource.service as DirectoryService] : []);
  return new Set(toMapEntries(services).filter((entry) => entry.hasLocation).map((entry) => entry.id));
}
export function filterMapEntries(entries: MapEntry[], category: MapCategory | "all", query: string, scope?: Set<string>) {
  const term = query.trim().toLocaleLowerCase();
  return entries.filter((entry) => (!scope || scope.has(entry.id)) && (category === "all" || entry.categories.includes(category)) && (!term || [entry.name, entry.address, entry.description, entry.languages].filter(Boolean).join(" ").toLocaleLowerCase().includes(term)));
}
export function mapFeatures(entries: MapEntry[], selected: Set<string>) {
  return {
    type: "FeatureCollection" as const,
    features: entries.filter((entry) => entry.hasLocation).map((entry) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [entry.long!, entry.lat!] },
      properties: { entryId: entry.id, name: entry.name, category: entry.categories.length === 2 ? "both" : entry.categories[0], selected: selected.has(entry.id) },
    })),
  };
}
