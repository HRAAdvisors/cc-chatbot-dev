'use client';
import { useLanguage } from './LanguageProvider';

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: string;
}

interface Props<T extends string> {
  options: Array<Option<T>>;
  onSelect: (value: T) => void;
}

export default function ChoiceButtons<T extends string>({ options, onSelect }: Props<T>) {
  const { t } = useLanguage();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3 mb-1 max-w-lg">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onSelect(opt.value)}
          className="flex items-center gap-2.5 rounded-xl border border-primary/25 bg-accent px-4 py-3 text-left text-[0.95rem] font-medium text-accent-foreground shadow-sm transition-all hover:border-primary/45 hover:bg-primary hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
        >
          {opt.icon && <span aria-hidden="true" className="text-lg">{opt.icon}</span>}
          <span>{t(opt.label)}</span>
        </button>
      ))}
    </div>
  );
}
