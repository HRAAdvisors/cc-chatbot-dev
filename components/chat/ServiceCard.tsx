'use client';
import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import CopyButton from './CopyButton';
import type { ServiceGroups, ServiceWithDistance } from '@/lib/services-lookup';

const formatServiceSms = (s: ServiceWithDistance): string => {
  const lines = [
    `DIGITAL RESOURCE: ${s.name}`,
    '━━━━━━━━━━━━━━━━━━━━━━━',
    `Type: ${s.type}`,
  ];
  if (s.distanceMiles != null) lines.push(`Distance: ${s.distanceMiles.toFixed(1)} miles`);
  if (s.phone) lines.push(`Phone: ${s.phone}`);
  if (s.address && s.address !== 'Online / National') lines.push(`Address: ${s.address}`);
  if (s.url) lines.push(`Info: ${s.url}`);
  return lines.join('\n');
};

function ServiceRow({ service }: { service: ServiceWithDistance }) {
  return (
    <div className="border-b last:border-0 py-3 px-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-base font-medium text-slate-800">{service.name}</p>
          <p className="text-sm text-slate-500 mt-0.5">{service.type}</p>
          {service.description && (
            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{service.description}</p>
          )}
        </div>
        {service.distanceMiles != null && (
          <span className="text-sm text-slate-400 shrink-0">{service.distanceMiles.toFixed(1)} mi</span>
        )}
      </div>
      <div className="flex items-center gap-3 mt-2">
        {service.phone && (
          <a href={`tel:${service.phone}`} className="text-sm text-blue-600 hover:underline">{service.phone}</a>
        )}
        {service.url && (
          <a href={service.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
            Website <ExternalLink size={11} />
          </a>
        )}
        <CopyButton text={formatServiceSms(service)} />
      </div>
    </div>
  );
}

const TIERS: Array<{ key: keyof ServiceGroups; label: string }> = [
  { key: 'within1',  label: 'Within 1 mile' },
  { key: 'within5',  label: '1 – 5 miles' },
  { key: 'within10', label: '5 – 10 miles' },
  { key: 'national', label: 'National / Online' },
];

interface Props {
  serviceGroups: ServiceGroups;
}

export default function ServiceCard({ serviceGroups }: Props) {
  const [openTiers, setOpenTiers] = useState<Set<string>>(new Set(['within1', 'national']));

  const toggle = (key: string) => {
    setOpenTiers(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const hasAny = TIERS.some(t => serviceGroups[t.key].length > 0);
  if (!hasAny) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mt-3">
      <div className="px-4 py-3 bg-green-50 border-b border-green-100">
        <p className="text-base font-semibold text-green-800">Digital Equity Resources</p>
      </div>

      {TIERS.map(({ key, label }) => {
        const services = serviceGroups[key];
        if (!services.length) return null;
        const isOpen = openTiers.has(key);
        return (
          <div key={key} className="border-t border-slate-100 first:border-t-0">
            <button
              onClick={() => toggle(key)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-base font-medium text-slate-700 hover:bg-slate-50"
            >
              <span>{label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">{services.length} resource{services.length !== 1 ? 's' : ''}</span>
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </button>
            {isOpen && services.map((s, i) => <ServiceRow key={i} service={s} />)}
          </div>
        );
      })}
    </div>
  );
}
