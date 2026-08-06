'use client';
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
  return (
    <div className="max-h-[420px] overflow-y-auto overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-50">
          <tr className="border-b border-slate-200">
            {columns.map(col => (
              <th key={col.key} className={`text-left px-3 py-2 font-medium text-slate-600 ${col.className ?? ''}`}>
                {col.sortValue ? (
                  <button
                    onClick={() => onSortChange(col.key)}
                    className="inline-flex items-center gap-1 hover:text-blue-600 transition-colors"
                  >
                    {col.header}
                    {sort?.key === col.key
                      ? (sort.dir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />)
                      : <ArrowUpDown size={12} className="text-slate-300" />}
                  </button>
                ) : col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-slate-400">{emptyMessage}</td>
            </tr>
          ) : rows.map(row => (
            <tr key={rowKey(row)} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
              {columns.map(col => (
                <td key={col.key} className={`px-3 py-2.5 text-slate-700 ${col.className ?? ''}`}>{col.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
