'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { translate, type Locale, type TranslationValues } from '@/lib/i18n';

const LanguageContext = createContext({
  locale: 'en' as Locale,
  localeRef: { current: 'en' as Locale },
  setLocale: (() => {}) as (locale: Locale) => void,
  t: (key: string, values?: TranslationValues) => translate('en', key, values),
});

export function LanguageProvider({ children, initialLocale }: { children: ReactNode; initialLocale: Locale }) {
  const [locale, setLanguage] = useState<Locale>(initialLocale);
  const localeRef = useRef(initialLocale);
  const setLocale = useCallback((next: Locale) => {
    localeRef.current = next;
    setLanguage(next);
    document.cookie = `cc-language=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  }, []);
  const t = useCallback((key: string, values?: TranslationValues) => translate(locale, key, values), [locale]);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = translate(locale, 'Clark County Digital Equity Assistant');
    return () => { document.documentElement.lang = 'en'; };
  }, [locale]);
  const value = useMemo(() => ({ locale, localeRef, setLocale, t }), [locale, setLocale, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() { return useContext(LanguageContext); }

export function LanguageToggle({ tone = 'inverse' }: { tone?: 'inverse' | 'neutral' }) {
  const { locale, setLocale, t } = useLanguage();
  return (
    <select
      aria-label={t('Language')}
      value={locale}
      lang={locale}
      onChange={event => {
        const next = event.target.value;
        if (next === 'en' || next === 'es') setLocale(next);
      }}
      className={`min-h-11 cursor-pointer rounded-lg border-0 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${tone === 'neutral' ? 'bg-muted text-foreground hover:bg-accent focus-visible:outline-ring' : 'bg-transparent text-primary-foreground hover:text-primary-foreground focus-visible:outline-primary-foreground'}`}
    >
      <option value="en" lang="en" className="bg-popover text-popover-foreground">English</option>
      <option value="es" lang="es" className="bg-popover text-popover-foreground">Español</option>
    </select>
  );
}
