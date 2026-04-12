/**
 * Dashboard.jsx — Secretary / Society Admin Dashboard
 *
 * Performance architecture:
 *  1. Lazy-loaded sections via React.lazy() — each section is its own code chunk.
 *  2. SSE for real-time updates — no setInterval, no full page reload.
 *  3. Partial rendering — each section manages its own loading/error state.
 *  4. Skeleton loaders — instant perceived performance.
 *  5. Cached APIs — repeated loads served from memory cache (30-60 s TTL).
 *
 * Sections:
 *  • Stats Cards   (always above fold, loads first)
 *  • Maintenance   (lazy, SSE-refreshed on mutation)
 *  • Charts        (lazy, below fold)
 *  • Activity      (lazy, below fold)
 *  • Alerts        (lazy, below fold)
 *  • Audit Trail   (lazy, below fold)
 */

import React, {
  useState, useEffect, useRef, useCallback, Suspense, lazy
} from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, UserPlus, CreditCard, IndianRupee,
  ArrowRight, Activity, Wifi, WifiOff
} from 'lucide-react';

// Always-loaded (above the fold)
import Sidebar       from '../components/Sidebar';
import Topbar        from '../components/Topbar';
import StatsCard     from '../components/StatsCard';
import {
  DashboardSkeleton,
  StatsGridSkeleton,
  MaintenanceSkeleton,
  ChartSkeleton,
  ActivitySkeleton
} from '../components/DashboardSkeletons';

// Lazy-loaded (below the fold ─ separate chunks)
const MaintenanceSection = lazy(() => import('./dashboard/MaintenanceSection'));
const ChartsSection      = lazy(() => import('./dashboard/ChartsSection'));
const ActivitySection    = lazy(() => import('./dashboard/ActivitySection'));
const AlertsSection      = lazy(() => import('./dashboard/AlertsSection'));
const AuditSection       = lazy(() => import('./dashboard/AuditSection'));
const QuickActionsSection= lazy(() => import('./dashboard/QuickActionsSection'));

// SSE hook
import useDashboardSSE from '../hooks/useDashboardSSE';

// ─── Helper: fetch with auth header ──────────────────────────────────────────
function authConfig() {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
}

// ─── Main Component ───────────────────────────────────────────────────────────
const Dashboard = () => {
  const navigate      = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Initial load gating ───────────────────────────────────────────────────
  const [initialLoading, setInitialLoading] = useState(true);

  // ── Stats (above-the-fold data) ───────────────────────────────────────────
  const [stats, setStats] = useState({
    total_flats: 0, total_residents: 0, visitors_today: 0,
    maintenance_due: 0, monthly_collection: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // ── Lazy section data ─────────────────────────────────────────────────────
  const [activities,      setActivities]      = useState([]);
  const [chartData,       setChartData]       = useState({ visitorTrend: [], maintenanceTrend: [] });
  const [alerts,          setAlerts]          = useState([]);
  const [auditLogs,       setAuditLogs]       = useState([]);
  const [mStats,          setMStats]          = useState({ totalFlats:0, paidMembers:0, unpaidMembers:0, totalCollected:0, totalPending:0 });
  const [mList,           setMList]           = useState([]);
  const [mConfig,         setMConfig]         = useState(null);
  const [extraCharges,    setExtraCharges]    = useState([]);
  const [flats,           setFlats]           = useState([]);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [selectedMonth,   setSelectedMonth]   = useState(new Date().toISOString().slice(0, 7));
  const [mStatusFilter,   setMStatusFilter]   = useState('');
  const [lastUpdated,     setLastUpdated]     = useState(new Date());
  const [alertSaving,     setAlertSaving]     = useState(false);
  const [showMConfigModal,    setShowMConfigModal]    = useState(false);
  const [showExtraChargeModal,setShowExtraChargeModal]= useState(false);
  const [selectedFlats,   setSelectedFlats]   = useState([]);

  const modalsOpen = useRef(false);
  useEffect(() => {
    modalsOpen.current = showMConfigModal || showExtraChargeModal;
  }, [showMConfigModal, showExtraChargeModal]);

  const societyName = JSON.parse(localStorage.getItem('user') || '{}')?.society_name || 'My Society';

  // ─── Granular fetch functions ─────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await axios.get('/api/dashboard/stats', authConfig());
      if (res.data?.success) setStats(res.data.stats);
    } catch { /* silent fail — keep stale data */ }
    finally  { setStatsLoading(false); setLastUpdated(new Date()); }
  }, []);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await axios.get('/api/dashboard/activity', authConfig());
      if (res.data?.success) setActivities(res.data.activity);
    } catch {}
  }, []);

  const fetchCharts = useCallback(async () => {
    try {
      const res = await axios.get('/api/dashboard/charts', authConfig());
      if (res.data?.success) setChartData(res.data.charts);
    } catch {}
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await axios.get('/api/admin/emergency', authConfig());
      if (res.data?.success) setAlerts(res.data.data || []);
    } catch {}
  }, []);

  const fetchAudit = useCallback(async () => {
    try {
      const res = await axios.get('/api/admin/audit-logs?limit=20', authConfig());
      if (res.data?.success) setAuditLogs(res.data.data || []);
    } catch {}
  }, []);

  const fetchMaintenance = useCallback(async () => {
    try {
      const cfg = authConfig();
      const [mConfigRes, mStatsRes, mListRes, ecRes, flatsRes] = await Promise.all([
        axios.get('/api/maintenance/admin/config', cfg).catch(() => ({ data: {} })),
        axios.get(`/api/maintenance/admin/dashboard-stats?month=${selectedMonth}`, cfg).catch(() => ({ data: {} })),
        axios.get(`/api/maintenance/admin/list?month=${selectedMonth}&status=${mStatusFilter}`, cfg).catch(() => ({ data: {} })),
        axios.get('/api/maintenance/admin/extra-charges', cfg).catch(() => ({ data: {} })),
        axios.get('/api/admin/flats', cfg).catch(() => ({ data: {} })),
      ]);
      if (mConfigRes.data?.success) setMConfig(mConfigRes.data.data);
      if (mStatsRes.data?.success)  setMStats(mStatsRes.data.data);
      if (mListRes.data?.success)   setMList(mListRes.data.data);
      if (ecRes.data?.success)      setExtraCharges(ecRes.data.data);
      if (flatsRes.data?.success)   setFlats(flatsRes.data.data);
      setLastUpdated(new Date());
    } catch {}
  }, [selectedMonth, mStatusFilter]);

  // ─── Initial load: stats first, then lazy sections ────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user  = localStorage.getItem('user');
    if (!token || !user) { navigate('/login'); return; }

    // 1. Load stats immediately (above fold)
    fetchStats().then(() => {
      setInitialLoading(false);
      // 2. Load below-fold sections after initial paint
      Promise.all([
        fetchActivity(),
        fetchCharts(),
        fetchAlerts(),
        fetchAudit(),
        fetchMaintenance(),
      ]);
    });
  }, [navigate]); // eslint-disable-line

  // Re-fetch maintenance when month/filter changes
  useEffect(() => {
    if (initialLoading) return;
    fetchMaintenance();
  }, [selectedMonth, mStatusFilter]); // eslint-disable-line

  // ─── SSE: real-time updates (replaces setInterval) ────────────────────────
  const { connected: sseConnected } = useDashboardSSE({
    onStats:       fetchStats,
    onMaintenance: fetchMaintenance,
    onAds:         () => {}, // ads section is on a separate page
    onAnalytics:   () => {},
  });

  // ─── Mutation handlers ────────────────────────────────────────────────────
  const handleMConfigSubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/maintenance/admin/config', data, { headers: { Authorization: `Bearer ${token}` } });
      setShowMConfigModal(false);
      // SSE will trigger fetchMaintenance; also call locally for instant UX
      fetchMaintenance();
    } catch { alert('Failed to save configuration'); }
  };

  const handleExtraChargeSubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    data.flat_ids = selectedFlats;
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/maintenance/admin/extra-charges', data, { headers: { Authorization: `Bearer ${token}` } });
      setShowExtraChargeModal(false);
      fetchMaintenance();
    } catch { alert('Failed to add extra charge'); }
  };

  // ─── Initial skeleton ─────────────────────────────────────────────────────
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex">
        {/* Sidebar placeholder */}
        <div className="hidden lg:block w-[260px] bg-white border-r border-slate-100 flex-shrink-0 animate-pulse" />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Topbar placeholder */}
          <div className="h-16 bg-white border-b border-slate-100 animate-pulse" />
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  // ─── Main Render ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(o => !o)} />

      <div className="flex-1 lg:ml-[260px] flex flex-col min-w-0">
        <Topbar societyName={societyName} toggleSidebar={() => setSidebarOpen(o => !o)} />

        <main className="p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto w-full">

          {/* ── Header ────────────────────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Society Overview</h1>
              <p className="text-slate-500 text-sm mt-1">Here's what's happening in your society today.</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest">
                  Last Updated: {lastUpdated.toLocaleTimeString()}
                </p>
                {/* SSE connection indicator */}
                <span title={sseConnected ? 'Live updates active' : 'Reconnecting...'}>
                  {sseConnected
                    ? <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                    : <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  }
                </span>
              </div>
            </div>
            <button className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all shadow-sm">
              Generate Report <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* ── Maintenance Section (lazy) ─────────────────────────────────── */}
          <Suspense fallback={<MaintenanceSkeleton />}>
            <MaintenanceSection
              mConfig={mConfig}
              mStats={mStats}
              mList={mList}
              extraCharges={extraCharges}
              flats={flats}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              mStatusFilter={mStatusFilter}
              setMStatusFilter={setMStatusFilter}
              selectedFlats={selectedFlats}
              setSelectedFlats={setSelectedFlats}
              showMConfigModal={showMConfigModal}
              setShowMConfigModal={setShowMConfigModal}
              showExtraChargeModal={showExtraChargeModal}
              setShowExtraChargeModal={setShowExtraChargeModal}
              handleMConfigSubmit={handleMConfigSubmit}
              handleExtraChargeSubmit={handleExtraChargeSubmit}
            />
          </Suspense>

          {/* ── Stats Cards ────────────────────────────────────────────────── */}
          {statsLoading ? <StatsGridSkeleton /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 md:gap-6">
              <StatsCard title="Total Flats / Units"   value={stats.total_flats}        icon={Building2}    description="Active registered units"   trend="+2%"  trendType="positive" />
              <StatsCard title="Total Residents"        value={stats.total_residents}     icon={Users}        description="Owners and tenants"         trend="+5%"  trendType="positive" />
              <StatsCard title="Visitors Today"         value={stats.visitors_today}      icon={UserPlus}     description="Guest entries tracked"       trend="stable" trendType="positive" />
              <StatsCard title="Maintenance Due"        value={stats.maintenance_due}     icon={CreditCard}   description="Pending payments"            trend="-10%" trendType="negative" />
              <StatsCard title="Monthly Collection"     value={`₹${(stats.monthly_collection || 0).toLocaleString()}`} icon={IndianRupee} description="Collected this month" trend="+8%" trendType="positive" />
            </div>
          )}

          {/* ── Charts (lazy) ─────────────────────────────────────────────── */}
          <Suspense fallback={
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartSkeleton /><ChartSkeleton />
            </div>
          }>
            <ChartsSection chartData={chartData} />
          </Suspense>

          {/* ── Activity Table (lazy) ─────────────────────────────────────── */}
          <Suspense fallback={<ActivitySkeleton />}>
            <ActivitySection activities={activities} />
          </Suspense>

          {/* ── Alerts Panel (lazy) ───────────────────────────────────────── */}
          <Suspense fallback={null}>
            <AlertsSection
              alerts={alerts}
              setAlerts={setAlerts}
              alertSaving={alertSaving}
              setAlertSaving={setAlertSaving}
            />
          </Suspense>

          {/* ── Bottom Row: Audit + Quick Actions (lazy) ──────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Suspense fallback={<ActivitySkeleton rows={8} />}>
              <AuditSection auditLogs={auditLogs} />
            </Suspense>
            <Suspense fallback={null}>
              <QuickActionsSection />
            </Suspense>
          </div>

        </main>
      </div>
    </div>
  );
};

export default Dashboard;
