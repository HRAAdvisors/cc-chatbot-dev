'use client';
import { useLanguage } from './LanguageProvider';
import { translateServiceType } from '@/lib/i18n';
import { resourceSpanish } from '@/lib/resource-translations';
import { useMemo, useState } from 'react';
import { ExternalLink, MapPin } from 'lucide-react';
import SortableTable, { type Column, type SortState } from './SortableTable';
import DownloadCsvButton from './DownloadCsvButton';
import CopyButton from './CopyButton';
import TextButton from './TextButton';
import { formatServiceSms, serviceCsvRows } from './ServiceCard';
import { flattenServiceGroups, getMapUrl, type ServiceGroups, type ServiceTier, type ServiceWithDistance } from '@/lib/services-lookup';
import { SERVICE_TYPES } from '@/lib/services';

type Row = ServiceWithDistance & { tier: ServiceTier };

const TIER_LABELS: Record<ServiceTier, string> = {
  within1: 'Within 1 mile',
  within5: '1 – 5 miles',
  within10: '5 – 10 miles',
  national: 'National / Online',
};

interface Props {
  serviceGroups: ServiceGroups;
  initialTypeFilter?: string;
}

export default function ServicesTable({ serviceGroups, initialTypeFilter }: Props) {
  const { locale, t } = useLanguage();
  const allRows = useMemo(() => flattenServiceGroups(serviceGroups), [serviceGroups]);

  const [type, setType] = useState(initialTypeFilter ?? '');
  const [tier, setTier] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState | null>({ key: 'distance', dir: 'asc' });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter(s => {
      if (type && !s.type.split(',').map(t => t.trim()).includes(type)) return false;
      if (tier && s.tier !== tier) return false;
      if (q && !`${s.name} ${s.description ?? ''} ${s.type} ${translateServiceType(locale, s.type)} ${s.description ? resourceSpanish[s.description] ?? '' : ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allRows, type, tier, search, locale]);

  const columns: Array<Column<Row>> = [
    { key: 'name', header: 'Name', sortValue: s => s.name, render: s => (
      <div className="min-w-[9rem]">
        <p className="font-semibold text-foreground">{s.name}</p>
        <p className="text-xs text-muted-foreground">{translateServiceType(locale, s.type)}</p>
      </div>
    ) },
    { key: 'distance', header: 'Distance', sortValue: s => s.distanceMiles ?? Infinity, render: s => <span className="whitespace-nowrap tabular-nums">{s.distanceMiles != null ? `${s.distanceMiles.toFixed(1)} mi` : t(TIER_LABELS[s.tier])}</span> },
    { key: 'phone', header: 'Phone', render: s => s.phone ? <a href={`tel:${s.phone}`} className="font-medium text-primary hover:underline">{s.phone}</a> : '–' },
    { key: 'website', header: 'Website', render: s => s.url ? (
      <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
        {t('Visit')} <ExternalLink size={11} />
      </a>
    ) : '–' },
    { key: 'map', header: 'Map', render: s => {
      const mapUrl = getMapUrl(s);
      return mapUrl ? (
        <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          <MapPin size={11} /> {t('Map')}
        </a>
      ) : '–';
    } },
    { key: 'copy', header: '', render: s => (
      <div className="flex items-center gap-3">
        <CopyButton text={formatServiceSms(s, locale)} />
        <TextButton text={formatServiceSms(s, locale)} />
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
      <div className="px-4 py-3 bg-resource-muted border-b border-border flex items-start justify-between gap-2">
        <p className="text-base font-semibold text-resource-muted-foreground">{t('Compare all digital equity resources')}</p>
        <DownloadCsvButton filename="digital-resources.csv" rows={serviceCsvRows(sorted, locale)} className="shrink-0" />
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border bg-muted/40 text-sm">
        <select aria-label={t('Type')} value={type} onChange={e => setType(e.target.value)} className="rounded-lg border border-input px-2.5 py-1.5 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">{t('All types')}</option>
          {SERVICE_TYPES.map(type => <option key={type} value={type}>{t(type)}</option>)}
        </select>
        <select aria-label={t('Distance')} value={tier} onChange={e => setTier(e.target.value)} className="rounded-lg border border-input px-2.5 py-1.5 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">{t('Any distance')}</option>
          {(Object.entries(TIER_LABELS) as Array<[ServiceTier, string]>).map(([k, label]) => <option key={k} value={k}>{t(label)}</option>)}
        </select>
        <input
          type="text" placeholder={t('Search name/description')} aria-label={t('Search name/description')} value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[160px] rounded-lg border border-input px-2.5 py-1.5 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <SortableTable
        columns={columns}
        rows={sorted}
        rowKey={s => `${s.name}-${s.tier}-${s.address}`}
        sort={sort}
        onSortChange={handleSortChange}
        emptyMessage="No resources match your filters."
      />
    </div>
  );
}
