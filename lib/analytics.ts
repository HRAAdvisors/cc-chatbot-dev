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

export interface SelectionFields {
  householdSize?: string;
  usageProfile?: string;
  deviceCount?: string;
  serviceTypeSelected?: string;
}

// Household size / usage profile / device count / service type are chosen via
// ChoiceButtons clicks that don't necessarily lead to another /api/chat call,
// so there's no natural INSERT to attach them to — instead, update the most
// recent chat_logs row for the session (the lookup turn that triggered the
// guided flow).
export async function logSelection(sessionId: string, fields: SelectionFields): Promise<void> {
  try {
    await sql`
      UPDATE chat_logs SET
        household_size = COALESCE(${fields.householdSize ?? null}, household_size),
        usage_profile = COALESCE(${fields.usageProfile ?? null}, usage_profile),
        device_count = COALESCE(${fields.deviceCount ?? null}, device_count),
        service_type_selected = COALESCE(${fields.serviceTypeSelected ?? null}, service_type_selected)
      WHERE id = (SELECT id FROM chat_logs WHERE session_id = ${sessionId} ORDER BY created_at DESC LIMIT 1)
    `;
  } catch (err) {
    console.error('[analytics] failed to log selection:', err);
  }
}
