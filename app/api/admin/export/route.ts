import Papa from 'papaparse';
import sql from '@/lib/db';
import { sessionsQuery } from '@/lib/sessions';

function csvResponse(rows: Record<string, unknown>[], filename: string) {
  const csv = Papa.unparse(rows);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const type = params.get('type');
  const id = params.get('id');
  const date = new Date().toISOString().slice(0, 10);

  if (type === 'sessions') {
    const rows = await sessionsQuery();
    return csvResponse(rows, `sessions-${date}.csv`);
  }

  if (type === 'messages') {
    const rows = await sql`
      SELECT id, session_id, created_at, user_message, intent, address_queried,
        num_plans_returned, num_services_returned, household_size, usage_profile, service_type_selected
      FROM chat_logs
      ORDER BY session_id, created_at
    `;
    return csvResponse(rows, `messages-${date}.csv`);
  }

  // Single-session transcript: every message logged under that session_id.
  if (type === 'session' && id) {
    const rows = await sql`
      SELECT id, session_id, created_at, user_message, intent, address_queried,
        num_plans_returned, num_services_returned, household_size, usage_profile, service_type_selected
      FROM chat_logs
      WHERE session_id = ${id}
      ORDER BY created_at
    `;
    return csvResponse(rows, `session-${id}-${date}.csv`);
  }

  // Single message row (id is an integer column; reject anything else).
  if (type === 'message' && id && /^\d+$/.test(id)) {
    const rows = await sql`
      SELECT id, session_id, created_at, user_message, intent, address_queried,
        num_plans_returned, num_services_returned, household_size, usage_profile, service_type_selected
      FROM chat_logs
      WHERE id = ${Number(id)}
    `;
    return csvResponse(rows, `message-${id}-${date}.csv`);
  }

  return Response.json({ error: 'Unknown export type' }, { status: 400 });
}
