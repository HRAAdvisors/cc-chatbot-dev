import Papa from 'papaparse';
import sql from '@/lib/db';
import { getEnrichedChatLogs, parseFilters, applyFilters, buildSessionRollups } from '@/lib/dashboard-data';

function csvResponse<T extends object>(rows: T[], filename: string) {
  const csv = Papa.unparse(rows);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

const MESSAGE_FIELDS = [
  'id', 'session_id', 'created_at', 'user_message', 'intent', 'address_queried',
  'num_plans_returned', 'num_services_returned', 'household_size', 'usage_profile', 'device_count', 'service_type_selected',
] as const;

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const type = params.get('type');
  const id = params.get('id');
  const date = new Date().toISOString().slice(0, 10);

  // "Download everything currently shown" — same filters as the dashboard.
  if (type === 'sessions') {
    const rows = applyFilters(await getEnrichedChatLogs(), parseFilters(params));
    return csvResponse(buildSessionRollups(rows), `sessions-${date}.csv`);
  }

  if (type === 'messages') {
    const rows = applyFilters(await getEnrichedChatLogs(), parseFilters(params));
    const csvRows = rows.map(r => Object.fromEntries(MESSAGE_FIELDS.map(f => [f, r[f]])));
    return csvResponse(csvRows, `messages-${date}.csv`);
  }

  // Single-session transcript / single message row: explicit "get me this
  // exact thing" requests from a per-row download icon, intentionally
  // unaffected by whatever dashboard filters happen to be active.
  if (type === 'session' && id) {
    const rows = await sql`
      SELECT id, session_id, created_at, user_message, intent, address_queried,
        num_plans_returned, num_services_returned, household_size, usage_profile, device_count, service_type_selected
      FROM chat_logs
      WHERE session_id = ${id}
      ORDER BY created_at
    `;
    return csvResponse(rows, `session-${id}-${date}.csv`);
  }

  if (type === 'message' && id && /^\d+$/.test(id)) {
    const rows = await sql`
      SELECT id, session_id, created_at, user_message, intent, address_queried,
        num_plans_returned, num_services_returned, household_size, usage_profile, device_count, service_type_selected
      FROM chat_logs
      WHERE id = ${Number(id)}
    `;
    return csvResponse(rows, `message-${id}-${date}.csv`);
  }

  return Response.json({ error: 'Unknown export type' }, { status: 400 });
}
