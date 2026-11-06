import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildChatExport, buildCaseNote, getCaseNoteOptions } from '../lib/chat-export.ts';
import { createChatPdf } from '../lib/chat-pdf.ts';
import { translate } from '../lib/i18n.ts';

const t = key => key;
const now = new Date('2026-10-28T12:00:00.000Z');
const font = readFileSync(new URL('../public/fonts/NotoSans-Regular.ttf', import.meta.url)).toString('base64');

test('PDF transcript retains historical, superseded and interrupted content', () => {
  const data = { messages: [
    { role: 'user', text: 'Old address', archived: true },
    { role: 'user', text: 'Old household answer', superseded: true },
    { role: 'assistant', text: 'Partial reply', stopped: true },
  ] };
  const result = buildChatExport(data, t, now);
  assert.match(result.transcript, /Historical address context/);
  assert.match(result.transcript, /Superseded answer/);
  assert.match(result.transcript, /Interrupted response/);
  assert.doesNotMatch(buildCaseNote(data, t), /Old address|Old household answer|Partial reply/);
  assert.equal(result.filename, 'chat-2026-10-28T12-00-00-000Z.pdf');
});

test('case note contains query and one matched referral without unfinished fields', () => {
  const data = { address: '123 Test Street', messages: [
    { role: 'user', text: 'Find devices', workflowPrompt: true },
    { role: 'user', text: 'Resource type: Devices', answerKey: 'service' },
    { role: 'assistant', text: 'Here are the results.', records: ['Resource A | https://example.org', 'Resource A | https://example.org'] },
    { role: 'assistant', text: 'Can I help with anything else?' },
  ] };
  const note = buildCaseNote(data, t);
  assert.match(note, /Search query: Find devices/);
  assert.match(note, /Current address: 123 Test Street/);
  assert.match(note, /Matched referral: Resource A \| https:\/\/example.org/);
  assert.equal(note.match(/Resource A/g).length, 1);
  assert.doesNotMatch(note, /Latest assistant|Next steps|Add agreed|Current recorded answers/);
  assert.match(note, /unconfirmed/);
});

test('multiple matches require staff selection; no arbitrary first match', () => {
  const data = { messages: [{ role: 'assistant', text: 'Results', records: ['Resource A', 'Resource B'] }] };
  assert.match(buildCaseNote(data, t), /Select a matched resource/);
  assert.match(buildCaseNote(data, t, 'Resource B'), /Matched referral: Resource B/);
  assert.doesNotMatch(buildCaseNote(data, t, 'Resource B'), /Resource A/);
  assert.doesNotMatch(buildCaseNote(data, t, 'Invented resource'), /Invented resource/);
});

test('new workflow and empty lookup do not reuse previous referrals', () => {
  const data = { messages: [
    { role: 'user', text: 'Find internet', workflowPrompt: true },
    { role: 'assistant', text: 'Plans', records: ['Old plan'] },
    { role: 'user', text: 'Find devices', workflowPrompt: true },
    { role: 'assistant', text: 'No matches', records: [] },
  ] };
  assert.deepEqual(getCaseNoteOptions(data, t).referrals, []);
  assert.doesNotMatch(buildCaseNote(data, t), /Old plan|Find internet/);
  assert.match(buildChatExport(data, t, now).transcript, /Old plan/);
});

test('current recommendation and filtered services override general matches', () => {
  const messages = [{ role: 'assistant', text: 'Results', records: ['Plan A', 'Plan B'] }];
  assert.deepEqual(getCaseNoteOptions({ messages, recommendation: 'Plan B' }, t).referrals, ['Plan B']);
  assert.deepEqual(getCaseNoteOptions({ messages, referrals: [] }, t).referrals, []);
  assert.deepEqual(getCaseNoteOptions({ messages, referrals: ['Device support'] }, t).referrals, ['Device support']);
});

test('Spanish case note is localized and preserves the original query', () => {
  const data = { messages: [{ role: 'user', text: 'Necesito una computadora' }] };
  const note = buildCaseNote(data, key => translate('es', key));
  assert.match(note, /Nota de caso de BACE Hub/);
  assert.match(note, /Consulta de búsqueda: Necesito una computadora/);
  assert.doesNotMatch(note, /Search query|Matched referral|Status/);
});

test('search intent survives archiving the original workflow during address confirmation', () => {
  const note = buildCaseNote({ query: 'Find devices', address: 'Confirmed address', messages: [
    { role: 'user', text: 'Find devices', workflowPrompt: true, archived: true },
    { role: 'user', text: 'Entered address' },
    { role: 'assistant', text: 'Results', records: ['Device resource'] },
  ] }, t);
  assert.match(note, /Search query: Find devices \| Entered address/);
  assert.match(note, /Matched referral: Device resource/);
});

test('long transcripts produce real multipage PDFs with embedded fonts', () => {
  const transcript = Array.from({ length: 300 }, (_, i) => `Usuario ${i}: Necesito conexión. Dirección: Las Vegas. ¿Qué opciones hay?`).join('\n');
  const doc = createChatPdf(transcript, font, 'Conversación');
  assert.ok(doc.getNumberOfPages() > 1);
  const pdf = Buffer.from(doc.output('arraybuffer'));
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.match(pdf.toString('latin1'), /FontFile2/);
  assert.match(pdf.toString('latin1'), /ToUnicode/);
});
