/**
 * ChartsSection — lazy-loaded dashboard charts.
 * Visitor trend area chart + Maintenance collection bar chart.
 */
import React from 'react';
import { TrendingUp, CreditCard } from 'lucide-react';
import {
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function ChartsSection({ chartData }) {
  const { visitorTrend = [], maintenanceTrend = [] } = chartData;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Visitor Trend */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Visitor Trend</h3>
            <p className="text-sm text-slate-500">Daily guest entries over last 7 days</p>
          </div>
          <div className="p-2 bg-blue-50 rounded-lg">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={visitorTrend}>
              <defs>
                <linearGradient id="colorVisitor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="date" axisLine={false} tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickFormatter={value => new Date(value).toLocaleDateString([], { weekday: 'short' })}
              />
              <YAxis hide />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} cursor={{ stroke: '#2563eb', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorVisitor)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Maintenance Collection */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Maintenance Collection</h3>
            <p className="text-sm text-slate-500">Monthly revenue collection overview</p>
          </div>
          <div className="p-2 bg-emerald-50 rounded-lg">
            <CreditCard className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={maintenanceTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={v => `₹${v}`} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="total" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={40} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
