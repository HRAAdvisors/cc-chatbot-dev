import { extractAddress, searchPoints, geocodeAddress, formatParsedAddress, fuzzyCorrectStreet, findNearbyPoints, type NearbyPoint } from '@/lib/address';
import { parseTechRules, matchPlans, groupPlans, type PlanGroups } from '@/lib/plans';
import { getServicesNearAddress, nationalServicesOnly, type ServiceGroups } from '@/lib/services-lookup';
import { createTTLCache } from '@/lib/cache';

interface LookupResponse {
  planGroups: PlanGroups | null;
  serviceGroups: ServiceGroups | null;
  found: boolean;
  validated: boolean;
  lat?: number;
  lon?: number;
  address?: string;
  // The geocoder-resolved address, for a "Did you mean...?" confirmation
  // before any plans/resources are shown — distinct from `address`, which
  // only exists once a matching FCC dataset row is found.
  confirmAddress?: string;
  // Nearest known addresses in the FCC dataset, offered when the geocoded
  // address itself has no exact record — lets the user pick a close match
  // instead of guessing at spelling or unit numbers.
  nearbyAddresses?: NearbyPoint[];
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
    return Response.json({ planGroups: null, serviceGroups: null, found: false, validated: false });
  }

  const cacheKey = `${parsed.addr}|${parsed.city ?? ''}|${parsed.state}|${parsed.zip}`;
  const cached = lookupCache.get(cacheKey);
  if (cached) {
    return Response.json(cached);
  }

  // Validate the address against OpenStreetMap before ever touching the FCC
  // broadband dataset — an address OSM can't locate isn't worth searching for.
  let effectiveParsed = parsed;
  let geoResult = await geocodeAddress(parsed.addr, parsed.city, parsed.state, parsed.zip);
  if (!geoResult) {
    // Nominatim can't correct a misspelled street name on its own — try the
    // closest real street at this house number in the FCC dataset before
    // giving up on the address entirely.
    const corrected = await fuzzyCorrectStreet(parsed);
    if (corrected) {
      const correctedGeo = await geocodeAddress(corrected.addr, corrected.city, corrected.state, corrected.zip);
      if (correctedGeo) {
        geoResult = correctedGeo;
        effectiveParsed = corrected;
      }
    }
  }
  if (!geoResult) {
    const invalid: LookupResponse = { planGroups: null, serviceGroups: null, found: false, validated: false };
    lookupCache.set(cacheKey, invalid, NOT_FOUND_TTL_MS);
    return Response.json(invalid);
  }

  const confirmAddress = geoResult.formatted ?? formatParsedAddress(effectiveParsed);

  const row = await searchPoints(effectiveParsed);
  const { lat, lon } = geoResult;

  if (!row) {
    const nearbyAddresses = await findNearbyPoints(lat, lon);
    const notFound: LookupResponse = { planGroups: null, serviceGroups: nationalServicesOnly(), found: false, validated: true, lat, lon, confirmAddress, nearbyAddresses };
    lookupCache.set(cacheKey, notFound, NOT_FOUND_TTL_MS);
    return Response.json(notFound);
  }

  const techsAtAddress = parseTechRules(row.TECHRULES);
  const matched = matchPlans(row.BRANDNAMES, techsAtAddress, row.BLD_TYPE);
  const planGroups = groupPlans(matched);
  const serviceGroups = getServicesNearAddress(lat, lon);

  const response: LookupResponse = {
    planGroups, serviceGroups, found: true, validated: true, lat, lon,
    address: `${row.ADDR}, ${row.CITY}, ${row.STATE} ${row.ZIP}`,
    confirmAddress,
  };
  lookupCache.set(cacheKey, response);
  return Response.json(response);
}
