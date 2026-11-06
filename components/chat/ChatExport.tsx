'use client';

import { useRef, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { Copy, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildChatExport, buildCaseNote, getCaseNoteOptions, type ChatExportData } from '@/lib/chat-export';
import { useLanguage } from './LanguageProvider';

export default function ChatExport({ getData, disabled }: { getData: () => ChatExportData; disabled: boolean }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState('');
  const [copying, setCopying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const downloadingRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [noteData, setNoteData] = useState<ChatExportData | null>(null);
  const [referrals, setReferrals] = useState<string[]>([]);
  const [selected, setSelected] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function download() {
    if (downloadingRef.current) return;
    downloadingRef.current = true;
    setDownloading(true);
    try {
      const { transcript, filename } = buildChatExport(getData(), t);
      const { createChatPdf, loadPdfFont } = await import('@/lib/chat-pdf');
      const pdf = createChatPdf(transcript, await loadPdfFont(), t('Chat transcript'));
      const url = URL.createObjectURL(pdf.output('blob'));
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus('Chat download requested.');
    } catch {
      setStatus('Download failed. Please try again.');
    } finally {
      downloadingRef.current = false;
      setDownloading(false);
    }
  }

  async function copy(text = draft) {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Case note copied.');
    } catch {
      setOpen(true);
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      });
      setStatus('Clipboard access is blocked. Copy the selected text manually.');
    } finally {
      setCopying(false);
    }
  }

  function startCaseNote() {
    const data = getData();
    const options = getCaseNoteOptions(data, t);
    const note = buildCaseNote(data, t);
    setNoteData(data);
    setReferrals(options.referrals);
    setSelected(options.referrals.length === 1 ? options.referrals[0] : '');
    setDraft(note);
    setStatus('');
    if (options.referrals.length > 1) setOpen(true);
    else void copy(note);
  }

  return (
    <div className="border-b border-border bg-card text-card-foreground px-4 py-2 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" disabled={disabled || downloading} onClick={download}><Download aria-hidden="true" data-icon="inline-start" />{t(downloading ? 'Preparing PDF…' : 'Download PDF')}</Button>
          <Button ref={triggerRef} variant="ghost" size="sm" disabled={disabled || copying} onClick={startCaseNote}><Copy aria-hidden="true" data-icon="inline-start" />{t('Copy Case Note')}</Button>
          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Portal>
              <Dialog.Backdrop className="fixed inset-0 bg-foreground/40" />
              <Dialog.Popup finalFocus={triggerRef} className="fixed top-1/2 left-1/2 max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-background text-foreground p-5 shadow-lg">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Dialog.Title className="text-lg font-semibold">{t('Copy Case Note')}</Dialog.Title>
                    <Dialog.Description className="text-sm leading-relaxed text-muted-foreground">{t('Choose the matched resource for this note. Review before sharing.')}</Dialog.Description>
                  </div>
                  {referrals.length > 1 && <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium">{t('Matched referral')}</span>
                    <select value={selected} onChange={event => {
                      setSelected(event.target.value);
                      if (noteData) setDraft(buildCaseNote(noteData, t, event.target.value));
                      setStatus('');
                    }} className="w-full min-w-0 rounded-lg border border-input bg-background text-foreground p-3 text-sm">
                      <option value="">{t('Select a matched resource.')}</option>
                      {referrals.map(referral => <option key={referral} value={referral}>{referral.replace(/^- /, '')}</option>)}
                    </select>
                  </label>}
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium">{t('Case note')}</span>
                    <textarea ref={textareaRef} value={draft} onChange={event => { setDraft(event.target.value); setStatus(''); }} rows={7} className="min-h-40 w-full resize-y rounded-lg border border-input bg-background text-foreground p-3 text-sm leading-relaxed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
                  </label>
                  <p role="status" className="text-sm text-muted-foreground">{t(status)}</p>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Dialog.Close render={<Button variant="outline" />}>{t('Close')}</Dialog.Close>
                    <Button disabled={!draft.trim() || copying || (referrals.length > 1 && !selected)} onClick={() => void copy()}><Copy aria-hidden="true" data-icon="inline-start" />{t(copying ? 'Copying…' : 'Copy Case Note')}</Button>
                  </div>
                </div>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
        <p className="text-sm text-muted-foreground">{t('Exports may contain personal information. Store and share securely.')}</p>
        {!open && status && <p role="status" className="text-sm text-muted-foreground">{t(status)}</p>}
      </div>
    </div>
  );
}
