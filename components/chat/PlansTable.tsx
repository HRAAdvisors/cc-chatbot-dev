'use client';
import { useLanguage } from './LanguageProvider';
import { useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import SortableTable, { type Column, type SortState } from './SortableTable';
import DownloadCsvButton from './DownloadCsvButton';
import CopyButton from './CopyButton';
import TextButton from './TextButton';
import { formatPlanSms, formatPrice, planCsvRows } from './PlanCard';
import { getProviderWebsite, toNumber, type Plan } from '@/lib/plan-utils';

interface Props {
  plans: Plan[];
  address?: string;
}

export default function PlansTable({ plans, address }: Props) {
  const { locale, t } = useLanguage();
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
      <div className="min-w-[9rem]">
        <p className="font-semibold text-foreground">{p.planName || p.provider}</p>
        <p className="text-xs text-muted-foreground">{p.provider} · {t(p.technology)}</p>
      </div>
    ) },
    { key: 'price', header: 'Price/mo', sortValue: p => toNumber(p.price) ?? Infinity, render: p => formatPrice(p.price) },
    { key: 'download', header: 'Download', sortValue: p => toNumber(p.downloadMbps) ?? 0, render: p => `${p.downloadMbps} Mbps` },
    { key: 'upload', header: 'Upload', sortValue: p => toNumber(p.uploadMbps) ?? 0, render: p => `${p.uploadMbps} Mbps` },
    { key: 'contract', header: 'Contract', sortValue: p => p.contract === 'Y' ? 1 : 0, render: p => p.contract === 'Y' ? t('{count} mo', { count: p.contractMonths }) : t('None') },
    { key: 'lowIncome', header: 'Low-Income', sortValue: p => p.lowIncome === 'Y' ? 1 : 0, render: p => p.lowIncome === 'Y' ? t('{amount} off', { amount: formatPrice(p.liDiscount) }) : '–' },
    { key: 'website', header: 'Website', render: p => {
      const website = getProviderWebsite(p.provider);
      return website ? (
        <a href={website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          {t('Visit')} <ExternalLink size={11} />
        </a>
      ) : '–';
    } },
    { key: 'copy', header: '', render: p => (
      <div className="flex items-center gap-3">
        <CopyButton text={formatPlanSms(p, address, locale)} />
        <TextButton text={formatPlanSms(p, address, locale)} />
      </div>
    ) },
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
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden mt-3">
      <div className="px-4 py-3 bg-brand-muted border-b border-border flex items-start justify-between gap-2">
        <div>
          <p className="text-base font-semibold text-brand-muted-foreground">{t('Compare all plans')}</p>
          {address && <p className="text-sm text-brand-muted-foreground/80 mt-0.5">{address}</p>}
        </div>
        <DownloadCsvButton filename="internet-plans.csv" rows={planCsvRows(sorted, locale)} className="shrink-0 mt-0.5" />
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border bg-muted/40 text-sm">
        <select aria-label={t('Provider')} value={provider} onChange={e => setProvider(e.target.value)} className="rounded-lg border border-input px-2.5 py-1.5 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">{t('All providers')}</option>
          {providers.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <input
          type="number" placeholder={t('Max price')} aria-label={t('Max price')} value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
          className="w-24 rounded-lg border border-input px-2.5 py-1.5 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          type="number" placeholder={t('Min Mbps')} aria-label={t('Min Mbps')} value={minDownload} onChange={e => setMinDownload(e.target.value)}
          className="w-24 rounded-lg border border-input px-2.5 py-1.5 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          type="text" placeholder={t('Search plan/provider')} aria-label={t('Search plan/provider')} value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[140px] rounded-lg border border-input px-2.5 py-1.5 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <label className="inline-flex items-center gap-1.5 text-muted-foreground">
          <input type="checkbox" checked={noContractOnly} onChange={e => setNoContractOnly(e.target.checked)} className="size-4 accent-primary" />
          {t('No contract')}
        </label>
        <label className="inline-flex items-center gap-1.5 text-muted-foreground">
          <input type="checkbox" checked={lowIncomeOnly} onChange={e => setLowIncomeOnly(e.target.checked)} className="size-4 accent-primary" />
          {t('Low-income discount')}
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
