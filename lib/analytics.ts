import sql from './db';

export interface ChatLogEntry {
  sessionId: string;
  userMessage: string;
  intent: 'internet_offer' | 'digital_equity' | 'other';
  addressQueried?: string;
  lat?: number;
  long?: number;
  numPlansReturned?: number;
  numServicesReturned?: number;
}

export async function logChat(entry: ChatLogEntry): Promise<void> {
  try {
    await sql`
      INSERT INTO chat_logs
        (session_id, user_message, intent, address_queried, lat, long, num_plans_returned, num_services_returned)
      VALUES
        (${entry.sessionId}, ${entry.userMessage}, ${entry.intent},
         ${entry.addressQueried ?? null}, ${entry.lat ?? null}, ${entry.long ?? null},
         ${entry.numPlansReturned ?? null}, ${entry.numServicesReturned ?? null})
    `;
  } catch (err) {
    console.error('[analytics] failed to log chat:', err);
  }
}
