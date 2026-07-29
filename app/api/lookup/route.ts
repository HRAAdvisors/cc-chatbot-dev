import { extractAddress, searchPoints, geocodeAddress } from '@/lib/address';
import { parseTechRules, matchPlans, groupPlans } from '@/lib/plans';
import { getServicesNearAddress, nationalServicesOnly } from '@/lib/services-lookup';

export async function POST(req: Request) {
  const { text } = await req.json();

  const parsed = extractAddress(text);
  if (!parsed) {
    return Response.json({ planGroups: null, serviceGroups: null, found: false });
  }

  const [row, geoResult] = await Promise.all([
    searchPoints(parsed),
    geocodeAddress(parsed.addr, parsed.city, parsed.state, parsed.zip),
  ]);

  const lat = geoResult?.lat ?? (row ? Number(row.LATITUDE) : undefined);
  const lon = geoResult?.lon ?? (row ? Number(row.LONGITUDE) : undefined);

  if (!row) {
    return Response.json({ planGroups: null, serviceGroups: nationalServicesOnly(), found: false });
  }

  const techsAtAddress = parseTechRules(row.TECHRULES);
  const matched = matchPlans(row.BRANDNAMES, techsAtAddress, row.BLD_TYPE);
  const planGroups = groupPlans(matched);
  const serviceGroups = (lat && lon) ? getServicesNearAddress(lat, lon) : nationalServicesOnly();

  return Response.json({ planGroups, serviceGroups, found: true, lat, lon, address: `${row.ADDR}, ${row.CITY}, ${row.STATE} ${row.ZIP}` });
}
