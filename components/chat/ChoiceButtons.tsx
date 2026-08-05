'use client';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: Array<Option<T>>;
  onSelect: (value: T) => void;
}

export default function ChoiceButtons<T extends string>({ options, onSelect }: Props<T>) {
  return (
    <div className="flex flex-wrap gap-2 mt-2 mb-1">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onSelect(opt.value)}
          className="px-3.5 py-2 rounded-full border border-blue-200 bg-blue-50 hover:bg-blue-100 text-sm text-blue-700 font-medium transition-colors"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
