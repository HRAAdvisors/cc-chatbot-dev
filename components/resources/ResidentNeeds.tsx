"use client";

import { Wifi, Laptop, GraduationCap, Layers, MapPin, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatInput from "@/components/chat/ChatInput";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useLanguage } from "@/components/chat/LanguageProvider";
import { ACCESS_OPTIONS, GOALS, PEOPLE_OPTIONS, BUDGET_OPTIONS, COMFORT_OPTIONS, FORMAT_OPTIONS, DEVICE_OPTIONS, DEVICE_COST_OPTIONS, LEARNING_OPTIONS, LANGUAGE_OPTIONS, type ResidentNeeds as Needs, type ResourceFocus } from "@/lib/resident-needs";

const options = [
  { value: "internet", label: "Internet plans", icon: Wifi },
  { value: "devices", label: "Free or low-cost device access", icon: Laptop },
  { value: "skills", label: "Digital skills training", icon: GraduationCap },
  { value: "all", label: "A combination / general guidance", icon: Layers },
] as const;

export default function ResidentNeeds({ draft, onChange, onApply, onClear, address, onAddressChange, onShowResources, busy }: {
  draft: Needs; onChange: (draft: Needs) => void; onApply: () => void; onClear: () => void;
  address: string; onAddressChange: (address: string) => void; onShowResources: (address?: string) => void; busy?: boolean;
}) {
  const { t } = useLanguage();
  const choices = (id: "access" | "people" | "budget" | "deviceType" | "deviceCost" | "comfort" | "format" | "language", label: string, values: readonly string[]) => (
    <Field>
      <FieldLabel htmlFor={`needs-${id}`}>{t(label)}</FieldLabel>
      <select id={`needs-${id}`} className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground" value={draft[id]} onChange={(event) => onChange({ ...draft, [id]: event.target.value })}>
        <option value="">{t("Not sure / skip")}</option>
        {values.map((option) => <option key={option} value={option}>{t(option)}</option>)}
      </select>
    </Field>
  );
  const multiple = (id: "goals" | "learningTopics", label: string, values: readonly string[]) => (
    <FieldSet>
      <FieldLegend variant="label">{t(label)}</FieldLegend>
      <ToggleGroup multiple value={draft[id]} onValueChange={(value) => onChange({ ...draft, [id]: value as string[] })} className="bace-needs-tags flex w-full flex-wrap justify-start" variant="outline" size="sm" aria-label={t(label)}>
        {values.map((option) => <ToggleGroupItem key={option} value={option}>{t(option)}</ToggleGroupItem>)}
      </ToggleGroup>
    </FieldSet>
  );
  const internet = draft.lookingFor === "all" || draft.lookingFor === "internet";
  const devices = draft.lookingFor === "all" || draft.lookingFor === "devices";
  const skills = draft.lookingFor === "all" || draft.lookingFor === "skills";

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm leading-relaxed text-muted-foreground">{t("Choose the support they need. We’ll show just the relevant questions, and every answer is optional.")}</p>
      <details open className="bace-needs-selector">
        <summary className="cursor-pointer text-sm font-semibold">{t("What is the resident looking for?")}</summary>
        <ToggleGroup orientation="vertical" value={[draft.lookingFor]} onValueChange={(value) => onChange({ ...draft, lookingFor: value[0] as ResourceFocus || "all" })} className="bace-scope-options mt-4" aria-label={t("What is the resident looking for?")}>
          {options.map(({ value, label, icon: Icon }) => <ToggleGroupItem key={value} value={value} className="bace-scope-option"><Icon aria-hidden="true" /><span className="flex-1 whitespace-normal text-left leading-relaxed">{t(label)}</span></ToggleGroupItem>)}
        </ToggleGroup>
      </details>
      <FieldSet className="bace-needs-section">
        <FieldLegend>{t("Their starting point")}</FieldLegend>
        <FieldGroup>
          {choices("access", "What do they have access to?", ACCESS_OPTIONS)}
          {draft.lookingFor !== "skills" && multiple("goals", "What will they use it for?", GOALS)}
        </FieldGroup>
      </FieldSet>
      {internet && <FieldSet className="bace-needs-section" data-category="internet">
        <FieldLegend><Wifi className="size-4" aria-hidden="true" />{t("Internet needs")}</FieldLegend>
        <FieldGroup>{choices("people", "How many people will be online at once?", PEOPLE_OPTIONS)}{choices("budget", "Preferred monthly internet budget", BUDGET_OPTIONS)}</FieldGroup>
      </FieldSet>}
      {devices && <FieldSet className="bace-needs-section" data-category="devices">
        <FieldLegend><Laptop className="size-4" aria-hidden="true" />{t("Device & access needs")}</FieldLegend>
        <FieldGroup>{choices("deviceType", "What kind of device or access would help?", DEVICE_OPTIONS)}{choices("deviceCost", "What device cost works for them?", DEVICE_COST_OPTIONS)}</FieldGroup>
      </FieldSet>}
      {skills && <FieldSet className="bace-needs-section" data-category="skills">
        <FieldLegend><GraduationCap className="size-4" aria-hidden="true" />{t("Training needs")}</FieldLegend>
        <FieldGroup>{multiple("learningTopics", "What would they like to learn?", LEARNING_OPTIONS)}{choices("comfort", "How comfortable are they with computers?", COMFORT_OPTIONS)}{choices("format", "Preferred learning format", FORMAT_OPTIONS)}{choices("language", "Preferred training language", LANGUAGE_OPTIONS)}</FieldGroup>
      </FieldSet>}
      <FieldSet className="bace-needs-section bace-needs-address">
        <FieldLegend><MapPin className="size-4" aria-hidden="true" />{t("Where does the resident live?")}</FieldLegend>
        <Field>
          <FieldLabel htmlFor="needs-address">{t("Resident address")}</FieldLabel>
          <ChatInput addressOnly hideSubmit inputId="needs-address" initialValue={address} onValueChange={onAddressChange} onSend={(text) => { onAddressChange(text); onShowResources(text); }} disabled={busy} placeholder="@ to search address" />
          <FieldDescription>{t("Used to find plans and nearby programs. It is not added to the printout unless you choose to.")}</FieldDescription>
        </Field>
      </FieldSet>
      <p className="text-sm leading-relaxed text-muted-foreground">{t("This tailors guidance, not eligibility. Details stay in this resident session.")}</p>
      <div className="bace-needs-actions">
        <Button type="button" disabled={!address.trim() || busy} onClick={() => onShowResources()}><Table2 data-icon="inline-start" aria-hidden="true" />{t(busy ? "Finding resources…" : "Show resources")}</Button>
        <Button type="button" variant="outline" onClick={onApply}>{t("Apply needs")}</Button>
        <Button type="button" variant="ghost" onClick={onClear}>{t("Clear needs")}</Button>
      </div>
    </div>
  );
}
