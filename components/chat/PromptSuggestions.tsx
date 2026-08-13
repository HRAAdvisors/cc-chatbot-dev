'use client';

export type PromptIntent = 'plans' | 'services';

const PROMPTS: Array<{ label: string; icon: string; intent: PromptIntent }> = [
  { label: 'Find internet plans at my address', icon: '🌐', intent: 'plans' },
  { label: 'Find digital skills training near me', icon: '💻', intent: 'services' },
  { label: 'Low-cost or free internet options', icon: '💰', intent: 'plans' },
  { label: 'Device access programs near me', icon: '📱', intent: 'services' },
];

interface Props {
  onSelect: (prompt: string, intent: PromptIntent) => void;
}

export default function PromptSuggestions({ onSelect }: Props) {
  return (
    <div className="flex flex-col items-center gap-6 py-10">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-slate-800">How can I help you today?</h2>
        <p className="text-slate-500 text-base mt-1.5">
          Ask me about internet plans or digital resources in Clark County, NV
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        {PROMPTS.map((p) => (
          <button
            key={p.label}
            onClick={() => onSelect(p.label, p.intent)}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 text-left text-base text-slate-700 transition-colors shadow-sm"
          >
            <span className="text-xl">{p.icon}</span>
            <span>{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
