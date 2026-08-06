'use client';
import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { HOUSEHOLD_SIZE_OPTIONS, USAGE_PROFILE_OPTIONS } from '@/lib/plan-utils';

interface Analytics {
  totals: { total_messages: string; total_sessions: string; unique_addresses: string };
  byIntent: Array<{ intent: string; count: string }>;
  byDay: Array<{ day: string; sessions: string; messages: string }>;
  recent: Array<{
    session_id: string; created_at: string; user_message: string;
    intent: string; address_queried: string | null;
    num_plans_returned: number | null; num_services_returned: number | null;
  }>;
  byHouseholdSize: Array<{ household_size: string; count: string }>;
  byUsageProfile: Array<{ usage_profile: string; count: string }>;
  byServiceType: Array<{ service_type_selected: string; count: string }>;
}

const INTENT_COLORS: Record<string, string> = {
  internet_offer: '#3b82f6',
  digital_equity: '#22c55e',
  other: '#94a3b8',
};

const INTENT_LABELS: Record<string, string> = {
  internet_offer: 'Internet Plans',
  digital_equity: 'Digital Resources',
  other: 'General',
};

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then(r => r.json())
      .then(setData)
      .catch(() => setError('Failed to load analytics'));
  }, []);

  if (error) return <div className="p-8 text-red-500 text-sm">{error}</div>;
  if (!data) return <div className="p-8 text-gray-400 text-sm">Loading…</div>;

  const intentData = data.byIntent.map(r => ({
    name: INTENT_LABELS[r.intent] ?? r.intent,
    value: Number(r.count),
    color: INTENT_COLORS[r.intent] ?? '#94a3b8',
  }));

  const dayData = data.byDay.map(r => ({
    day: r.day.slice(5, 10), // MM-DD from ISO string
    sessions: Number(r.sessions),
    messages: Number(r.messages),
  }));

  const householdSizeData = data.byHouseholdSize.map(r => ({
    name: HOUSEHOLD_SIZE_OPTIONS.find(o => o.value === r.household_size)?.label ?? r.household_size,
    value: Number(r.count),
  }));

  const usageProfileData = data.byUsageProfile.map(r => ({
    name: USAGE_PROFILE_OPTIONS.find(o => o.value === r.usage_profile)?.label ?? r.usage_profile,
    value: Number(r.count),
  }));

  const serviceTypeData = data.byServiceType.map(r => ({
    name: r.service_type_selected,
    value: Number(r.count),
  }));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Analytics Dashboard</h1>
        <p className="text-xs text-gray-500 mt-0.5">Clark County Digital Equity Chatbot</p>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Total Messages" value={Number(data.totals.total_messages).toLocaleString()} />
        <MetricCard label="Unique Sessions" value={Number(data.totals.total_sessions).toLocaleString()} />
        <MetricCard label="Unique Addresses Looked Up" value={Number(data.totals.unique_addresses).toLocaleString()} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Daily activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-700 mb-3">Daily Activity (last 30 days)</p>
          {dayData.length === 0
            ? <p className="text-xs text-gray-400">No data yet</p>
            : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dayData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="sessions" name="Sessions" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={40} isAnimationActive={false} />
                  <Bar dataKey="messages" name="Messages" fill="#93c5fd" radius={[3, 3, 0, 0]} maxBarSize={40} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>

        {/* Intent breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-700 mb-3">Intent Breakdown</p>
          {intentData.length === 0
            ? <p className="text-xs text-gray-400">No data yet</p>
            : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={intentData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="value" name="Messages" fill="#3b82f6" radius={[0, 3, 3, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>
      </div>

      {/* Guided-flow selections row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Household size */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-700 mb-3">Household Size Selected</p>
          {householdSizeData.length === 0
            ? <p className="text-xs text-gray-400">No data yet</p>
            : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={householdSizeData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
                  <Tooltip />
                  <Bar dataKey="value" name="Sessions" fill="#3b82f6" radius={[0, 3, 3, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>

        {/* Usage profile */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-700 mb-3">Usage Profile Selected</p>
          {usageProfileData.length === 0
            ? <p className="text-xs text-gray-400">No data yet</p>
            : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={usageProfileData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
                  <Tooltip />
                  <Bar dataKey="value" name="Sessions" fill="#22c55e" radius={[0, 3, 3, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>

        {/* Service type filter */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-700 mb-3">Service Type Filtered</p>
          {serviceTypeData.length === 0
            ? <p className="text-xs text-gray-400">No data yet</p>
            : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={serviceTypeData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
                  <Tooltip />
                  <Bar dataKey="value" name="Sessions" fill="#f59e0b" radius={[0, 3, 3, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>
      </div>

      {/* Recent conversations */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-700">Recent Messages</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-2 text-gray-500 font-medium">Time</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">Message</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">Intent</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">Address</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">Plans</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((row, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-400 whitespace-nowrap">
                    {new Date(row.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-2 text-gray-700 max-w-[200px] truncate">{row.user_message || '—'}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                      row.intent === 'internet_offer' ? 'bg-blue-100 text-blue-700'
                      : row.intent === 'digital_equity' ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                    }`}>
                      {INTENT_LABELS[row.intent] ?? row.intent}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-600 max-w-[150px] truncate">{row.address_queried || '—'}</td>
                  <td className="px-4 py-2 text-gray-500">{row.num_plans_returned ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
