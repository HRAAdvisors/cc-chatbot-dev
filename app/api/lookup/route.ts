import { extractAddress, searchPoints, geocodeAddress } from '@/lib/address';
import { parseTechRules, matchPlans, groupPlans, type PlanGroups } from '@/lib/plans';
import { getServicesNearAddress, nationalServicesOnly, type ServiceGroups } from '@/lib/services-lookup';
import { createTTLCache } from '@/lib/cache';

interface LookupResponse {
  planGroups: PlanGroups | null;
  serviceGroups: ServiceGroups | null;
  found: boolean;
  lat?: number;
  lon?: number;
  address?: string;
}

// Keyed by normalized address — avoids re-hitting Postgres and the external
// geocoder (the two slow, network-bound steps) for repeat lookups of the same
// address, which happens often since a session re-queries when the user
// pivots between internet-plan and digital-equity questions.
const FOUND_TTL_MS = 30 * 60 * 1000;
const NOT_FOUND_TTL_MS = 5 * 60 * 1000;
const lookupCache = createTTLCache<LookupResponse>(FOUND_TTL_MS, 1000);

export async function POST(req: Request) {
  const { text } = await req.json();

  const parsed = extractAddress(text);
  if (!parsed) {
    return Response.json({ planGroups: null, serviceGroups: null, found: false });
  }

  const cacheKey = `${parsed.addr}|${parsed.city ?? ''}|${parsed.state}|${parsed.zip}`;
  const cached = lookupCache.get(cacheKey);
  if (cached) {
    return Response.json(cached);
  }

  const [row, geoResult] = await Promise.all([
    searchPoints(parsed),
    geocodeAddress(parsed.addr, parsed.city, parsed.state, parsed.zip),
  ]);

  const lat = geoResult?.lat ?? (row ? Number(row.LATITUDE) : undefined);
  const lon = geoResult?.lon ?? (row ? Number(row.LONGITUDE) : undefined);

  if (!row) {
    const notFound: LookupResponse = { planGroups: null, serviceGroups: nationalServicesOnly(), found: false };
    lookupCache.set(cacheKey, notFound, NOT_FOUND_TTL_MS);
    return Response.json(notFound);
  }

  const techsAtAddress = parseTechRules(row.TECHRULES);
  const matched = matchPlans(row.BRANDNAMES, techsAtAddress, row.BLD_TYPE);
  const planGroups = groupPlans(matched);
  const serviceGroups = (lat && lon) ? getServicesNearAddress(lat, lon) : nationalServicesOnly();

  const response: LookupResponse = {
    planGroups, serviceGroups, found: true, lat, lon,
    address: `${row.ADDR}, ${row.CITY}, ${row.STATE} ${row.ZIP}`,
  };
  lookupCache.set(cacheKey, response);
  return Response.json(response);
}
