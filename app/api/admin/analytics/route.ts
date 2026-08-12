import {
  getEnrichedChatLogs, parseFilters, applyFilters, buildSessionRollups,
  computeTotals, groupByIntent, groupByDay, groupByHouseholdSize, groupByUsageProfile,
  groupByServiceType, groupByZipIntent, recentMessages, addressPoints,
} from '@/lib/dashboard-data';
import { DISTRICT_OPTIONS } from '@/lib/districts';

export async function GET(req: Request) {
  const filters = parseFilters(new URL(req.url).searchParams);
  const rows = applyFilters(await getEnrichedChatLogs(), filters);

  return Response.json({
    totals: computeTotals(rows),
    byIntent: groupByIntent(rows),
    byDay: groupByDay(rows),
    recent: recentMessages(rows, 50),
    recentSessions: buildSessionRollups(rows, 50),
    byHouseholdSize: groupByHouseholdSize(rows),
    byUsageProfile: groupByUsageProfile(rows),
    byServiceType: groupByServiceType(rows),
    byZipIntent: groupByZipIntent(rows),
    addressPoints: addressPoints(rows),
    districtOptions: DISTRICT_OPTIONS,
  });
}
