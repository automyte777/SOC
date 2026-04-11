/**
 * AdsAnalytics — Master Admin Analytics Dashboard
 *
 * Sections:
 *  1. Filter bar (date range, society, ad)
 *  2. KPI cards (Ads, Impressions, Clicks, CTR, Device split)
 *  3. Daily trend line chart (Impressions + Clicks)
 *  4. Impressions vs Clicks bar chart (last 14 days)
 *  5. Top performing ads table
 *  6. Society-wise analytics table
 *
 * All data fetched from:
 *   GET /api/master/ads/analytics/overview
 *   GET /api/master/ads/analytics/per-ad
 *   GET /api/master/ads/analytics/society
 */

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Megaphone, Eye, MousePointerClick, TrendingUp,
  Smartphone, Monitor, RefreshCw, Building2,
  ChevronUp, ChevronDown, Minus,
} from 'lucide-react';

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const fmt  = (n) => (n ?? 0).toLocaleString();
const pct  = (n) => (n == null ? '—' : `${n}%`);
const today = () => new Date().toISOString().split('T')[0];
const daysAgo = (d) => {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  return dt.toISOString().split('T')[0];
};

const COLORS = {
  impression: '#6366f1',
  click:      '#10b981',
  bar1:       '#818cf8',
  bar2:       '#34d399',
};

/* ── Trend badge helper ──────────────────────────────────────────────────── */
function TrendBadge({ value }) {
  if (value == null) return null;
  if (value > 0) return (
    <span className="aad-trend aad-trend-up">
      <ChevronUp className="aad-trend-icon" />{value}%
    </span>
  );
  if (value < 0) return (
    <span className="aad-trend aad-trend-down">
      <ChevronDown className="aad-trend-icon" />{Math.abs(value)}%
    </span>
  );
  return <span className="aad-trend aad-trend-flat"><Minus className="aad-trend-icon" />0%</span>;
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function AdsAnalytics({ secret }) {
  /* ── Filters ─────────────────────────────────────────────────────────── */
  const [from,     setFrom]     = useState(daysAgo(30));
  const [to,       setTo]       = useState(today());
  const [socId,    setSocId]    = useState('');
  const [adId,     setAdId]     = useState('');

  /* ── Data ────────────────────────────────────────────────────────────── */
  const [overview,   setOverview]   = useState(null);
  const [perAd,      setPerAd]      = useState([]);
  const [societies,  setSocieties]  = useState([]);
  const [allAds,     setAllAds]     = useState([]);  // for the ad filter dropdown
  const [allSocs,    setAllSocs]    = useState([]);  // for the society filter dropdown
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  const hdrs = { headers: { 'x-master-secret': secret } };

  /* ── Fetch filter options once ───────────────────────────────────────── */
  useEffect(() => {
    // Fetch all ads for filter dropdown
    axios.get('/api/master/ads', hdrs)
      .then(r => setAllAds(r.data.ads || []))
      .catch(() => {});
    // Fetch all societies for filter dropdown
    axios.get('/api/master/societies/all', hdrs)
      .then(r => setAllSocs(r.data.societies || []))
      .catch(() => {});
  }, []);

  /* ── Main data fetch ─────────────────────────────────────────────────── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (from)  qs.set('from',       from);
      if (to)    qs.set('to',         to);
      if (socId) qs.set('society_id', socId);
      if (adId)  qs.set('ad_id',      adId);
      const q = qs.toString() ? '?' + qs.toString() : '';

      const [r1, r2, r3] = await Promise.all([
        axios.get(`/api/master/ads/analytics/overview${q}`,  hdrs),
        axios.get(`/api/master/ads/analytics/per-ad${q}`,    hdrs),
        axios.get(`/api/master/ads/analytics/society${q}`,   hdrs),
      ]);

      if (r1.data.success) setOverview(r1.data);
      if (r2.data.success) setPerAd(r2.data.ads   || []);
      if (r3.data.success) setSocieties(r3.data.societies || []);
    } catch (e) {
      setError('Failed to load analytics. Check network or auth.');
    } finally {
      setLoading(false);
    }
  }, [from, to, socId, adId]);

  useEffect(() => { fetchAll(); }, []);

  /* ── Derived chart data ──────────────────────────────────────────────── */
  const daily14 = (overview?.daily || []).slice(-14).map(d => ({
    ...d,
    date: d.date ? new Date(d.date).toLocaleDateString('en-IN', { month:'short', day:'numeric' }) : d.date,
  }));

  const kpi = overview?.kpi || {};
  const topAds = [...perAd]
    .sort((a, b) => (b.impressions || 0) - (a.impressions || 0))
    .slice(0, 10);

  /* ─────────────────────────────────────────────────────────────── RENDER */
  return (
    <>
      <style>{STYLES}</style>

      <div className="aad-root">

        {/* ── Page title ── */}
        <div className="aad-header">
          <div>
            <h2 className="aad-title">
              <Megaphone className="aad-title-icon" />
              Ads Analytics
            </h2>
            <p className="aad-subtitle">Impressions, clicks, CTR — across all societies & campaigns</p>
          </div>
          <button className="aad-refresh-btn" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={`aad-refresh-icon ${loading ? 'aad-spin' : ''}`} />
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        {error && <div className="aad-error">{error}</div>}

        {/* ── Filters ── */}
        <div className="aad-filters">
          <div className="aad-filter-group">
            <label className="aad-filter-label">From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="aad-filter-input" />
          </div>
          <div className="aad-filter-group">
            <label className="aad-filter-label">To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="aad-filter-input" />
          </div>
          <div className="aad-filter-group">
            <label className="aad-filter-label">Society</label>
            <select value={socId} onChange={e => setSocId(e.target.value)} className="aad-filter-input">
              <option value="">All Societies</option>
              {allSocs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="aad-filter-group">
            <label className="aad-filter-label">Ad</label>
            <select value={adId} onChange={e => setAdId(e.target.value)} className="aad-filter-input">
              <option value="">All Ads</option>
              {allAds.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
          </div>
          <button className="aad-apply-btn" onClick={fetchAll} disabled={loading}>Apply Filters</button>
        </div>

        {/* ── KPI Cards ── */}
        <div className="aad-kpi-grid">
          {[
            {
              label:   'Active Ads',
              value:   fmt(kpi.total_ads),
              icon:    <Megaphone className="aad-kpi-icon" />,
              color:   'aad-kpi-purple',
            },
            {
              label:   'Total Impressions',
              value:   fmt(kpi.total_impressions),
              icon:    <Eye className="aad-kpi-icon" />,
              color:   'aad-kpi-blue',
            },
            {
              label:   'Total Clicks',
              value:   fmt(kpi.total_clicks),
              icon:    <MousePointerClick className="aad-kpi-icon" />,
              color:   'aad-kpi-green',
            },
            {
              label:   'Avg CTR',
              value:   pct(kpi.avg_ctr),
              icon:    <TrendingUp className="aad-kpi-icon" />,
              color:   'aad-kpi-amber',
            },
            {
              label:   'Mobile Events',
              value:   fmt(kpi.mobile_events),
              icon:    <Smartphone className="aad-kpi-icon" />,
              color:   'aad-kpi-pink',
            },
            {
              label:   'Desktop Events',
              value:   fmt(kpi.desktop_events),
              icon:    <Monitor className="aad-kpi-icon" />,
              color:   'aad-kpi-slate',
            },
          ].map((k, i) => (
            <div key={i} className={`aad-kpi-card ${k.color}`}>
              <div className="aad-kpi-icon-wrap">{k.icon}</div>
              <div className="aad-kpi-info">
                <p className="aad-kpi-label">{k.label}</p>
                <p className="aad-kpi-value">{loading ? '—' : k.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Charts row ── */}
        {!loading && daily14.length > 0 && (
          <div className="aad-charts-row">

            {/* Daily Impressions — Line Chart */}
            <div className="aad-chart-card aad-chart-wide">
              <h3 className="aad-chart-title">Daily Impressions &amp; Clicks (last 14 days)</h3>
              <ResponsiveContainer width="99%" height={220} minWidth={100} minHeight={220}>
                <LineChart data={daily14} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius:'12px', border:'1px solid #e2e8f0', fontSize:'12px' }} />
                  <Legend wrapperStyle={{ fontSize:'12px' }} />
                  <Line
                    type="monotone"
                    dataKey="impressions"
                    stroke={COLORS.impression}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: COLORS.impression }}
                    activeDot={{ r: 5 }}
                    name="Impressions"
                  />
                  <Line
                    type="monotone"
                    dataKey="clicks"
                    stroke={COLORS.click}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: COLORS.click }}
                    activeDot={{ r: 5 }}
                    name="Clicks"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Clicks vs Impressions — Bar Chart */}
            <div className="aad-chart-card aad-chart-narrow">
              <h3 className="aad-chart-title">Clicks vs Impressions</h3>
              <ResponsiveContainer width="99%" height={220} minWidth={100} minHeight={220}>
                <BarChart data={daily14.slice(-7)} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius:'12px', border:'1px solid #e2e8f0', fontSize:'12px' }} />
                  <Legend wrapperStyle={{ fontSize:'12px' }} />
                  <Bar dataKey="impressions" fill={COLORS.bar1} radius={[4,4,0,0]} name="Impressions" />
                  <Bar dataKey="clicks"      fill={COLORS.bar2} radius={[4,4,0,0]} name="Clicks" />
                </BarChart>
              </ResponsiveContainer>
            </div>

          </div>
        )}

        {/* ── Top Performing Ads Table ── */}
        <div className="aad-section">
          <h3 className="aad-section-title">
            <TrendingUp className="aad-section-icon" />
            Top Performing Ads
          </h3>
          <div className="aad-table-wrap">
            <table className="aad-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Ad Title</th>
                  <th>Status</th>
                  <th>Impressions</th>
                  <th>Clicks</th>
                  <th>CTR</th>
                  <th>Mobile</th>
                  <th>Desktop</th>
                </tr>
              </thead>
              <tbody>
                {topAds.length === 0 && !loading && (
                  <tr>
                    <td colSpan="8" className="aad-empty">No analytics data yet. Ads need to be viewed by residents first.</td>
                  </tr>
                )}
                {topAds.map((ad, i) => (
                  <tr key={ad.ad_id} className="aad-table-row">
                    <td className="aad-rank">{i + 1}</td>
                    <td className="aad-ad-title">{ad.title}</td>
                    <td>
                      <span className={`aad-badge ${ad.is_active ? 'aad-badge-active' : 'aad-badge-inactive'}`}>
                        {ad.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="aad-num aad-num-imp">{fmt(ad.impressions)}</td>
                    <td className="aad-num aad-num-clk">{fmt(ad.clicks)}</td>
                    <td className="aad-num aad-num-ctr">
                      <div className="aad-ctr-wrap">
                        <span>{pct(ad.ctr)}</span>
                        <div className="aad-ctr-bar-bg">
                          <div
                            className="aad-ctr-bar-fill"
                            style={{ width: `${Math.min(ad.ctr || 0, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="aad-num">{fmt(ad.mobile_events)}</td>
                    <td className="aad-num">{fmt(ad.desktop_events)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Society Analytics Table ── */}
        <div className="aad-section">
          <h3 className="aad-section-title">
            <Building2 className="aad-section-icon" />
            Society-wise Analytics
          </h3>
          <div className="aad-table-wrap">
            <table className="aad-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Society</th>
                  <th>Impressions</th>
                  <th>Clicks</th>
                  <th>CTR</th>
                  <th>Mobile Events</th>
                </tr>
              </thead>
              <tbody>
                {societies.length === 0 && !loading && (
                  <tr>
                    <td colSpan="6" className="aad-empty">No society data yet.</td>
                  </tr>
                )}
                {societies.map((s, i) => (
                  <tr key={s.society_id || i} className="aad-table-row">
                    <td className="aad-rank">{i + 1}</td>
                    <td className="aad-ad-title">{s.society_name || `Society #${s.society_id}`}</td>
                    <td className="aad-num aad-num-imp">{fmt(s.impressions)}</td>
                    <td className="aad-num aad-num-clk">{fmt(s.clicks)}</td>
                    <td className="aad-num aad-num-ctr">{pct(s.ctr)}</td>
                    <td className="aad-num">{fmt(s.mobile_events)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   INLINE STYLES  (scoped with aad- prefix, no Tailwind bleed)
══════════════════════════════════════════════════════════════════════════ */
const STYLES = `
/* Root */
.aad-root { display:flex; flex-direction:column; gap:1.5rem; }

/* Header */
.aad-header { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:1rem; }
.aad-title  { display:flex; align-items:center; gap:.5rem; font-size:1.35rem; font-weight:800; color:#0f172a; margin:0; }
.aad-title-icon { width:1.25rem; height:1.25rem; color:#6366f1; }
.aad-subtitle { font-size:.8rem; color:#64748b; margin:.25rem 0 0; }

/* Refresh button */
.aad-refresh-btn {
  display:inline-flex; align-items:center; gap:.4rem;
  padding:.5rem 1rem; border-radius:.6rem;
  background:#f8fafc; border:1px solid #e2e8f0;
  font-size:.78rem; font-weight:700; color:#475569; cursor:pointer;
  transition:all .15s;
}
.aad-refresh-btn:hover:not(:disabled) { background:#f1f5f9; color:#1e293b; }
.aad-refresh-btn:disabled { opacity:.6; cursor:not-allowed; }
.aad-refresh-icon { width:.85rem; height:.85rem; }
@keyframes aad-spin { to { transform:rotate(360deg); } }
.aad-spin { animation:aad-spin .7s linear infinite; }

/* Error */
.aad-error { background:#fef2f2; border:1px solid #fecaca; color:#dc2626; padding:.75rem 1rem; border-radius:.75rem; font-size:.82rem; font-weight:600; }

/* Filters */
.aad-filters { display:flex; flex-wrap:wrap; gap:.75rem; align-items:flex-end; background:#fff; border:1px solid #e2e8f0; border-radius:1rem; padding:1rem 1.25rem; }
.aad-filter-group { display:flex; flex-direction:column; gap:.25rem; min-width:100px; }
.aad-filter-label { font-size:.65rem; font-weight:800; text-transform:uppercase; letter-spacing:.06em; color:#94a3b8; }
.aad-filter-input {
  padding:.45rem .65rem; border:1px solid #e2e8f0; border-radius:.5rem;
  font-size:.8rem; color:#1e293b; background:#f8fafc; outline:none;
  transition:border-color .15s;
}
.aad-filter-input:focus { border-color:#6366f1; background:#fff; }
.aad-apply-btn {
  padding:.5rem 1.25rem; background:#6366f1; color:#fff; border:none;
  border-radius:.6rem; font-size:.8rem; font-weight:700; cursor:pointer;
  transition:background .15s; margin-top:1.1rem;
}
.aad-apply-btn:hover:not(:disabled) { background:#4f46e5; }
.aad-apply-btn:disabled { opacity:.6; cursor:not-allowed; }

/* KPI Grid */
.aad-kpi-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:1rem; }
.aad-kpi-card {
  display:flex; align-items:center; gap:.85rem;
  padding:1.1rem 1.25rem; border-radius:1rem; border:1px solid transparent;
  transition:box-shadow .2s;
}
.aad-kpi-card:hover { box-shadow:0 4px 16px rgba(0,0,0,.07); }
.aad-kpi-icon-wrap { width:2.5rem; height:2.5rem; border-radius:.6rem; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.aad-kpi-icon { width:1.1rem; height:1.1rem; }
.aad-kpi-info { min-width:0; }
.aad-kpi-label { font-size:.65rem; font-weight:800; text-transform:uppercase; letter-spacing:.06em; margin:0 0 .15rem; white-space:nowrap; }
.aad-kpi-value { font-size:1.45rem; font-weight:900; margin:0; letter-spacing:-.02em; }

/* KPI colours */
.aad-kpi-purple { background:linear-gradient(135deg,#eef2ff,#e0e7ff); border-color:#c7d2fe; }
.aad-kpi-purple .aad-kpi-icon-wrap { background:#6366f1; }
.aad-kpi-purple .aad-kpi-icon { color:#fff; }
.aad-kpi-purple .aad-kpi-label { color:#6366f1; }
.aad-kpi-purple .aad-kpi-value { color:#312e81; }

.aad-kpi-blue { background:linear-gradient(135deg,#eff6ff,#dbeafe); border-color:#bfdbfe; }
.aad-kpi-blue .aad-kpi-icon-wrap { background:#3b82f6; }
.aad-kpi-blue .aad-kpi-icon { color:#fff; }
.aad-kpi-blue .aad-kpi-label { color:#3b82f6; }
.aad-kpi-blue .aad-kpi-value { color:#1e3a8a; }

.aad-kpi-green { background:linear-gradient(135deg,#ecfdf5,#d1fae5); border-color:#a7f3d0; }
.aad-kpi-green .aad-kpi-icon-wrap { background:#10b981; }
.aad-kpi-green .aad-kpi-icon { color:#fff; }
.aad-kpi-green .aad-kpi-label { color:#10b981; }
.aad-kpi-green .aad-kpi-value { color:#064e3b; }

.aad-kpi-amber { background:linear-gradient(135deg,#fffbeb,#fef3c7); border-color:#fde68a; }
.aad-kpi-amber .aad-kpi-icon-wrap { background:#f59e0b; }
.aad-kpi-amber .aad-kpi-icon { color:#fff; }
.aad-kpi-amber .aad-kpi-label { color:#b45309; }
.aad-kpi-amber .aad-kpi-value { color:#78350f; }

.aad-kpi-pink { background:linear-gradient(135deg,#fdf2f8,#fce7f3); border-color:#f9a8d4; }
.aad-kpi-pink .aad-kpi-icon-wrap { background:#ec4899; }
.aad-kpi-pink .aad-kpi-icon { color:#fff; }
.aad-kpi-pink .aad-kpi-label { color:#be185d; }
.aad-kpi-pink .aad-kpi-value { color:#831843; }

.aad-kpi-slate { background:linear-gradient(135deg,#f8fafc,#f1f5f9); border-color:#e2e8f0; }
.aad-kpi-slate .aad-kpi-icon-wrap { background:#64748b; }
.aad-kpi-slate .aad-kpi-icon { color:#fff; }
.aad-kpi-slate .aad-kpi-label { color:#475569; }
.aad-kpi-slate .aad-kpi-value { color:#0f172a; }

/* Charts row */
.aad-charts-row { display:grid; grid-template-columns:2fr 1fr; gap:1rem; }
@media (max-width:900px) { .aad-charts-row { grid-template-columns:1fr; } }
.aad-chart-card { background:#fff; border:1px solid #e2e8f0; border-radius:1rem; padding:1.25rem 1.5rem; min-width: 0; min-height: 0; }
.aad-chart-title { font-size:.75rem; font-weight:800; text-transform:uppercase; letter-spacing:.06em; color:#475569; margin:0 0 1rem; }

/* Section */
.aad-section { display:flex; flex-direction:column; gap:.75rem; }
.aad-section-title { display:flex; align-items:center; gap:.45rem; font-size:.78rem; font-weight:800; text-transform:uppercase; letter-spacing:.07em; color:#475569; margin:0; }
.aad-section-icon { width:.9rem; height:.9rem; }

/* Table */
.aad-table-wrap { background:#fff; border:1px solid #e2e8f0; border-radius:1rem; overflow:hidden; overflow-x:auto; }
.aad-table { width:100%; border-collapse:collapse; font-size:.8rem; white-space:nowrap; }
.aad-table thead tr { background:#f8fafc; }
.aad-table th { padding:.75rem 1rem; text-align:left; font-size:.65rem; font-weight:800; text-transform:uppercase; letter-spacing:.07em; color:#94a3b8; border-bottom:1px solid #f1f5f9; }
.aad-table-row { transition:background .12s; border-bottom:1px solid #f8fafc; }
.aad-table-row:last-child { border-bottom:none; }
.aad-table-row:hover { background:#f8faff; }
.aad-table td { padding:.75rem 1rem; color:#334155; }
.aad-empty { text-align:center; padding:2.5rem; color:#94a3b8; font-style:italic; }

/* Table cell helpers */
.aad-rank { font-weight:900; color:#cbd5e1; width:2rem; text-align:center; }
.aad-ad-title { font-weight:700; color:#1e293b; max-width:200px; overflow:hidden; text-overflow:ellipsis; }
.aad-num { text-align:right; font-variant-numeric:tabular-nums; font-weight:600; }
.aad-num-imp { color:#3b82f6; }
.aad-num-clk { color:#10b981; }
.aad-num-ctr { color:#6366f1; }

/* CTR bar */
.aad-ctr-wrap { display:flex; flex-direction:column; align-items:flex-end; gap:.2rem; min-width:60px; }
.aad-ctr-bar-bg  { width:100%; height:4px; background:#e2e8f0; border-radius:99px; overflow:hidden; }
.aad-ctr-bar-fill { height:100%; background:linear-gradient(90deg,#818cf8,#6366f1); border-radius:99px; transition:width .4s ease; }

/* Badges */
.aad-badge { display:inline-block; padding:.2rem .55rem; border-radius:99px; font-size:.62rem; font-weight:800; text-transform:uppercase; letter-spacing:.05em; }
.aad-badge-active   { background:#d1fae5; color:#065f46; }
.aad-badge-inactive { background:#fee2e2; color:#991b1b; }

/* Trend */
.aad-trend { display:inline-flex; align-items:center; gap:.15rem; font-size:.68rem; font-weight:700; padding:.1rem .35rem; border-radius:.3rem; }
.aad-trend-icon   { width:.65rem; height:.65rem; }
.aad-trend-up     { background:#dcfce7; color:#16a34a; }
.aad-trend-down   { background:#fee2e2; color:#dc2626; }
.aad-trend-flat   { background:#f1f5f9; color:#64748b; }
`;
