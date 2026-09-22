'use client';
import { useLanguage } from './LanguageProvider';
import type { ReactNode } from 'react';
import { ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';

export interface SortState {
  key: string;
  dir: 'asc' | 'desc';
}

export interface Column<T> {
  key: string;
  header: string;
  sortValue?: (row: T) => string | number;
  render: (row: T) => ReactNode;
  className?: string;
}

interface Props<T> {
  columns: Array<Column<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  sort: SortState | null;
  onSortChange: (key: string) => void;
  emptyMessage?: string;
}

export default function SortableTable<T>({ columns, rows, rowKey, sort, onSortChange, emptyMessage = 'No results match your filters.' }: Props<T>) {
  const { t } = useLanguage();
  return (
    <div className="max-h-[420px] overflow-y-auto overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted z-10">
          <tr className="border-b border-border">
            {columns.map(col => (
              <th key={col.key} className={`text-left px-3 py-2.5 font-semibold text-muted-foreground ${col.className ?? ''}`}>
                {col.sortValue ? (
                  <button
                    onClick={() => onSortChange(col.key)}
                    className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    {t(col.header)}
                    {sort?.key === col.key
                      ? (sort.dir === 'asc' ? <ChevronUp size={13} className="text-primary" /> : <ChevronDown size={13} className="text-primary" />)
                      : <ArrowUpDown size={12} className="text-muted-foreground/40" />}
                  </button>
                ) : t(col.header)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-muted-foreground">{t(emptyMessage)}</td>
            </tr>
          ) : rows.map(row => (
            <tr key={rowKey(row)} className="border-b border-border last:border-0 hover:bg-muted/60 transition-colors">
              {columns.map(col => (
                <td key={col.key} className={`px-3 py-2.5 text-foreground align-top ${col.className ?? ''}`}>{col.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
