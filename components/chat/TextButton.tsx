'use client';
import { MessageSquareText } from 'lucide-react';
import { useLanguage } from './LanguageProvider';

interface Props { text: string; className?: string }

// No SMS-sending backend — this opens the visitor's own phone messaging app
// with the plan/service details pre-filled, so they pick the recipient and
// send it themselves.
export default function TextButton({ text, className = '' }: Props) {
  const { t } = useLanguage();
  return (
    <a href={`sms:?body=${encodeURIComponent(text)}`} title={t('Text this to me')} className={`inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors ${className}`}>
      <MessageSquareText size={13} />{t('Text')}
    </a>
  );
}
