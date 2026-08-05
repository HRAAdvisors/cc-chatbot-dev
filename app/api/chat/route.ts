import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { nanoid } from 'nanoid';
import { extractAddress, geocodeAddress } from '@/lib/address';
import { logChat } from '@/lib/analytics';

const SYSTEM_PROMPT = `You are a friendly digital equity assistant for Clark County, Nevada. You help residents find internet service options and digital inclusion resources.

When a user shares their address, you'll receive a context block with matched internet plans and nearby resources. Use that data to give clear, helpful answers.

Guidelines:
- Be warm and plain-spoken — many users are unfamiliar with internet plans or tech jargon
- If the user hasn't shared an address yet, ask for their full street address (city and ZIP if they know it) before doing anything else
- When plans are found, summarize the key options and call out any low-income discounts
- Mention the Affordable Connectivity Program (ACP) if it seems relevant
- When digital resources are found, briefly explain what each type offers
- If the address couldn't be validated against OpenStreetMap, ask the user to double-check the spelling or add more detail (unit number, cross street, or ZIP) — don't guess at plans or resources for an unvalidated address
- If the address validated but no FCC record is found, let the user know and suggest they double-check the address or try a nearby cross street
- Keep responses concise — the UI already shows detailed plan and service cards below your message
- Never make up plans or resources; only reference what's in the context block`;

export async function POST(req: Request) {
  const {
    messages,
    sessionId = nanoid(),
    contextBlock: clientContext = '',
    intent,
    numPlans,
    numServices,
  } = await req.json();

  // contextBlock is pre-built by the client from /api/lookup and passed here
  // so we avoid a second DB round-trip in this route
  let addressQueried = '';
  let lat: number | undefined;
  let lon: number | undefined;

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
    intent: intent === 'plans' ? 'internet_offer'
      : intent === 'services' ? 'digital_equity'
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
