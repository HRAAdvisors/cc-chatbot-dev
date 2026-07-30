'use client';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import CopyButton from './CopyButton';
import type { Plan, PlanGroups } from '@/lib/plans';

const formatPlanSms = (plan: Plan, address?: string): string => {
  const lines = [
    address ? `INTERNET AT ${address.toUpperCase()}` : 'INTERNET PLAN',
    '━━━━━━━━━━━━━━━━━━━━',
    `${plan.provider} (${plan.technology})`,
    `• Speed: ${plan.downloadMbps} Mbps down / ${plan.uploadMbps} Mbps up`,
    `• Price: $${plan.price}/mo`,
  ];
  if (plan.introDiscount) lines.push(`• Intro: ${plan.introDiscount} for ${plan.introPeriod} mo`);
  if (plan.lowIncome === 'Y') lines.push(`• Low-income discount: $${plan.liDiscount} off`);
  if (plan.contract === 'Y') lines.push(`• Contract: ${plan.contractMonths} months`);
  if (plan.installFee) lines.push(`• Install: ${plan.installFee}`);
  lines.push('', 'Questions? clark.gov/broadband');
  return lines.join('\n');
};

function PlanRow({ plan, address }: { plan: Plan; address?: string }) {
  return (
    <div className="border-b last:border-0 py-3 px-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-base font-medium text-slate-800 truncate">{plan.planName || plan.provider}</p>
          <p className="text-sm text-slate-500">{plan.technology}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-base font-semibold text-slate-900">${plan.price}<span className="text-sm font-normal text-slate-500">/mo</span></p>
          <p className="text-sm text-slate-500">{plan.downloadMbps}/{plan.uploadMbps} Mbps</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {plan.lowIncome === 'Y' && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Low-income discount</span>
        )}
        {plan.contract === 'N' && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">No contract</span>
        )}
        {plan.meetsThreshold && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">100/25 Mbps+</span>
        )}
      </div>
      <div className="mt-2">
        <CopyButton text={formatPlanSms(plan, address)} />
      </div>
    </div>
  );
}

interface Props {
  planGroups: PlanGroups;
  address?: string;
}

export default function PlanCard({ planGroups, address }: Props) {
  const [openProviders, setOpenProviders] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    setOpenProviders(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const hasThreshold = planGroups.threshold.length > 0;
  const otherProviders = Object.entries(planGroups.byProvider);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mt-3">
      <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
        <p className="text-base font-semibold text-blue-800">Internet Plans Available</p>
        {address && <p className="text-sm text-blue-600 mt-0.5">{address}</p>}
      </div>

      {hasThreshold && (
        <div>
          <button
            onClick={() => toggle('__threshold')}
            className="w-full flex items-center justify-between px-4 py-2.5 text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            <span>High-speed plans (100/25 Mbps+)</span>
            {openProviders.has('__threshold') ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {openProviders.has('__threshold') && planGroups.threshold.map((p, i) => (
            <PlanRow key={i} plan={p} address={address} />
          ))}
        </div>
      )}

      {otherProviders.map(([provider, plans]) => (
        <div key={provider} className="border-t border-slate-100">
          <button
            onClick={() => toggle(provider)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            <span>{provider}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">{plans.length} plan{plans.length !== 1 ? 's' : ''}</span>
              {openProviders.has(provider) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>
          {openProviders.has(provider) && plans.map((p, i) => (
            <PlanRow key={i} plan={p} address={address} />
          ))}
        </div>
      ))}
    </div>
  );
}
