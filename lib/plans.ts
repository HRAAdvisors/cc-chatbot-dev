import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

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

// Load once at module init
const raw = fs.readFileSync(path.join(process.cwd(), 'public', 'plans_with_tech.csv'), 'utf8');
const plansData = Papa.parse<Record<string, string>>(raw, { header: true, skipEmptyLines: true }).data;

export const parseTechRules = (techrules: string): Set<string> => {
  if (!techrules) return new Set();
  return new Set(techrules.split(';').map(p => p.trim().split(':')[0].trim()).filter(Boolean));
};

export const matchPlans = (brandnames: string, techsAtAddress: Set<string>, bldType: string): Plan[] => {
  if (!brandnames) return [];
  const targetServiceType = bldType === 'B' ? 'Commercial' : 'Residential';
  const brands = brandnames.split(/;\s*/).map(b => b.trim().toLowerCase()).filter(Boolean);

  return plansData
    .filter(plan => {
      const provider = (plan['Providers'] || '').toLowerCase();
      if (!brands.some(b => provider.includes(b) || b.includes(provider))) return false;
      const serviceTypes = new Set((plan['Service Type'] || '').split(',').map(s => s.trim()));
      if (!serviceTypes.has('Residential') && !serviceTypes.has(targetServiceType)) return false;
      const planTechs = (plan['Technology'] || '').split(',').map(t => t.trim()).filter(Boolean);
      return planTechs.some(t => techsAtAddress.has(t));
    })
    .map(plan => {
      const dl = parseFloat(plan['Download Speed (Mbps)']) || 0;
      const ul = parseFloat(plan['Upload Speed (Mbps)']) || 0;
      return {
        planName:      plan['Plan Name'] || '',
        provider:      plan['Providers'] || '',
        technology:    (plan['Technology'] || '').trim() || 'Unknown',
        price:         plan['Full Monthly Price'] || '',
        introDiscount: plan['Intro Discount'] || '',
        introPeriod:   plan['Intro Period (months)'] || '',
        downloadMbps:  plan['Download Speed (Mbps)'] || '',
        uploadMbps:    plan['Upload Speed (Mbps)'] || '',
        dataCap:       plan['Data Cap? (Y/N)'] || '',
        dataCapGB:     plan['Data Cap (GB)'] || '',
        contract:      plan['Contract Required? (Y/N)'] || '',
        contractMonths:plan['Contract Length (months)'] || '',
        otherFees:     plan['Other Monthly Fees (Total Est.)'] || '',
        otherFeesNote: plan['Other Monthly Fees (Notes)'] || '',
        installFee:    plan['Installation Fees'] || '',
        etf:           plan['Early Termination Fee? (Y/N)'] || '',
        lowIncome:     plan['Low-Income Plan? (Y/N)'] || '',
        liDiscount:    plan['Low-Income Discount ($)'] || '',
        meetsThreshold: dl >= 100 && ul >= 25,
      };
    });
};

export const groupPlans = (matched: Plan[]): PlanGroups | null => {
  if (!matched.length) return null;
  const threshold = matched.filter(p => p.meetsThreshold);
  const byProvider: Record<string, Plan[]> = {};
  for (const plan of matched.filter(p => !p.meetsThreshold)) {
    const key = plan.provider.trim() || 'Other';
    if (!byProvider[key]) byProvider[key] = [];
    byProvider[key].push(plan);
  }
  return { threshold, byProvider };
};
