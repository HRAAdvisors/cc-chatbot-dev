import sql from './db';

// address_queried is built (see app/api/chat/route.ts) by joining the parsed
// addr/city/"state zip" pieces with ', ' — split it back apart to backfill
// lat/long from `points` for rows logged before geocoding was fixed to
// actually populate chat_logs.lat/long.
export async function addressPointsQuery() {
  return sql`
    SELECT
      c.id,
      c.session_id,
      c.created_at,
      c.intent,
      c.address_queried,
      COALESCE(c.lat, p.lat) AS lat,
      COALESCE(c.long, p.long) AS long
    FROM chat_logs c
    LEFT JOIN LATERAL (
      SELECT lat, long FROM points
      WHERE addr = split_part(c.address_queried, ', ', 1)
        AND state = split_part(split_part(c.address_queried, ', ', 3), ' ', 1)
        AND (city = split_part(c.address_queried, ', ', 2) OR c.address_queried !~ '^[^,]+, [^,]+, ')
      LIMIT 1
    ) p ON true
    WHERE c.address_queried IS NOT NULL
      AND COALESCE(c.lat, p.lat) IS NOT NULL
    ORDER BY c.created_at DESC
  `;
}

// address_queried always ends in "STATE ZIP" (see app/api/chat/route.ts),
// with a trailing space and no digits when zip wasn't captured — the regex
// only matches rows where a 5-digit zip is actually present. Bracket classes
// ([0-9], not \d) because neon's sql-over-HTTP driver strips backslash
// escapes from query text before it reaches Postgres.
export async function zipIntentQuery() {
  return sql`
    SELECT
      substring(address_queried FROM '([0-9]{5}) *$') AS zip,
      intent,
      COUNT(*) AS count
    FROM chat_logs
    WHERE address_queried ~ '[0-9]{5} *$'
    GROUP BY zip, intent
    ORDER BY zip
  `;
}
