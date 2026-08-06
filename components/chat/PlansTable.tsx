'use client';
import { useMemo, useState } from 'react';
import SortableTable, { type Column, type SortState } from './SortableTable';
import DownloadCsvButton from './DownloadCsvButton';
import CopyButton from './CopyButton';
import { formatPlanSms, formatPrice, planCsvRows } from './PlanCard';
import { toNumber, type Plan } from '@/lib/plan-utils';

interface Props {
  plans: Plan[];
  address?: string;
}

export default function PlansTable({ plans, address }: Props) {
  const providers = useMemo(() => Array.from(new Set(plans.map(p => p.provider))).sort(), [plans]);

  const [provider, setProvider] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minDownload, setMinDownload] = useState('');
  const [noContractOnly, setNoContractOnly] = useState(false);
  const [lowIncomeOnly, setLowIncomeOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState | null>({ key: 'price', dir: 'asc' });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const max = toNumber(maxPrice);
    const minDl = toNumber(minDownload);
    return plans.filter(p => {
      if (provider && p.provider !== provider) return false;
      if (max != null && (toNumber(p.price) ?? Infinity) > max) return false;
      if (minDl != null && (toNumber(p.downloadMbps) ?? 0) < minDl) return false;
      if (noContractOnly && p.contract === 'Y') return false;
      if (lowIncomeOnly && p.lowIncome !== 'Y') return false;
      if (q && !`${p.provider} ${p.planName}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [plans, provider, maxPrice, minDownload, noContractOnly, lowIncomeOnly, search]);

  const columns: Array<Column<Plan>> = [
    { key: 'plan', header: 'Plan', sortValue: p => p.planName || p.provider, render: p => (
      <div>
        <p className="font-medium text-slate-800">{p.planName || p.provider}</p>
        <p className="text-xs text-slate-500">{p.provider} · {p.technology}</p>
      </div>
    ) },
    { key: 'price', header: 'Price/mo', sortValue: p => toNumber(p.price) ?? Infinity, render: p => formatPrice(p.price) },
    { key: 'download', header: 'Download', sortValue: p => toNumber(p.downloadMbps) ?? 0, render: p => `${p.downloadMbps} Mbps` },
    { key: 'upload', header: 'Upload', sortValue: p => toNumber(p.uploadMbps) ?? 0, render: p => `${p.uploadMbps} Mbps` },
    { key: 'contract', header: 'Contract', sortValue: p => p.contract === 'Y' ? 1 : 0, render: p => p.contract === 'Y' ? `${p.contractMonths} mo` : 'None' },
    { key: 'lowIncome', header: 'Low-Income', sortValue: p => p.lowIncome === 'Y' ? 1 : 0, render: p => p.lowIncome === 'Y' ? `$${p.liDiscount} off` : '—' },
    { key: 'copy', header: '', render: p => <CopyButton text={formatPlanSms(p, address)} /> },
  ];

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find(c => c.key === sort.key);
    if (!col?.sortValue) return filtered;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = col.sortValue!(a), bv = col.sortValue!(b);
      return av < bv ? -dir : av > bv ? dir : 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sort]);

  const handleSortChange = (key: string) => {
    setSort(prev => prev?.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mt-3">
      <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-start justify-between gap-2">
        <div>
          <p className="text-base font-semibold text-blue-800">Compare All Plans</p>
          {address && <p className="text-sm text-blue-600 mt-0.5">{address}</p>}
        </div>
        <DownloadCsvButton filename="internet-plans.csv" rows={planCsvRows(sorted)} className="shrink-0 mt-0.5" />
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/50 text-sm">
        <select value={provider} onChange={e => setProvider(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 bg-white text-slate-700">
          <option value="">All providers</option>
          {providers.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <input
          type="number" placeholder="Max price" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
          className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-slate-700 placeholder-slate-400"
        />
        <input
          type="number" placeholder="Min Mbps" value={minDownload} onChange={e => setMinDownload(e.target.value)}
          className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-slate-700 placeholder-slate-400"
        />
        <input
          type="text" placeholder="Search plan/provider" value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[140px] rounded-lg border border-slate-200 px-2 py-1.5 text-slate-700 placeholder-slate-400"
        />
        <label className="inline-flex items-center gap-1.5 text-slate-600">
          <input type="checkbox" checked={noContractOnly} onChange={e => setNoContractOnly(e.target.checked)} />
          No contract
        </label>
        <label className="inline-flex items-center gap-1.5 text-slate-600">
          <input type="checkbox" checked={lowIncomeOnly} onChange={e => setLowIncomeOnly(e.target.checked)} />
          Low-income discount
        </label>
      </div>

      <SortableTable
        columns={columns}
        rows={sorted}
        rowKey={p => `${p.provider}-${p.planName}-${p.downloadMbps}-${p.price}`}
        sort={sort}
        onSortChange={handleSortChange}
        emptyMessage="No plans match your filters."
      />
    </div>
  );
}
