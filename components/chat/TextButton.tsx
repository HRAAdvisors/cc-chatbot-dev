'use client';
import { MessageSquareText } from 'lucide-react';

interface Props {
  text: string;
  className?: string;
}

// No SMS-sending backend — this opens the visitor's own phone messaging app
// with the plan/service details pre-filled, so they pick the recipient and
// send it themselves.
export default function TextButton({ text, className = '' }: Props) {
  return (
    <a
      href={`sms:?body=${encodeURIComponent(text)}`}
      title="Text this to me"
      className={`inline-flex items-center gap-1 text-sm text-slate-400 hover:text-blue-600 transition-colors ${className}`}
    >
      <MessageSquareText size={13} />
      Text
    </a>
  );
}
