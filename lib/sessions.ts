import sql from './db';

// One row per session, rolling up its chat_logs rows. household_size /
// usage_profile / service_type_selected are only ever set on one row per
// session at a time (see logSelection in analytics.ts), so picking the most
// recently-set non-null value per session is equivalent to "the session's
// selection" even if it changed partway through.
const SESSIONS_SELECT = `
  SELECT
    session_id,
    MIN(created_at) AS started_at,
    MAX(created_at) AS ended_at,
    COUNT(*) AS message_count,
    string_agg(DISTINCT intent, ', ') AS intents,
    (array_agg(address_queried ORDER BY created_at DESC) FILTER (WHERE address_queried IS NOT NULL))[1] AS address_queried,
    (array_agg(household_size ORDER BY created_at DESC) FILTER (WHERE household_size IS NOT NULL))[1] AS household_size,
    (array_agg(usage_profile ORDER BY created_at DESC) FILTER (WHERE usage_profile IS NOT NULL))[1] AS usage_profile,
    (array_agg(service_type_selected ORDER BY created_at DESC) FILTER (WHERE service_type_selected IS NOT NULL))[1] AS service_type_selected,
    MAX(num_plans_returned) AS num_plans_returned,
    MAX(num_services_returned) AS num_services_returned
  FROM chat_logs
  GROUP BY session_id
  ORDER BY MAX(created_at) DESC
`;

export function sessionsQuery(limit?: number) {
  return limit
    ? sql.query(`${SESSIONS_SELECT} LIMIT $1`, [limit])
    : sql.query(SESSIONS_SELECT, []);
}
