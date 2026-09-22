'use client';
import { useLanguage } from './LanguageProvider';
import { Globe, GraduationCap, Laptop, ArrowRight, MousePointerClick, MapPin, ListChecks, type LucideIcon } from 'lucide-react';

export type PromptIntent = 'plans' | 'services';

const PROMPTS: Array<{ label: string; description: string; prompt: string; Icon: LucideIcon; intent: PromptIntent }> = [
  { label: 'Internet plans', description: "Find broadband options at your client's address", prompt: "Find internet plans at my client's address", Icon: Globe, intent: 'plans' },
  { label: 'Digital skills training', description: 'Locate classes and coaching near your client', prompt: 'Find digital skills training near my client', Icon: GraduationCap, intent: 'services' },
  { label: 'Free or low-cost devices', description: 'Find computers and tablets for your client', prompt: 'Find free or low-cost devices for my client', Icon: Laptop, intent: 'services' },
];

const HOW_TO_STEPS: Array<{ Icon: LucideIcon; title: string; body: string }> = [
  { Icon: MousePointerClick, title: 'Pick a topic', body: 'Choose Internet plans, digital-skills training, or devices from the cards above to start.' },
  { Icon: MapPin, title: 'Confirm the address', body: 'Enter or confirm your client’s Clark County address so results match where they live.' },
  { Icon: ListChecks, title: 'Review & filter results', body: 'Browse the matches, use the in-section search and filters, and share the options that fit best.' },
];

interface Props {
  onSelect: (prompt: string, intent: PromptIntent) => void;
  showAbout?: boolean;
}

export default function PromptSuggestions({ onSelect, showAbout = false }: Props) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-7">
      <div className="text-center mx-auto">
        <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-sm font-medium text-muted-foreground">
          {t('Clark County, Nevada')}
        </span>
        <h2 className="mt-4 text-3xl sm:text-4xl leading-tight font-semibold tracking-tight text-foreground text-balance">
          {t('Digital Navigation for Clark County Residents')}
        </h2>
        {/* <p className="mt-3 text-lg leading-relaxed text-muted-foreground text-pretty">
          {t("Choose a starting point below. I'll use the client's address to show the internet plans and digital-equity resources available to them.")}
        </p> */}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {PROMPTS.map(({ label, description, prompt, Icon, intent }) => (
          <button
            key={label}
            onClick={() => onSelect(prompt, intent)}
            className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground ring-1 ring-primary/10 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon aria-hidden="true" className="size-5" strokeWidth={2.25} />
            </span>
            <span className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-base font-semibold text-foreground">
                {t(label)}
                <ArrowRight aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transition-none" />
              </span>
              <span className="text-base leading-relaxed text-muted-foreground">{t(description)}</span>
            </span>
          </button>
        ))}
      </div>

      {showAbout && (
        <section aria-labelledby="about-heading" className="mt-3 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="grid md:grid-cols-2">
            <div className="relative min-h-56 sm:min-h-72 md:min-h-full">
              <img
                src="/images/clark-county-valley.png"
                alt={t('The Las Vegas valley in Clark County, Nevada at golden hour, with neighborhoods below desert mountains')}
                className="absolute inset-0 size-full object-cover"
              />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-primary/25 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-card/40" />
            </div>

            <div className="flex flex-col gap-5 p-6 sm:p-8">
              <div className="flex flex-col gap-2.5">
                <span className="inline-flex w-fit items-center rounded-full bg-brand-muted px-2.5 py-0.5 text-sm font-medium text-brand-muted-foreground">
                  {t('How it works')}
                </span>
                <h3 id="about-heading" className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground text-balance">
                  {t('Three steps to connect a client')}
                </h3>
                <p className="text-base leading-relaxed text-muted-foreground text-pretty">
                  {t("This assistant helps county staff and partners find affordable broadband, free or low-cost devices, and digital-skills support for residents. Here's how to use it.")}
                </p>
              </div>

              <ol className="flex flex-col gap-4">
                {HOW_TO_STEPS.map(({ Icon, title, body }, i) => (
                  <li key={title} className="flex items-start gap-3">
                    <span className="relative mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground ring-1 ring-primary/10">
                      <Icon aria-hidden="true" className="size-5" strokeWidth={2.25} />
                      <span aria-hidden="true" className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                        {i + 1}
                      </span>
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="text-base font-semibold text-foreground">{t(title)}</span>
                      <span className="text-base leading-relaxed text-muted-foreground">{t(body)}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
