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
  const type = new URL(req.url).searchParams.get('type');
  const date = new Date().toISOString().slice(0, 10);

  if (type === 'sessions') {
    const rows = await sessionsQuery();
    return csvResponse(rows, `sessions-${date}.csv`);
  }

  if (type === 'messages') {
    const rows = await sql`
      SELECT session_id, created_at, user_message, intent, address_queried,
        num_plans_returned, num_services_returned, household_size, usage_profile, service_type_selected
      FROM chat_logs
      ORDER BY session_id, created_at
    `;
    return csvResponse(rows, `messages-${date}.csv`);
  }

  return Response.json({ error: 'Unknown export type' }, { status: 400 });
}
