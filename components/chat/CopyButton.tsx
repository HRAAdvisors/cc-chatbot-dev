'use client';
import { useLanguage } from './LanguageProvider';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface Props {
  text: string;
  className?: string;
}

export default function CopyButton({ text, className = '' }: Props) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      title={t('Copy for SMS')}
      className={`inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors ${className}`}
    >
      {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
      {t(copied ? 'Copied!' : 'Copy')}
    </button>
  );
}
