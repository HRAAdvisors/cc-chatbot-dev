"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useLanguage } from "@/components/chat/LanguageProvider";
import { ACCESS_OPTIONS, GOALS, PEOPLE_OPTIONS, BUDGET_OPTIONS, COMFORT_OPTIONS, FORMAT_OPTIONS, type ResidentNeeds as Needs, type ResourceFocus } from "@/lib/resident-needs";

export default function ResidentNeeds({ draft, focus, onChange, onApply, onClear }: {
  draft: Needs; focus: ResourceFocus; onChange: (draft: Needs) => void; onApply: () => void; onClear: () => void;
}) {
  const { t } = useLanguage();
  const selectClass = "min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground";
  const choices = (id: keyof Omit<Needs, "goals">, label: string, options: readonly string[]) => (
    <Field>
      <FieldLabel htmlFor={`needs-${id}`}>{t(label)}</FieldLabel>
      <select id={`needs-${id}`} className={selectClass} value={draft[id]} onChange={(event) => onChange({ ...draft, [id]: event.target.value })}>
        <option value="">{t("Not sure / skip")}</option>
        {options.map((option) => <option key={option} value={option}>{t(option)}</option>)}
      </select>
    </Field>
  );
  return (
    <form className="flex flex-col gap-6" onSubmit={(event) => { event.preventDefault(); onApply(); }}>
      <p className="text-sm leading-relaxed text-muted-foreground">{t("A little context helps tailor the guidance. Every question is optional.")}</p>
      <FieldGroup>
        <FieldSet>
          <FieldLegend variant="label">{t("What will they use it for?")}</FieldLegend>
          <ToggleGroup multiple value={draft.goals} onValueChange={(goals) => onChange({ ...draft, goals: goals as string[] })} className="flex w-full flex-wrap justify-start" variant="outline" size="sm" aria-label={t("Resident goals")}>
            {GOALS.map((goal) => <ToggleGroupItem key={goal} value={goal}>{t(goal)}</ToggleGroupItem>)}
          </ToggleGroup>
        </FieldSet>
        {choices("access", "What do they have access to?", ACCESS_OPTIONS)}
        {focus === "all" || focus === "internet" ? choices("people", "How many people will be online at once?", PEOPLE_OPTIONS) : focus === "skills" ? choices("comfort", "How comfortable are they with computers?", COMFORT_OPTIONS) : null}
        <details>
          <summary className="cursor-pointer text-sm font-medium">{t("More preferences (optional)")}</summary>
          <div className="pt-5">
            <FieldGroup>
              {(focus === "all" || focus === "internet") && choices("budget", "Preferred monthly internet budget", BUDGET_OPTIONS)}
              {focus !== "skills" && choices("comfort", "How comfortable are they with computers?", COMFORT_OPTIONS)}
              {choices("format", "Preferred learning format", FORMAT_OPTIONS)}
            </FieldGroup>
          </div>
        </details>
      </FieldGroup>
      <p className="text-sm leading-relaxed text-muted-foreground">{t("Used for this resident session only. Preferences guide the conversation, not eligibility or confirmed availability.")}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="submit">{t("Apply needs")}</Button>
        <Button type="button" variant="ghost" onClick={onClear}>{t("Clear needs")}</Button>
      </div>
    </form>
  );
}
