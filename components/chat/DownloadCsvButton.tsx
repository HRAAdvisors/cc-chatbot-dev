'use client';
import { Download } from 'lucide-react';
import { downloadCsv } from '@/lib/csv';

interface Props {
  filename: string;
  rows: Array<Array<string | number | null | undefined>>;
  label?: string;
  className?: string;
}

export default function DownloadCsvButton({ filename, rows, label = 'CSV', className = '' }: Props) {
  return (
    <button
      onClick={() => downloadCsv(filename, rows)}
      title="Download as CSV"
      className={`inline-flex items-center gap-1 text-sm text-slate-400 hover:text-blue-600 transition-colors ${className}`}
    >
      <Download size={13} />
      {label}
    </button>
  );
}
