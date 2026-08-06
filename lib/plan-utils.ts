// Client-safe plan types and helpers — no Node built-ins (fs/path) here.
// lib/plans.ts (CSV loading + FCC matching, server-only) imports its types
// from this module; client components import these directly.

export interface Plan {
  planName: string; provider: string; technology: string;
  price: string; introDiscount: string; introPeriod: string;
  downloadMbps: string; uploadMbps: string;
  dataCap: string; dataCapGB: string;
  contract: string; contractMonths: string;
  otherFees: string; otherFeesNote: string; installFee: string;
  etf: string; lowIncome: string; liDiscount: string;
  meetsThreshold: boolean;
}

export interface PlanGroups {
  threshold: Plan[];
  byProvider: Record<string, Plan[]>;
}

export type HouseholdSize = '1' | '2-3' | '4-5' | '6+';
export type UsageProfile = 'basic' | 'streaming' | 'heavy';

export const HOUSEHOLD_SIZE_OPTIONS: Array<{ value: HouseholdSize; label: string; icon: string }> = [
  { value: '1', label: 'Just me (1 person)', icon: '🧑' },
  { value: '2-3', label: 'Small household (2-3 people)', icon: '👥' },
  { value: '4-5', label: 'Family household (4-5 people)', icon: '👨‍👩‍👧‍👦' },
  { value: '6+', label: 'Large household (6+ people)', icon: '🏠' },
];

export const USAGE_PROFILE_OPTIONS: Array<{ value: UsageProfile; label: string; icon: string }> = [
  { value: 'basic', label: 'Basic — browsing, email, video calls', icon: '📧' },
  { value: 'streaming', label: 'Streaming & remote work', icon: '🎬' },
  { value: 'heavy', label: 'Heavy use — gaming, smart home, many devices', icon: '🎮' },
];

const USAGE_BASELINE_MBPS: Record<UsageProfile, { dl: number; ul: number }> = {
  basic: { dl: 25, ul: 5 },
  streaming: { dl: 100, ul: 10 },
  heavy: { dl: 200, ul: 20 },
};

const HOUSEHOLD_MULTIPLIER: Record<HouseholdSize, number> = {
  '1': 1, '2-3': 1.3, '4-5': 1.6, '6+': 2,
};

// Price strings come out of the CSV as "$65.00 " — strip everything but
// digits/dot/minus before parsing so currency formatting doesn't break this.
export const toNumber = (s: string): number | null => {
  const n = parseFloat(String(s).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
};

export const flattenPlans = (planGroups: PlanGroups): Plan[] => [
  ...planGroups.threshold,
  ...Object.values(planGroups.byProvider).flat(),
];

export const getCheapestPlan = (plans: Plan[]): Plan | null => {
  const priced = plans.filter(p => toNumber(p.price) != null);
  if (!priced.length) return null;
  return priced.reduce((best, p) => (toNumber(p.price)! < toNumber(best.price)! ? p : best));
};

export const getFastestPlan = (plans: Plan[]): Plan | null => {
  const speeded = plans.filter(p => toNumber(p.downloadMbps) != null);
  if (!speeded.length) return null;
  return speeded.reduce((best, p) => {
    const dl = toNumber(p.downloadMbps)!;
    const bestDl = toNumber(best.downloadMbps)!;
    if (dl !== bestDl) return dl > bestDl ? p : best;
    return (toNumber(p.uploadMbps) ?? 0) > (toNumber(best.uploadMbps) ?? 0) ? p : best;
  });
};

export interface PlanRecommendation {
  plan: Plan | null;
  metRecommendedSpeed: boolean;
}

export const recommendPlan = (plans: Plan[], householdSize: HouseholdSize, usage: UsageProfile): PlanRecommendation => {
  const baseline = USAGE_BASELINE_MBPS[usage];
  const mult = HOUSEHOLD_MULTIPLIER[householdSize];
  const requiredDl = baseline.dl * mult;
  const requiredUl = baseline.ul * mult;

  const qualifying = plans.filter(p =>
    (toNumber(p.downloadMbps) ?? 0) >= requiredDl && (toNumber(p.uploadMbps) ?? 0) >= requiredUl
  );
  if (qualifying.length) {
    return { plan: getCheapestPlan(qualifying), metRecommendedSpeed: true };
  }
  return { plan: getFastestPlan(plans), metRecommendedSpeed: false };
};
