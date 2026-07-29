'use client';

const PROMPTS = [
  { label: 'Find internet plans at my address', icon: '🌐' },
  { label: 'Find digital skills training near me', icon: '💻' },
  { label: 'Low-cost or free internet options', icon: '💰' },
  { label: 'Device access programs near me', icon: '📱' },
];

interface Props {
  onSelect: (prompt: string) => void;
}

export default function PromptSuggestions({ onSelect }: Props) {
  return (
    <div className="flex flex-col items-center gap-6 py-8 px-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-800">How can I help you today?</h2>
        <p className="text-gray-500 text-sm mt-1">
          Ask me about internet plans or digital resources in Clark County, NV
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
        {PROMPTS.map((p) => (
          <button
            key={p.label}
            onClick={() => onSelect(p.label)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-300 text-left text-sm text-gray-700 transition-colors shadow-sm"
          >
            <span className="text-lg">{p.icon}</span>
            <span>{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
