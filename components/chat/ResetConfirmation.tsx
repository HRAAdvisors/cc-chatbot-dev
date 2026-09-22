'use client';
import { useLanguage } from './LanguageProvider';
import { AlertDialog } from '@base-ui/react/alert-dialog';
import { Button } from '@/components/ui/button';

export default function ResetConfirmation({ open, dontShowAgain, onDontShowAgainChange, onCancel, onConfirm, onClosed }: {
  open: boolean;
  dontShowAgain: boolean;
  onDontShowAgainChange: (checked: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
  onClosed: () => void;
}) {
  const { t } = useLanguage();
  return (
    <AlertDialog.Root open={open} onOpenChange={open => { if (!open) onCancel(); }}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 bg-foreground/40" />
        <AlertDialog.Popup finalFocus={() => { onClosed(); return false; }} className="fixed top-1/2 left-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-background text-foreground p-6 shadow-lg">
          <div className="flex flex-col gap-3">
            <AlertDialog.Title className="text-lg font-semibold">{t("Clear this client's conversation and restart?")}</AlertDialog.Title>
            <AlertDialog.Description className="text-sm leading-relaxed text-muted-foreground">
              {t('This clears the conversation, draft, address, answers, and results from this screen, and returns to the three starting options.')}
            </AlertDialog.Description>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={dontShowAgain} onChange={event => onDontShowAgainChange(event.target.checked)} className="size-4 accent-primary" />
              {t("Don't show me again")}
            </label>
            <div className="flex justify-end gap-2">
              <AlertDialog.Close render={<Button variant="outline" />}>{t('Cancel')}</AlertDialog.Close>
              <Button onClick={onConfirm}>{t('Clear and restart')}</Button>
            </div>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
