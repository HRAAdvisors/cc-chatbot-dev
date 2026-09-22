import { streamText, smoothStream } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { nanoid } from 'nanoid';
import { extractAddress, geocodeAddress } from '@/lib/address';
import { logChat } from '@/lib/analytics';

const SYSTEM_PROMPT = `You are a digital equity lookup tool for caseworkers and service providers in Clark County, Nevada. The user is looking up internet service options and digital inclusion resources on behalf of a client, not for themselves.

When the user shares a client's address, you'll receive a context block with matched internet plans and nearby resources. Use that data to give clear, direct answers.

Guidelines:
- Keep the tone professional and matter-of-fact — no exclamation points, enthusiasm, or emojis
- Refer to the person who would receive the service as "the client," never "you" — the user is not the one signing up
- If the user hasn't shared a client's address yet, ask for the full street address (city and ZIP if known) before doing anything else
- When plans are found, summarize the key options and call out any low-income discounts
- Mention the Affordable Connectivity Program (ACP) if it seems relevant
- When digital resources are found, briefly explain what each type offers
- If the address couldn't be validated against OpenStreetMap, ask the user to double-check the spelling or add more detail (unit number, cross street, or ZIP) — don't guess at plans or resources for an unvalidated address
- If the address validated but no FCC record is found, let the user know and suggest they double-check the address or try a nearby cross street
- Keep responses concise — the UI already shows detailed plan and service cards below your message
- Never make up plans or resources; only reference what's in the context block
- Never say "context block," "lookup tool," "database," or any other internal system/component name to the user — those are terms for you only, not user-facing language
- If the user has provided what looks like an address but you receive no context block at all, don't describe why or speculate about tools — just tell them you weren't able to process that address and ask them to resend the full street address, city, and ZIP`;

export async function POST(req: Request) {
  const {
    messages,
    sessionId = nanoid(),
    contextBlock: clientContext = '',
    intent,
    locale: requestedLocale,
    numPlans,
    numServices,
    lat: clientLat,
    lon: clientLon,
  } = await req.json();

  // contextBlock is pre-built by the client from /api/lookup and passed here
  // so we avoid a second DB round-trip in this route
  const lastUserMsg = messages.slice().reverse().find((m: { role: string }) => m.role === 'user');
  const parsed = lastUserMsg ? extractAddress(lastUserMsg.content) : null;
  const addressQueried = parsed
    ? [parsed.addr, parsed.city, `${parsed.state} ${parsed.zip}`].filter(Boolean).join(', ')
    : '';

  const baseLogEntry = {
    sessionId,
    userMessage: lastUserMsg?.content || '',
    intent: intent === 'plans' ? 'internet_offer' as const
      : intent === 'services' ? 'digital_equity' as const
      : 'other' as const,
    addressQueried: addressQueried || undefined,
    numPlansReturned: numPlans || undefined,
    numServicesReturned: numServices || undefined,
  };

  // The client already geocoded this address via /api/lookup — reuse that
  // instead of hitting Nominatim a second time. Only re-geocode here as a
  // fallback (e.g. a pivot turn where the client didn't have coordinates).
  if (parsed && (clientLat == null || clientLon == null)) {
    geocodeAddress(parsed.addr, parsed.city, parsed.state, parsed.zip)
      .then(geo => logChat({ ...baseLogEntry, lat: geo?.lat, long: geo?.lon }))
      .catch(() => logChat(baseLogEntry));
  } else {
    logChat({ ...baseLogEntry, lat: clientLat, long: clientLon });
  }

  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    system: SYSTEM_PROMPT + (clientContext ? `\n\n${clientContext}` : '') + `\n\nRespond in ${requestedLocale === 'es' ? 'Spanish' : 'English'}, regardless of the language used in earlier messages or source data. Keep provider and organization names, street addresses, phone numbers, URLs, prices, and speed values unchanged. Use plain, accessible language. Do not use em dashes.`,
    messages,
    maxOutputTokens: 1024,
    experimental_transform: smoothStream({ chunking: 'word' }),
  });

  return result.toTextStreamResponse();
}
