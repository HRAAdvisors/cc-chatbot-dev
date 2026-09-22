'use client';
import { useLanguage } from './LanguageProvider';
import ResourceDescription from './ResourceDescription';
import { translate, translateServiceType, type Locale } from '@/lib/i18n';
import { ExternalLink, MapPin } from 'lucide-react';
import CopyButton from './CopyButton';
import TextButton from './TextButton';
import DownloadCsvButton from './DownloadCsvButton';
import { getMapUrl, type ServiceWithDistance } from '@/lib/services-lookup';

export const formatServiceSms = (s: ServiceWithDistance, locale: Locale = 'en'): string => {
  const t = (key: string, values?: Record<string, string | number>) => translate(locale, key, values);
  const lines = [
    t('DIGITAL RESOURCE: {name}', { name: s.name }),
    '━━━━━━━━━━━━━━━━━━━━━━━',
    t('Type: {type}', { type: translateServiceType(locale, s.type) }),
  ];
  if (s.distanceMiles != null) lines.push(t('Distance: {distance} miles', { distance: s.distanceMiles.toFixed(1) }));
  if (s.phone) lines.push(t('Phone: {phone}', { phone: s.phone }));
  if (s.address && s.address !== 'Online / National') lines.push(t('Address: {address}', { address: s.address }));
  if (s.url) lines.push(t('Info: {url}', { url: s.url }));
  return lines.join('\n');
};

const SERVICE_CSV_HEADER = ['Name', 'Type', 'Distance (mi)', 'Phone', 'Address', 'Website'];

export const serviceCsvRows = (services: ServiceWithDistance[], locale: Locale = 'en'): Array<Array<string | number>> => [
  SERVICE_CSV_HEADER.map(label => translate(locale, label)),
  ...services.map(s => [
    s.name,
    translateServiceType(locale, s.type),
    s.distanceMiles != null ? s.distanceMiles.toFixed(1) : '',
    s.phone ?? '',
    s.address === 'Online / National' ? translate(locale, s.address) : s.address ?? '',
    s.url ?? '',
  ]),
];

function ServiceRow({ service }: { service: ServiceWithDistance }) {
  const { locale, t } = useLanguage();
  const mapUrl = getMapUrl(service);
  return (
    <div className="border-b border-border last:border-0 py-3.5 px-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-foreground">{service.name}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{translateServiceType(locale, service.type)}</p>
          {service.description && (
            <ResourceDescription text={service.description} />
          )}
        </div>
        {service.distanceMiles != null && (
          <span className="shrink-0 rounded-full bg-resource-muted px-2 py-0.5 text-xs font-medium text-resource-muted-foreground tabular-nums">{service.distanceMiles.toFixed(1)} mi</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 mt-2.5">
        {service.phone && (
          <a href={`tel:${service.phone}`} className="text-sm font-medium text-primary hover:underline">{service.phone}</a>
        )}
        {service.url && (
          <a href={service.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            {t('Website')} <ExternalLink size={11} />
          </a>
        )}
        {mapUrl && (
          <a href={mapUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            <MapPin size={11} /> {t('Map')}
          </a>
        )}
        <CopyButton text={formatServiceSms(service, locale)} />
        <TextButton text={formatServiceSms(service, locale)} />
      </div>
    </div>
  );
}

interface Props {
  services: ServiceWithDistance[];
  title?: string;
}

export default function ServiceCard({ services, title = 'Digital Equity Resources' }: Props) {
  const { locale, t } = useLanguage();
  if (!services.length) return null;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden mt-3">
      <div className="px-4 py-3 bg-resource-muted border-b border-border flex items-start justify-between gap-2">
        <p className="text-base font-semibold text-resource-muted-foreground">{t(title)}</p>
        <DownloadCsvButton filename="digital-resources.csv" rows={serviceCsvRows(services, locale)} className="shrink-0" />
      </div>
      {services.map((s, i) => <ServiceRow key={i} service={s} />)}
    </div>
  );
}
