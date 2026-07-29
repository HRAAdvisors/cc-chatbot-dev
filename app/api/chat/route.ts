import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { nanoid } from 'nanoid';
import { extractAddress, searchPoints, geocodeAddress } from '@/lib/address';
import { parseTechRules, matchPlans, groupPlans } from '@/lib/plans';
import { getServicesNearAddress, nationalServicesOnly } from '@/lib/services-lookup';
import { logChat } from '@/lib/analytics';

const SYSTEM_PROMPT = `You are a friendly digital equity assistant for Clark County, Nevada. You help residents find internet service options and digital inclusion resources.

When a user shares their address, you'll receive a context block with matched internet plans and nearby resources. Use that data to give clear, helpful answers.

Guidelines:
- Be warm and plain-spoken — many users are unfamiliar with internet plans or tech jargon
- When plans are found, summarize the key options and call out any low-income discounts
- Mention the Affordable Connectivity Program (ACP) if it seems relevant
- When digital resources are found, briefly explain what each type offers
- If no FCC record is found, ask the user to double-check the address or try a nearby cross street
- Keep responses concise — the UI already shows detailed plan and service cards below your message
- Never make up plans or resources; only reference what's in the context block`;

export async function POST(req: Request) {
  const { messages, sessionId = nanoid(), contextBlock: clientContext = '' } = await req.json();

  // contextBlock is pre-built by the client from /api/lookup and passed here
  // so we avoid a second DB round-trip in this route
  let addressQueried = '';
  let lat: number | undefined;
  let lon: number | undefined;
  let numPlans = 0;
  let numServices = 0;

  // Parse address for analytics only (lookup was already done client-side)
  const lastUserMsg = messages.slice().reverse().find((m: { role: string }) => m.role === 'user');
  if (lastUserMsg) {
    const parsed = extractAddress(lastUserMsg.content);
    if (parsed) {
      addressQueried = [parsed.addr, parsed.city, `${parsed.state} ${parsed.zip}`].filter(Boolean).join(', ');
      // Quick geocode for lat/lon analytics (fire and forget, don't await)
      geocodeAddress(parsed.addr, parsed.city, parsed.state, parsed.zip).then(geo => {
        if (geo) { lat = geo.lat; lon = geo.lon; }
      }).catch(() => {});
    }
  }

  logChat({
    sessionId,
    userMessage: lastUserMsg?.content || '',
    intent: clientContext.includes('Internet plans') ? 'internet_offer'
      : clientContext.includes('digital equity') ? 'digital_equity'
      : 'other',
    addressQueried: addressQueried || undefined,
    lat,
    long: lon,
    numPlansReturned: numPlans || undefined,
    numServicesReturned: numServices || undefined,
  });

  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    system: SYSTEM_PROMPT + (clientContext ? `\n\n${clientContext}` : ''),
    messages,
    maxOutputTokens: 1024,
  });

  return result.toTextStreamResponse();
}
