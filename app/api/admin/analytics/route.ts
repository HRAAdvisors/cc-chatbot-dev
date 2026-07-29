import sql from '@/lib/db';

export async function GET() {
  const [totals, byIntent, byDay, recent] = await Promise.all([
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

    sql`SELECT session_id, created_at, user_message, intent, address_queried, num_plans_returned, num_services_returned
    FROM chat_logs ORDER BY created_at DESC LIMIT 50`,
  ]);

  return Response.json({ totals: totals[0], byIntent, byDay, recent });
}
