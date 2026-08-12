import sql from '@/lib/db';
import { sessionsQuery } from '@/lib/sessions';
import { addressPointsQuery, zipIntentQuery } from '@/lib/geo';

export async function GET() {
  const [totals, byIntent, byDay, recent, recentSessions, byHouseholdSize, byUsageProfile, byServiceType, byZipIntent, addressPoints] = await Promise.all([
    sql`SELECT
      COUNT(*) AS total_messages,
      COUNT(DISTINCT session_id) AS total_sessions,
      COUNT(DISTINCT address_queried) FILTER (WHERE address_queried IS NOT NULL) AS unique_addresses
    FROM chat_logs`,

    sql`SELECT intent, COUNT(*) AS count FROM chat_logs GROUP BY intent ORDER BY count DESC`,

    sql`SELECT
      DATE(created_at AT TIME ZONE 'America/Los_Angeles') AS day,
      COUNT(DISTINCT session_id) AS sessions,
      COUNT(*) AS messages
    FROM chat_logs
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY day ORDER BY day`,

    sql`SELECT id, session_id, created_at, user_message, intent, address_queried, num_plans_returned, num_services_returned
    FROM chat_logs ORDER BY created_at DESC LIMIT 50`,

    sessionsQuery(50),

    sql`SELECT household_size, COUNT(*) AS count FROM chat_logs WHERE household_size IS NOT NULL GROUP BY household_size ORDER BY household_size`,

    sql`SELECT usage_profile, COUNT(*) AS count FROM chat_logs WHERE usage_profile IS NOT NULL GROUP BY usage_profile ORDER BY usage_profile`,

    sql`SELECT service_type_selected, COUNT(*) AS count FROM chat_logs WHERE service_type_selected IS NOT NULL GROUP BY service_type_selected ORDER BY count DESC`,

    zipIntentQuery(),

    addressPointsQuery(),
  ]);

  return Response.json({
    totals: totals[0], byIntent, byDay, recent, recentSessions,
    byHouseholdSize, byUsageProfile, byServiceType, byZipIntent, addressPoints,
  });
}
