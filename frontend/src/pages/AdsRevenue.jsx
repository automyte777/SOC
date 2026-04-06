import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  IndianRupee, TrendingUp, Clock, CheckCircle2, XCircle,
  RefreshCw, AlertCircle, Loader2, Building2, BarChart3,
  ChevronDown, ChevronUp, CreditCard, User, Phone,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

/* ── Helpers ─────────────────────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

const BAR_COLORS = ['#7c3aed', '#6d28d9', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe', '#f5f3ff', '#4c1d95', '#5b21b6'];

/* ── KPI Card ─────────────────────────────────────────────────────────── */
function KpiCard({ icon: Icon, label, value, sub, color, bg }) {
  return (
    <div className={`rev-kpi ${bg}`}>
      <div className={`rev-kpi-icon ${color}`}><Icon className="w-5 h-5" /></div>
      <div>
        <p className="rev-kpi-label">{label}</p>
        <p className={`rev-kpi-val ${color}`}>{value}</p>
        {sub && <p className="rev-kpi-sub">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Payment Status Badge ─────────────────────────────────────────────── */
function PayBadge({ status, onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`rev-pay-badge ${status === 'paid' ? 'rev-badge-paid' : 'rev-badge-pending'}`}
      title={`Click to mark as ${status === 'paid' ? 'pending' : 'paid'}`}
    >
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : status === 'paid' ? (
        <><CheckCircle2 className="w-3 h-3" /> Paid</>
      ) : (
        <><Clock className="w-3 h-3" /> Pending</>
      )}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════ */
export default function AdsRevenue({ secret }) {
  const [overview, setOverview]       = useState(null);
  const [monthly,  setMonthly]        = useState([]);
  const [societies, setSocieties]     = useState([]);
  const [allAds,   setAllAds]         = useState([]);
  const [loading,  setLoading]        = useState(true);
  const [error,    setError]          = useState('');
  const [togglingId, setTogglingId]   = useState(null);
  const [socExpanded, setSocExpanded] = useState(false);

  const hdrs = { headers: { 'x-master-secret': secret } };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ovRes, mnRes, socRes] = await Promise.all([
        axios.get('/api/master/ads/revenue/overview', hdrs),
        axios.get('/api/master/ads/revenue/monthly',  hdrs),
        axios.get('/api/master/ads/revenue/society',  hdrs),
      ]);
      setOverview(ovRes.data.kpi || {});
      setMonthly(mnRes.data.monthly || []);
      setSocieties(socRes.data.societies || []);
      setAllAds(socRes.data.all_ads || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load revenue data.');
    } finally {
      setLoading(false);
    }
  }, [secret]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const togglePayment = async (ad) => {
    const newStatus = ad.payment_status === 'paid' ? 'pending' : 'paid';
    if (!window.confirm(`Mark "${ad.title}" as ${newStatus}?`)) return;
    setTogglingId(ad.id);
    try {
      await axios.patch(`/api/master/ads/${ad.id}/payment`, { payment_status: newStatus }, hdrs);
      await fetchAll();
    } catch (e) {
      alert(e.response?.data?.message || 'Update failed.');
    } finally {
      setTogglingId(null);
    }
  };

  /* ── Monthly chart data: format month label ────────────────────────── */
  const chartData = monthly.map(m => ({
    ...m,
    monthLabel: new Date(m.month + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
    revenue: parseFloat(m.revenue) || 0,
  }));

  if (loading) return (
    <div className="rev-center">
      <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
      <p className="text-slate-400 mt-3 font-semibold">Loading revenue data...</p>
    </div>
  );

  if (error) return (
    <div className="rev-error">
      <AlertCircle className="w-5 h-5" /> {error}
    </div>
  );

  const kpi = overview || {};

  /* ── Ads table: sort by created_at desc ───────────────────────────── */
  const sortedAds = [...allAds].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <>
      <style>{REV_STYLES}</style>
      <div className="rev-root">

        {/* Header */}
        <div className="rev-header">
          <div>
            <h2 className="rev-title"><IndianRupee className="w-6 h-6 text-violet-500" /> Revenue Dashboard</h2>
            <p className="rev-subtitle">Track ad earnings, pending payments, and society-wise revenue.</p>
          </div>
          <button onClick={fetchAll} className="rev-refresh-btn">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* KPI Cards */}
        <div className="rev-kpi-grid">
          <KpiCard icon={IndianRupee}  label="Total Revenue"      value={fmt(kpi.total_revenue)}       sub={`${kpi.paid_count || 0} paid ads`}        color="text-emerald-700" bg="bg-emerald-50" />
          <KpiCard icon={TrendingUp}   label="This Month"         value={fmt(kpi.revenue_this_month)}  sub="current month earnings"                    color="text-violet-700"  bg="bg-violet-50"  />
          <KpiCard icon={CheckCircle2} label="Paid Ads"           value={kpi.paid_count || 0}          sub="ads with confirmed payment"                color="text-blue-700"    bg="bg-blue-50"    />
          <KpiCard icon={Clock}        label="Pending Payments"   value={fmt(kpi.pending_revenue)}     sub={`${kpi.pending_count || 0} ads outstanding`} color="text-amber-700" bg="bg-amber-50"   />
        </div>

        {/* Monthly Revenue Chart */}
        <div className="rev-card">
          <h3 className="rev-section-title"><BarChart3 className="w-4 h-4 text-violet-500" /> Monthly Revenue (Last 12 Months)</h3>
          {chartData.length === 0 ? (
            <div className="rev-empty-chart">No monthly data yet.</div>
          ) : (
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v) => [fmt(v), 'Revenue']}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Society-wise Revenue */}
        <div className="rev-card">
          <div className="rev-card-header">
            <h3 className="rev-section-title"><Building2 className="w-4 h-4 text-violet-500" /> Revenue by Society</h3>
            <button className="rev-toggle-btn" onClick={() => setSocExpanded(e => !e)}>
              {socExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {socExpanded ? 'Collapse' : 'Expand'}
            </button>
          </div>
          <div className="rev-table-wrap">
            <table className="rev-table">
              <thead>
                <tr>
                  {['Society', 'Total Ads', 'Paid', 'Pending', 'Revenue', 'Outstanding'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(socExpanded ? societies : societies.slice(0, 5)).map((s, i) => (
                  <tr key={i}>
                    <td className="font-semibold text-slate-800">{s.society}</td>
                    <td className="text-center">{s.total_ads}</td>
                    <td className="text-center"><span className="rev-num-paid">{s.paid_ads}</span></td>
                    <td className="text-center"><span className="rev-num-pending">{s.pending_ads}</span></td>
                    <td className="text-emerald-700 font-bold">{fmt(s.revenue)}</td>
                    <td className="text-amber-700 font-semibold">{fmt(s.pending_revenue)}</td>
                  </tr>
                ))}
                {societies.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-slate-400 py-6">No society revenue data yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {societies.length > 5 && !socExpanded && (
            <button className="rev-show-more" onClick={() => setSocExpanded(true)}>
              Show {societies.length - 5} more societies
            </button>
          )}
        </div>

        {/* All Ads Payment Table */}
        <div className="rev-card">
          <h3 className="rev-section-title"><CreditCard className="w-4 h-4 text-violet-500" /> All Ad Payments</h3>
          <div className="rev-table-wrap">
            <table className="rev-table">
              <thead>
                <tr>
                  {['Ad Title', 'Client', 'Contact', 'Price', 'Method', 'Status', 'Created'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedAds.map(ad => (
                  <tr key={ad.id}>
                    <td>
                      <p className="font-semibold text-slate-800 max-w-[160px] truncate" title={ad.title}>{ad.title}</p>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-slate-600">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="truncate max-w-[100px]">{ad.client_name || '—'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-slate-500 text-xs">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {ad.client_contact || '—'}
                      </div>
                    </td>
                    <td className="font-bold text-slate-900">{fmt(ad.price)}</td>
                    <td>
                      <span className="rev-method-badge">{ad.payment_method || 'manual'}</span>
                    </td>
                    <td>
                      <PayBadge
                        status={ad.payment_status}
                        onClick={() => togglePayment(ad)}
                        loading={togglingId === ad.id}
                      />
                    </td>
                    <td className="text-slate-400 text-xs">{fmtDate(ad.created_at)}</td>
                  </tr>
                ))}
                {sortedAds.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-slate-400 py-6">No monetized ads yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────── */
const REV_STYLES = `
.rev-root { display:flex; flex-direction:column; gap:1.5rem; }

/* Header */
.rev-header { display:flex; flex-wrap:wrap; align-items:flex-start; justify-content:space-between; gap:1rem; }
.rev-title  { display:flex; align-items:center; gap:.5rem; font-size:1.5rem; font-weight:900; color:#1e293b; margin:0; }
.rev-subtitle { font-size:.875rem; color:#64748b; margin-top:.25rem; }
.rev-refresh-btn {
  display:flex; align-items:center; gap:.4rem;
  background:#f5f3ff; color:#7c3aed; border:1.5px solid #ddd6fe;
  border-radius:.75rem; padding:.5rem 1rem; font-weight:700; font-size:.8rem; cursor:pointer;
  transition:all .2s;
}
.rev-refresh-btn:hover { background:#ede9fe; }

/* KPI Grid */
.rev-kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:1rem; }
@media(max-width:768px){ .rev-kpi-grid { grid-template-columns:repeat(2,1fr); } }
@media(max-width:480px){ .rev-kpi-grid { grid-template-columns:1fr; } }

.rev-kpi { display:flex; align-items:center; gap:1rem; border-radius:1rem; padding:1.25rem; }
.rev-kpi-icon { width:2.5rem; height:2.5rem; border-radius:.75rem; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,.7); flex-shrink:0; }
.rev-kpi-label { font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:#64748b; }
.rev-kpi-val { font-size:1.5rem; font-weight:900; margin-top:.1rem; }
.rev-kpi-sub { font-size:.7rem; color:#94a3b8; margin-top:.15rem; font-weight:600; }

/* Card */
.rev-card { background:#fff; border:1px solid #e2e8f0; border-radius:1.25rem; padding:1.5rem; box-shadow:0 1px 3px rgba(0,0,0,.04); }
.rev-card-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem; }
.rev-section-title { display:flex; align-items:center; gap:.4rem; font-size:.875rem; font-weight:800; color:#1e293b; text-transform:uppercase; letter-spacing:.04em; margin-bottom:1rem; }
.rev-toggle-btn { display:flex; align-items:center; gap:.3rem; background:#f8fafc; border:1px solid #e2e8f0; border-radius:.5rem; padding:.3rem .7rem; font-size:.75rem; font-weight:700; color:#64748b; cursor:pointer; }
.rev-toggle-btn:hover { background:#f1f5f9; }

/* Table */
.rev-table-wrap { overflow-x:auto; }
.rev-table { width:100%; border-collapse:collapse; font-size:.8125rem; }
.rev-table thead th { background:#f8fafc; padding:.65rem 1rem; font-size:.7rem; font-weight:800; text-transform:uppercase; letter-spacing:.05em; color:#64748b; text-align:left; white-space:nowrap; }
.rev-table tbody tr { border-top:1px solid #f1f5f9; transition:background .1s; }
.rev-table tbody tr:hover { background:#fafafe; }
.rev-table tbody td { padding:.65rem 1rem; color:#475569; vertical-align:middle; white-space:nowrap; }

/* Num badges */
.rev-num-paid    { background:#dcfce7; color:#166534; border-radius:9999px; padding:.1rem .55rem; font-size:.7rem; font-weight:800; }
.rev-num-pending { background:#fef3c7; color:#92400e; border-radius:9999px; padding:.1rem .55rem; font-size:.7rem; font-weight:800; }

/* Payment badge */
.rev-pay-badge { display:inline-flex; align-items:center; gap:.25rem; border:none; border-radius:9999px; padding:.2rem .65rem; font-size:.7rem; font-weight:800; cursor:pointer; transition:all .15s; }
.rev-badge-paid    { background:#dcfce7; color:#166534; }
.rev-badge-paid:hover  { background:#bbf7d0; }
.rev-badge-pending { background:#fef3c7; color:#92400e; }
.rev-badge-pending:hover { background:#fde68a; }

/* Method badge */
.rev-method-badge { background:#f1f5f9; color:#475569; border-radius:9999px; padding:.15rem .55rem; font-size:.68rem; font-weight:700; }

/* Misc */
.rev-center { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:300px; }
.rev-error  { display:flex; align-items:center; gap:.5rem; background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; border-radius:.875rem; padding:1rem 1.25rem; font-weight:600; }
.rev-empty-chart { display:flex; align-items:center; justify-content:center; height:120px; color:#94a3b8; font-weight:600; font-size:.875rem; }
.rev-show-more { display:block; width:100%; text-align:center; padding:.6rem; margin-top:.75rem; background:none; border:1px dashed #e2e8f0; border-radius:.75rem; color:#7c3aed; font-weight:700; font-size:.8rem; cursor:pointer; }
.rev-show-more:hover { background:#faf5ff; }
`;
