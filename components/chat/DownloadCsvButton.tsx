'use client';
import { useLanguage } from './LanguageProvider';
import { Download } from 'lucide-react';
import { downloadCsv } from '@/lib/csv';

interface Props {
  filename: string;
  rows: Array<Array<string | number | null | undefined>>;
  label?: string;
  className?: string;
}

export default function DownloadCsvButton({ filename, rows, label = 'CSV', className = '' }: Props) {
  const { t } = useLanguage();
  return (
    <button
      onClick={() => downloadCsv(filename, rows)}
      title={t('Download as CSV')}
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-sm text-muted-foreground hover:bg-accent hover:text-primary transition-colors ${className}`}
    >
      <Download size={13} />
      {label}
    </button>
  );
}
