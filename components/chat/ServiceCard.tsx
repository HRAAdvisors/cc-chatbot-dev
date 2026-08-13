'use client';
import { ExternalLink, MapPin } from 'lucide-react';
import CopyButton from './CopyButton';
import TextButton from './TextButton';
import DownloadCsvButton from './DownloadCsvButton';
import { getMapUrl, type ServiceWithDistance } from '@/lib/services-lookup';

export const formatServiceSms = (s: ServiceWithDistance): string => {
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

const SERVICE_CSV_HEADER = ['Name', 'Type', 'Distance (mi)', 'Phone', 'Address', 'Website'];

export const serviceCsvRows = (services: ServiceWithDistance[]): Array<Array<string | number>> => [
  SERVICE_CSV_HEADER,
  ...services.map(s => [
    s.name,
    s.type,
    s.distanceMiles != null ? s.distanceMiles.toFixed(1) : '',
    s.phone ?? '',
    s.address ?? '',
    s.url ?? '',
  ]),
];

function ServiceRow({ service }: { service: ServiceWithDistance }) {
  const mapUrl = getMapUrl(service);
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
        {mapUrl && (
          <a href={mapUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
            <MapPin size={11} /> Map
          </a>
        )}
        <CopyButton text={formatServiceSms(service)} />
        <TextButton text={formatServiceSms(service)} />
      </div>
    </div>
  );
}

interface Props {
  services: ServiceWithDistance[];
  title?: string;
}

export default function ServiceCard({ services, title = 'Digital Equity Resources' }: Props) {
  if (!services.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mt-3">
      <div className="px-4 py-3 bg-green-50 border-b border-green-100 flex items-start justify-between gap-2">
        <p className="text-base font-semibold text-green-800">{title}</p>
        <DownloadCsvButton filename="digital-resources.csv" rows={serviceCsvRows(services)} className="shrink-0" />
      </div>
      {services.map((s, i) => <ServiceRow key={i} service={s} />)}
    </div>
  );
}
