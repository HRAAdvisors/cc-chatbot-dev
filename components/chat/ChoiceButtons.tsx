'use client';

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
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 mb-1 max-w-lg">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onSelect(opt.value)}
          className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 text-left text-base text-blue-700 font-medium transition-colors shadow-sm"
        >
          {opt.icon && <span className="text-xl">{opt.icon}</span>}
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
