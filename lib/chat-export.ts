export interface ExportMessage {
  role: 'user' | 'assistant';
  text: string;
  archived?: boolean;
  superseded?: boolean;
  stopped?: boolean;
  answerKey?: string;
  workflowPrompt?: boolean;
  address?: string;
  records?: string[];
}

export interface ChatExportData {
  messages: ExportMessage[];
  query?: string;
  address?: string;
  recommendation?: string;
  referrals?: string[];
}

type Translate = (key: string) => string;

export function getCaseNoteOptions(data: ChatExportData, t: Translate) {
  const active = data.messages.filter(m => !m.archived && !m.superseded && !m.stopped);
  const lastWorkflow = active.map(m => !!m.workflowPrompt).lastIndexOf(true);
  const current = lastWorkflow < 0 ? active : active.slice(lastWorkflow);
  const requests = current.filter(m => m.role === 'user' && !m.answerKey && m.text.trim());
  const latestRecords = current.filter(m => m.role === 'assistant' && m.records).at(-1)?.records ?? [];
  const referrals = [...new Set(data.recommendation ? [data.recommendation] : data.referrals ?? latestRecords)];
  const query = [...new Set([data.query ?? requests[0]?.text, requests.at(-1)?.text, ...current.filter(m => m.role === 'user' && m.answerKey === 'service').map(m => m.text)].filter(Boolean))].join(' | ') || t('Not recorded');
  return { query, referrals };
}

export function buildCaseNote(data: ChatExportData, t: Translate, referral?: string) {
  const { query, referrals } = getCaseNoteOptions(data, t);
  const match = referral && referrals.includes(referral) ? referral : referrals.length === 1 ? referrals[0] : undefined;
  return [
    t('BACE Hub case note'),
    `${t('Search query')}: ${query}`,
    ...(data.address ? [`${t('Current address')}: ${data.address}`] : []),
    `${t('Matched referral')}: ${match?.replace(/^- /, '') || t(referrals.length ? 'Select a matched resource.' : 'No matched resource recorded.')}`,
    `${t('Status')}: ${t('Directory match only. Referral completion and service receipt are unconfirmed.')}`,
  ].join('\n');
}

export function buildChatExport(data: ChatExportData, t: Translate, now = new Date()) {
  const timestamp = now.toISOString();
  const bullets = (lines: string[]) => lines.map(line => `- ${line.replace(/^- /, '')}`).join('\n');
  const section = (title: string, value: string) => `${t(title)}:\n${value}`;

  const transcript = [
    t('Clark County Digital Equity Assistant'),
    t('Chat transcript'),
    section('Exported at (UTC)', timestamp),
    t('Conversation text and lookup records are included. Suggested resources do not confirm eligibility, availability, or receipt of service.'),
    ...data.messages.filter(m => m.text.trim() || m.stopped || m.records?.length).map(m => {
      const flags = [m.archived && t('Historical address context'), m.superseded && t('Superseded answer'), m.stopped && t('Interrupted response')].filter(Boolean);
      return [
        `${t(m.role === 'user' ? 'User' : 'Assistant')}${flags.length ? ` [${flags.join('; ')}]` : ''}:`,
        m.text,
        m.address ? `${t('Lookup address')}: ${m.address}` : '',
        m.records?.length ? section('Lookup records (not confirmed referrals)', bullets(m.records)) : '',
      ].filter(Boolean).join('\n');
    }),
    ...(data.recommendation ? [section('Current recommendation', data.recommendation)] : []),
  ].join('\n\n');

  return { transcript, filename: `chat-${timestamp.replace(/[:.]/g, '-')}.pdf` };
}
