'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Download } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { HOUSEHOLD_SIZE_OPTIONS, USAGE_PROFILE_OPTIONS, DEVICE_COUNT_OPTIONS } from '@/lib/plan-utils';
import type { AddressPoint } from './AddressMap';

const AddressMap = dynamic(() => import('./AddressMap'), { ssr: false });

interface Analytics {
  totals: { total_messages: string; total_sessions: string; unique_addresses: string };
  byIntent: Array<{ intent: string; count: string }>;
  byDay: Array<{ day: string; sessions: string; messages: string }>;
  recent: Array<{
    id: number; session_id: string; created_at: string; user_message: string;
    intent: string; address_queried: string | null;
    num_plans_returned: number | null; num_services_returned: number | null;
  }>;
  recentSessions: Array<{
    session_id: string; started_at: string; ended_at: string; message_count: string;
    intents: string; address_queried: string | null;
    household_size: string | null; usage_profile: string | null; device_count: string | null;
    service_type_selected: string | null;
    num_plans_returned: number | null; num_services_returned: number | null;
  }>;
  byHouseholdSize: Array<{ household_size: string; count: string }>;
  byUsageProfile: Array<{ usage_profile: string; count: string }>;
  byDeviceCount: Array<{ device_count: string; count: string }>;
  byServiceType: Array<{ service_type_selected: string; count: string }>;
  byZipIntent: Array<{ zip: string; intent: string; count: string }>;
  addressPoints: AddressPoint[];
  districtOptions: Array<{ value: string; label: string }>;
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

function DownloadLink({ href, title }: { href: string; title: string }) {
  return (
    <a
      href={href}
      download
      title={title}
      className="inline-flex items-center justify-center text-gray-400 hover:text-blue-600"
      onClick={e => e.stopPropagation()}
    >
      <Download className="w-3.5 h-3.5" />
    </a>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState('');
  const [view, setView] = useState<'messages' | 'sessions'>('messages');
  const [intent, setIntent] = useState('');
  const [district, setDistrict] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filterParams = new URLSearchParams({
    ...(intent && { intent }),
    ...(district && { district }),
    ...(dateFrom && { from: dateFrom }),
    ...(dateTo && { to: dateTo }),
  }).toString();

  useEffect(() => {
    fetch(`/api/admin/analytics${filterParams ? `?${filterParams}` : ''}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => setError('Failed to load analytics'));
  }, [filterParams]);

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

  const deviceCountData = data.byDeviceCount.map(r => ({
    name: DEVICE_COUNT_OPTIONS.find(o => o.value === r.device_count)?.label ?? r.device_count,
    value: Number(r.count),
  }));

  const serviceTypeData = data.byServiceType.map(r => ({
    name: r.service_type_selected,
    value: Number(r.count),
  }));

  interface ZipRow { zip: string; internet_offer: number; digital_equity: number; other: number }
  const zipByCode = new Map<string, ZipRow>();
  for (const r of data.byZipIntent) {
    const row = zipByCode.get(r.zip) ?? { zip: r.zip, internet_offer: 0, digital_equity: 0, other: 0 };
    row[r.intent as keyof Omit<ZipRow, 'zip'>] = Number(r.count);
    zipByCode.set(r.zip, row);
  }
  const zipData = Array.from(zipByCode.values())
    .sort((a, b) => (b.internet_offer + b.digital_equity + b.other) - (a.internet_offer + a.digital_equity + a.other));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-xs text-gray-500 mt-0.5">Clark County Digital Navigator Assistant</p>
      </div>

      {/* Filters — apply to every chart, the map, and the table/CSV export below */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Intent</label>
          <select
            value={intent}
            onChange={e => setIntent(e.target.value)}
            className="text-xs rounded-lg border border-gray-200 px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All</option>
            <option value="internet_offer">Internet Plans</option>
            <option value="digital_equity">Digital Resources</option>
            <option value="other">General</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Commissioner District</label>
          <select
            value={district}
            onChange={e => setDistrict(e.target.value)}
            className="text-xs rounded-lg border border-gray-200 px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All</option>
            {data.districtOptions.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="text-xs rounded-lg border border-gray-200 px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="text-xs rounded-lg border border-gray-200 px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {(intent || district || dateFrom || dateTo) && (
          <button
            onClick={() => { setIntent(''); setDistrict(''); setDateFrom(''); setDateTo(''); }}
            className="text-xs font-medium text-gray-400 hover:text-gray-600 pb-1.5"
          >
            Clear filters
          </button>
        )}
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
          <p className="text-sm font-medium text-gray-700 mb-3">
            Daily Activity{dateFrom || dateTo ? ` (${dateFrom || '…'} – ${dateTo || '…'})` : ''}
          </p>
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

      {/* Guided-flow selections */}
      <div className="grid grid-cols-2 gap-4">
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

        {/* Device count */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-700 mb-3">Number of Devices Selected</p>
          {deviceCountData.length === 0
            ? <p className="text-xs text-gray-400">No data yet</p>
            : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={deviceCountData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
                  <Tooltip />
                  <Bar dataKey="value" name="Sessions" fill="#8b5cf6" radius={[0, 3, 3, 0]} isAnimationActive={false} />
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

      {/* Zip code breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-medium text-gray-700 mb-3">Addresses Searched by ZIP Code</p>
        {zipData.length === 0
          ? <p className="text-xs text-gray-400">No data yet</p>
          : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={zipData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="zip" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} formatter={(value: string) => INTENT_LABELS[value] ?? value} />
                <Bar dataKey="internet_offer" name="internet_offer" stackId="zip" fill={INTENT_COLORS.internet_offer} isAnimationActive={false} />
                <Bar dataKey="digital_equity" name="digital_equity" stackId="zip" fill={INTENT_COLORS.digital_equity} isAnimationActive={false} />
                <Bar dataKey="other" name="other" stackId="zip" fill={INTENT_COLORS.other} radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )
        }
      </div>

      {/* Address search map */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-medium text-gray-700 mb-3">Address Search Locations</p>
        {data.addressPoints.length === 0
          ? <p className="text-xs text-gray-400">No data yet</p>
          : (
            <div className="h-96">
              <AddressMap points={data.addressPoints} />
            </div>
          )
        }
      </div>

      {/* Recent conversations */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setView('messages')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                view === 'messages' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Messages
            </button>
            <button
              onClick={() => setView('sessions')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                view === 'sessions' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sessions
            </button>
          </div>
          <a
            href={`/api/admin/export?type=${view}${filterParams ? `&${filterParams}` : ''}`}
            download
            className="text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Download CSV
          </a>
        </div>
        <div className="overflow-x-auto">
          {view === 'messages' ? (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Time</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Message</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Intent</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Address</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Plans</th>
                  <th className="px-4 py-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {data.recent.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50">
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
                    <td className="px-4 py-2">
                      <DownloadLink href={`/api/admin/export?type=message&id=${row.id}`} title="Download this message as CSV" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Started</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Messages</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Intents</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Address</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Household</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Devices</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Usage</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Plans</th>
                  <th className="px-4 py-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {data.recentSessions.map((row) => (
                  <tr key={row.session_id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-400 whitespace-nowrap">
                      {new Date(row.started_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{row.message_count}</td>
                    <td className="px-4 py-2 text-gray-600 max-w-[160px] truncate">
                      {row.intents.split(', ').map(i => INTENT_LABELS[i] ?? i).join(', ')}
                    </td>
                    <td className="px-4 py-2 text-gray-600 max-w-[150px] truncate">{row.address_queried || '—'}</td>
                    <td className="px-4 py-2 text-gray-500">
                      {HOUSEHOLD_SIZE_OPTIONS.find(o => o.value === row.household_size)?.label ?? row.household_size ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-gray-500">
                      {DEVICE_COUNT_OPTIONS.find(o => o.value === row.device_count)?.label ?? row.device_count ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-gray-500">
                      {USAGE_PROFILE_OPTIONS.find(o => o.value === row.usage_profile)?.label ?? row.usage_profile ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{row.num_plans_returned ?? '—'}</td>
                    <td className="px-4 py-2">
                      <DownloadLink href={`/api/admin/export?type=session&id=${row.session_id}`} title="Download this session's transcript as CSV" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
