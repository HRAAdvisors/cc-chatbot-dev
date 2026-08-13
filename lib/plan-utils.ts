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
export type DeviceCount = '1-2' | '2-3' | '3-5' | '5-10' | '10-15' | '15-30' | '30+';

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

// Device counts include phones, laptops, smart TVs, consoles, and any other
// gadget that's online at the same time — not just computers. Labels stick to
// the count itself; usage type is asked separately in USAGE_PROFILE_OPTIONS,
// so repeating activity descriptions here just duplicated that question.
export const DEVICE_COUNT_OPTIONS: Array<{ value: DeviceCount; label: string; icon: string }> = [
  { value: '1-2', label: '1-2 devices', icon: '📱' },
  { value: '2-3', label: '2-3 devices', icon: '💻' },
  { value: '3-5', label: '3-5 devices', icon: '📺' },
  { value: '5-10', label: '5-10 devices', icon: '🎮' },
  { value: '10-15', label: '10-15 devices', icon: '🕹️' },
  { value: '15-30', label: '15-30 devices', icon: '🏠' },
  { value: '30+', label: '30+ devices', icon: '🏢' },
];

const USAGE_BASELINE_MBPS: Record<UsageProfile, { dl: number; ul: number }> = {
  basic: { dl: 25, ul: 5 },
  streaming: { dl: 100, ul: 10 },
  heavy: { dl: 200, ul: 20 },
};

const HOUSEHOLD_MULTIPLIER: Record<HouseholdSize, number> = {
  '1': 1, '2-3': 1.3, '4-5': 1.6, '6+': 2,
};

// Minimum recommended download speed per number of simultaneously connected
// devices, per the broadband speed guidance table (10 Mbps for 1-2 devices up
// to 2 Gbps for 30+). This is a floor: recommendPlan() also considers
// household size and usage, and never recommends below whichever is higher.
const DEVICE_COUNT_MIN_MBPS: Record<DeviceCount, number> = {
  '1-2': 10,
  '2-3': 25,
  '3-5': 100,
  '5-10': 200,
  '10-15': 500,
  '15-30': 1000,
  '30+': 2000,
};

// Provider names in the CSV have no website column, so official homepages
// are hardcoded here. Keyed by trimmed/lowercased provider name since the
// CSV's `Providers` field is used verbatim (see lib/plans.ts) and isn't
// guaranteed consistent casing/whitespace across rows.
const PROVIDER_WEBSITES_RAW: Record<string, string> = {
  'AT&T': 'https://www.att.com',
  'CenturyLink': 'https://www.centurylink.com',
  'Cogent Communication': 'https://www.cogentco.com',
  'Cox Communications': 'https://www.cox.com',
  'Fort Mojave Telecommunications Inc': 'https://www.ftmojave.com',
  'GeoLinks': 'https://www.geolinks.com',
  'Hotwire Communications': 'https://hotwirecommunications.com',
  'HughesNet': 'https://www.hughesnet.com',
  'InfoWest': 'https://infowest.com',
  'Kwikbit': 'https://www.kwikbit.com',
  'Moapa Valley Telephone Co.': 'https://mvtel.com',
  'NetFortris': 'https://www.netfortris.com',
  'Optimum': 'https://www.optimum.com',
  'Peerless Network': 'https://www.peerlessnetwork.com',
  'Rio Virgin Telephone': 'https://relianceconnects.com',
  'Rise Broadband': 'https://www.risebroadband.com',
  'Starlink': 'https://www.starlink.com',
  'Stimulus Technologies': 'https://www.stimulustech.com',
  'T-Mobile': 'https://www.t-mobile.com',
  'TDS Telecom': 'https://tdstelecom.com',
  'TPx Communications': 'https://www.tpx.com',
  'Tristate Wi-Fi by Wi-Fiber': 'https://www.tristatewifi.com',
  'Valley Communications Association Inc': 'https://www.valleycom.com',
  'Verizon': 'https://www.verizon.com',
  'Viasat Inc': 'https://www.viasat.com',
  'WeLink Communications Inc': 'https://welink.com',
  'isp.net': 'https://www.isp.net',
};

const normalizeProviderKey = (s: string) => s.trim().toLowerCase();

const PROVIDER_WEBSITES: Record<string, string> = Object.fromEntries(
  Object.entries(PROVIDER_WEBSITES_RAW).map(([k, v]) => [normalizeProviderKey(k), v])
);

export const getProviderWebsite = (provider: string): string | undefined =>
  PROVIDER_WEBSITES[normalizeProviderKey(provider)];

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

export const recommendPlan = (plans: Plan[], householdSize: HouseholdSize, usage: UsageProfile, deviceCount: DeviceCount): PlanRecommendation => {
  const baseline = USAGE_BASELINE_MBPS[usage];
  const mult = HOUSEHOLD_MULTIPLIER[householdSize];
  const requiredDl = Math.max(baseline.dl * mult, DEVICE_COUNT_MIN_MBPS[deviceCount]);
  const requiredUl = baseline.ul * mult;

  const qualifying = plans.filter(p =>
    (toNumber(p.downloadMbps) ?? 0) >= requiredDl && (toNumber(p.uploadMbps) ?? 0) >= requiredUl
  );
  if (qualifying.length) {
    return { plan: getCheapestPlan(qualifying), metRecommendedSpeed: true };
  }
  return { plan: getFastestPlan(plans), metRecommendedSpeed: false };
};
