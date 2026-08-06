import { logSelection } from '@/lib/analytics';

export async function POST(req: Request) {
  const { sessionId, householdSize, usageProfile, serviceType } = await req.json();

  if (!sessionId) {
    return Response.json({ ok: false }, { status: 400 });
  }

  await logSelection(sessionId, {
    householdSize,
    usageProfile,
    serviceTypeSelected: serviceType,
  });

  return Response.json({ ok: true });
}
