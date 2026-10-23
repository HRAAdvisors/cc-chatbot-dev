'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertDialog } from '@base-ui/react/alert-dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from './LanguageProvider';

const WARNING_AFTER_MS = 18 * 60 * 1000;
const EXPIRE_AFTER_MS = 20 * 60 * 1000;

export default function SessionTimeout({ onExpire }: { onExpire: () => void }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const stay = useRef<() => void>(() => {});
  const stayButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let lastActivity = Date.now();
    let warned = false;
    let ended = false;
    let timer: ReturnType<typeof setTimeout>;

    function expire() {
      if (ended) return;
      ended = true;
      clearTimeout(timer);
      setOpen(false);
      onExpire();
    }

    function check() {
      clearTimeout(timer);
      if (ended) return;
      const idle = Date.now() - lastActivity;
      if (idle >= EXPIRE_AFTER_MS) {
        expire();
        return;
      }
      if (idle >= WARNING_AFTER_MS && !warned) {
        warned = true;
        setOpen(true);
      }
      timer = setTimeout(check, (warned ? EXPIRE_AFTER_MS : WARNING_AFTER_MS) - idle);
    }

    function recordActivity() {
      if (ended) return;
      // An overdue timer must clear the old session before input can revive it.
      if (Date.now() - lastActivity >= EXPIRE_AFTER_MS) {
        expire();
        return;
      }
      if (warned || document.hidden) return;
      lastActivity = Date.now();
      check();
    }

    stay.current = () => {
      if (ended) return;
      if (Date.now() - lastActivity >= EXPIRE_AFTER_MS) {
        expire();
        return;
      }
      lastActivity = Date.now();
      warned = false;
      setOpen(false);
      check();
    };

    const activityEvents = ['pointerdown', 'keydown', 'input', 'scroll'] as const;
    activityEvents.forEach(event => document.addEventListener(event, recordActivity, { capture: true, passive: true }));
    // Background tabs and sleeping devices can delay timers; use elapsed time on return.
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    check();

    return () => {
      ended = true;
      clearTimeout(timer);
      activityEvents.forEach(event => document.removeEventListener(event, recordActivity, true));
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
      stay.current = () => {};
    };
  }, [onExpire]);

  return (
    <AlertDialog.Root open={open}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 bg-foreground/40" />
        <AlertDialog.Popup initialFocus={stayButton} className="fixed top-1/2 left-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-background text-foreground p-6 shadow-lg">
          <div className="flex flex-col gap-3">
            <AlertDialog.Title className="text-lg font-semibold">{t('Still helping this client?')}</AlertDialog.Title>
            <AlertDialog.Description className="text-sm leading-relaxed text-muted-foreground">
              {t('After 20 minutes without activity, this conversation and client details are cleared from this screen. Choose Stay in session to continue.')}
            </AlertDialog.Description>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={onExpire}>{t('End session')}</Button>
              <Button ref={stayButton} onClick={() => stay.current()}>{t('Stay in session')}</Button>
            </div>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
