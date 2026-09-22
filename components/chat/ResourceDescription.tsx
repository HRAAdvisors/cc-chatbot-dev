'use client';
import { useLanguage } from './LanguageProvider';
import { resourceSpanish } from '@/lib/resource-translations';

export default function ResourceDescription({ text }: { text: string }) {
  const { locale, t } = useLanguage();
  const translation = resourceSpanish[text];
  if (locale === 'en') return <p lang="en" className="text-sm text-muted-foreground mt-1">{text}</p>;
  if (!translation) return (
    <div className="text-sm text-muted-foreground mt-1">
      <p>{t('Spanish translation unavailable. Original in English:')}</p>
      <p lang="en">{text}</p>
    </div>
  );
  return (
    <div className="text-sm text-muted-foreground mt-1">
      <p lang="es">{translation}</p>
      <details className="mt-2">
        <summary className="w-fit cursor-pointer rounded text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">{t('View original (English)')}</summary>
        <p lang="en" className="mt-1">{text}</p>
      </details>
    </div>
  );
}
