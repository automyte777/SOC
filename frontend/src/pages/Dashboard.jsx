import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Users, UserPlus, CreditCard, TrendingUp, ArrowRight,
  IndianRupee, Siren, CheckCircle2, XCircle, Activity, ChevronRight,
  Shield, Package, Settings as SettingsIcon, Filter, Info
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  AreaChart,
  Area
} from 'recharts';

// UI Components
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import StatsCard from '../components/StatsCard';
import ActivityTable from '../components/ActivityTable';

const Dashboard = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    total_flats: 0, total_residents: 0, visitors_today: 0,
    maintenance_due: 0, monthly_collection: 0
  });
  const [activities,  setActivities]  = useState([]);
  const [chartData,   setChartData]   = useState({ visitorTrend: [], maintenanceTrend: [] });
  const [alerts,      setAlerts]      = useState([]);
  const [auditLogs,   setAuditLogs]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [alertSaving, setAlertSaving] = useState(false);

  // Maintenance States
  const [mConfig, setMConfig] = useState(null);
  const [mStats, setMStats] = useState({ totalFlats: 0, paidMembers: 0, unpaidMembers: 0, totalCollected: 0, totalPending: 0 });
  const [mList, setMList] = useState([]);
  const [extraCharges, setExtraCharges] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showMConfigModal, setShowMConfigModal] = useState(false);
  const [showExtraChargeModal, setShowExtraChargeModal] = useState(false);
  const [flats, setFlats] = useState([]);
  const [selectedFlats, setSelectedFlats] = useState([]);
  const [mStatusFilter, setMStatusFilter] = useState('');

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const societyName = JSON.parse(localStorage.getItem('user'))?.society_name || 'My Society';

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');

        if (!token || !user) {
          console.warn('Dashboard: No auth token found, redirecting...');
          navigate('/login');
          return;
        }

        const config = { headers: { Authorization: `Bearer ${token}` } };

        const [statsRes, activityRes, chartsRes, alertsRes, auditRes] = await Promise.all([
          axios.get('/api/dashboard/stats',    config).catch(() => ({ data: { success: false } })),
          axios.get('/api/dashboard/activity', config).catch(() => ({ data: { success: false } })),
          axios.get('/api/dashboard/charts',   config).catch(() => ({ data: { success: false } })),
          axios.get('/api/admin/emergency',    config).catch(() => ({ data: { success: false } })),
          axios.get('/api/admin/audit-logs?limit=20', config).catch(() => ({ data: { success: false } })),
        ]);

        if (statsRes.data?.success)   setStats(statsRes.data.stats);
        if (activityRes.data?.success) setActivities(activityRes.data.activity);
        if (chartsRes.data?.success)  setChartData(chartsRes.data.charts);
        if (alertsRes.data?.success)  setAlerts(alertsRes.data.data || []);
        if (auditRes.data?.success)   setAuditLogs(auditRes.data.data || []);

        // Fetch Maintenance Data
        const mConfigRes = await axios.get('/api/maintenance/admin/config', config);
        if (mConfigRes.data?.success) setMConfig(mConfigRes.data.data);

        const mStatsRes = await axios.get(`/api/maintenance/admin/dashboard-stats?month=${selectedMonth}`, config);
        if (mStatsRes.data?.success) setMStats(mStatsRes.data.data);

        const mListRes = await axios.get(`/api/maintenance/admin/list?month=${selectedMonth}&status=${mStatusFilter}`, config);
        if (mListRes.data?.success) setMList(mListRes.data.data);

        const ecRes = await axios.get('/api/maintenance/admin/extra-charges', config);
        if (ecRes.data?.success) setExtraCharges(ecRes.data.data);

        const flatsRes = await axios.get('/api/admin/flats', config);
        if (flatsRes.data?.success) setFlats(flatsRes.data.data);
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate, selectedMonth, mStatusFilter]);

  const handleMConfigSubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/maintenance/admin/config', data, { headers: { Authorization: `Bearer ${token}` } });
      setShowMConfigModal(false);
      window.location.reload();
    } catch (err) { alert('Failed to save configuration'); }
  };

  const handleExtraChargeSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    data.flat_ids = selectedFlats;
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/maintenance/admin/extra-charges', data, { headers: { Authorization: `Bearer ${token}` } });
      setShowExtraChargeModal(false);
      window.location.reload();
    } catch (err) { alert('Failed to add extra charge'); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      <div className="flex-1 lg:ml-[260px] flex flex-col min-w-0">
        <Topbar societyName={societyName} toggleSidebar={toggleSidebar} />

        <main className="p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto w-full">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Society Overview</h1>
              <p className="text-slate-500 text-sm mt-1">Here's what's happening in your society today.</p>
            </div>
            <button className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all shadow-sm">
              Generate Report
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Maintenance Section (Secretary) */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">Maintenance Management</h2>
                  <p className="text-slate-500 text-xs">Automated billing and extra charges</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowExtraChargeModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-all shadow-lg shadow-amber-100"
                >
                  <Plus className="w-4 h-4" /> Extra Charge
                </button>
                <button 
                  onClick={() => setShowMConfigModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                >
                  <SettingsIcon className="w-4 h-4" /> Config
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Flats</span>
                <span className="text-2xl font-black text-slate-900">{mStats.totalFlats}</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-emerald-600">Paid Members</span>
                <span className="text-2xl font-black text-emerald-700">{mStats.paidMembers}</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-rose-600">Unpaid Members</span>
                <span className="text-2xl font-black text-rose-700">{mStats.unpaidMembers}</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-blue-100 bg-blue-50/30 shadow-sm flex flex-col gap-1">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Total Collected</span>
                <span className="text-2xl font-black text-blue-800">₹{parseFloat(mStats.totalCollected).toLocaleString()}</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-amber-100 bg-amber-50/30 shadow-sm flex flex-col gap-1">
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Pending Amount</span>
                <span className="text-2xl font-black text-amber-800">₹{parseFloat(mStats.totalPending).toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex flex-wrap items-center justify-between gap-4">
                <h3 className="font-bold text-slate-800">Billing Ledger</h3>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <input 
                      type="month" 
                      value={selectedMonth} 
                      onChange={e => setSelectedMonth(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-600 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select 
                      value={mStatusFilter} 
                      onChange={e => setMStatusFilter(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-600 focus:outline-none"
                    >
                      <option value="">All Status</option>
                      <option value="Paid">Paid</option>
                      <option value="Pending">Pending</option>
                      <option value="Initiated">Initiated</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/50 text-left">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Flat Number</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Owner Name</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Amount</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {mList.length === 0 ? (
                      <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400 italic text-sm">No records found for this month.</td></tr>
                    ) : mList.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-black text-slate-800 text-sm">{item.flat_number}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{item.owner_name || 'N/A'}</td>
                        <td className="px-6 py-4 font-extrabold text-slate-900 text-sm">₹{parseFloat(item.amount).toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${
                            item.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                            item.status === 'Initiated' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                            'bg-rose-50 text-rose-600 border border-rose-100'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-500">{new Date(item.due_date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Extra Charges Summary (Secretary) */}
          {extraCharges.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
               <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                 <h3 className="font-bold text-slate-800">Legacy / Extra Charges Overview</h3>
                 <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-1 rounded uppercase">Total Collected: ₹{extraCharges.reduce((a,c)=>a+parseFloat(c.total_collected),0).toLocaleString()}</span>
               </div>
               <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {extraCharges.map(ec => (
                    <div key={ec.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50/30">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-800 text-sm uppercase">{ec.title}</h4>
                        <span className="text-xs font-black text-slate-900">₹{parseFloat(ec.amount).toLocaleString()}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                          <span>Progress</span>
                          <span>{ec.paid_count}/{ec.total_assigned} Paid</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 transition-all duration-500" 
                            style={{ width: `${(ec.paid_count / ec.total_assigned) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {/* Config Modal */}
          {showMConfigModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Maintenance Config</h3>
                  <button onClick={() => setShowMConfigModal(false)}><XCircle className="w-6 h-6 text-slate-300 hover:text-rose-500 transition-colors" /></button>
                </div>
                <form onSubmit={handleMConfigSubmit} className="p-8 space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monthly Amount (₹)</label>
                    <input name="amount" type="number" defaultValue={mConfig?.amount} required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="e.g. 5000" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Activation Date</label>
                    <input name="start_date" type="date" defaultValue={mConfig?.start_date?.split('T')[0]} required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                  <div className="p-4 bg-blue-50 rounded-2xl flex gap-3">
                    <Info className="w-5 h-5 text-blue-600 shrink-0" />
                    <p className="text-[10px] font-medium text-blue-700 leading-normal">Biling will be automatically generated on the 1st of every month starting from the selected date.</p>
                  </div>
                  <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">Activate Maintenance</button>
                </form>
              </div>
            </div>
          )}

          {/* Extra Charge Modal */}
          {showExtraChargeModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Add Extra Charge</h3>
                  <button onClick={() => setShowExtraChargeModal(false)}><XCircle className="w-6 h-6 text-slate-300 hover:text-rose-500 transition-colors" /></button>
                </div>
                <form onSubmit={handleExtraChargeSubmit} className="p-8 space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Charge Title</label>
                    <input name="title" required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="e.g. Lift Repair 2024" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Amount (₹)</label>
                    <input name="amount" type="number" required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="e.g. 500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Apply To</label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="apply_to" value="all" defaultChecked className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-bold text-slate-700">All Flats</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="apply_to" value="selected" className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-bold text-slate-700">Specific Flats</span>
                      </label>
                    </div>
                  </div>
                  
                  {/* Flat Selector (shown conceptually or simple multi-select) */}
                  <div className="max-h-32 overflow-y-auto border border-slate-100 rounded-xl p-2 grid grid-cols-3 gap-2">
                    {flats.map(f => (
                      <button 
                        key={f.id}
                        type="button"
                        onClick={() => setSelectedFlats(prev => prev.includes(f.id) ? prev.filter(x=>x!==f.id) : [...prev, f.id])}
                        className={`text-[10px] font-bold px-2 py-1.5 rounded-lg border transition-all ${
                          selectedFlats.includes(f.id) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-100 text-slate-600 hover:border-blue-200'
                        }`}
                      >
                        {f.flat_number}
                      </button>
                    ))}
                  </div>

                  <button type="submit" className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-amber-100 hover:bg-amber-600 transition-all">Generate Charges</button>
                </form>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <StatsCard 
              title="Total Flats / Units" 
              value={stats.total_flats} 
              icon={Building2} 
              description="Active registered units"
              trend="+2%"
              trendType="positive"
            />
            <StatsCard 
              title="Total Residents" 
              value={stats.total_residents} 
              icon={Users} 
              description="Owners and tenants"
              trend="+5%"
              trendType="positive"
            />
            <StatsCard 
              title="Visitors Today" 
              value={stats.visitors_today} 
              icon={UserPlus} 
              description="Guest entries tracked"
              trend="stable"
              trendType="positive"
            />
            <StatsCard 
              title="Maintenance Due" 
              value={stats.maintenance_due} 
              icon={CreditCard} 
              description="Pending payments"
              trend="-10%"
              trendType="negative"
            />
            <StatsCard 
              title="Monthly Collection" 
              value={`₹${(stats.monthly_collection || 0).toLocaleString()}`}
              icon={IndianRupee} 
              description="Collected this month"
              trend="+8%"
              trendType="positive"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Visitor Trend Area Chart */}
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
                  <AreaChart data={chartData.visitorTrend}>
                    <defs>
                      <linearGradient id="colorVisitor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#64748b', fontSize: 12}}
                      tickFormatter={(value) => new Date(value).toLocaleDateString([], {weekday: 'short'})}
                    />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                      cursor={{stroke: '#2563eb', strokeWidth: 1, strokeDasharray: '4 4'}}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#2563eb" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorVisitor)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Maintenance Collection Bar Chart */}
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
                  <BarChart data={chartData.maintenanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#64748b', fontSize: 12}}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#64748b', fontSize: 12}}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                    />
                    <Bar 
                      dataKey="total" 
                      fill="#2563eb" 
                      radius={[6, 6, 0, 0]} 
                      barSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Activity Table */}
          <ActivityTable activities={activities} />

          {/* Emergency Alerts Panel */}
          {alerts.filter(a => a.status === 'active').length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center">
                  <Siren className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-red-800">Active Emergency Alerts</h3>
                  <p className="text-xs text-red-500">{alerts.filter(a=>a.status==='active').length} unresolved</p>
                </div>
              </div>
              <div className="space-y-2">
                {alerts.filter(a => a.status === 'active').map(a => (
                  <div key={a.id} className="bg-white border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <span className="text-2xl">{a.alert_type==='panic'?'🆘':a.alert_type==='fire'?'🔥':a.alert_type==='medical'?'🏥':a.alert_type==='theft'?'🚔':'⚠️'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-red-800 capitalize">{a.alert_type} Alert</div>
                      <div className="text-xs text-slate-500">{a.raised_by_name||'Security'}{a.location?` • ${a.location}`:''}</div>
                      {a.description && <div className="text-xs text-slate-600 mt-0.5">{a.description}</div>}
                      <div className="text-[11px] text-slate-400">{new Date(a.created_at).toLocaleString('en-IN')}</div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        disabled={alertSaving}
                        onClick={async () => { setAlertSaving(true); try { const t=localStorage.getItem('token'); await axios.put(`/api/admin/emergency/${a.id}/acknowledge`,{},{headers:{Authorization:`Bearer ${t}`}}); setAlerts(prev=>prev.map(x=>x.id===a.id?{...x,status:'acknowledged'}:x)); } catch{} finally{setAlertSaving(false);} }}
                        className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-bold rounded-lg transition-all">
                        Acknowledge
                      </button>
                      <button
                        disabled={alertSaving}
                        onClick={async () => { setAlertSaving(true); try { const t=localStorage.getItem('token'); await axios.put(`/api/admin/emergency/${a.id}/resolve`,{},{headers:{Authorization:`Bearer ${t}`}}); setAlerts(prev=>prev.filter(x=>x.id!==a.id)); } catch{} finally{setAlertSaving(false);} }}
                        className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-bold rounded-lg transition-all">
                        Resolve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Row: Audit Logs + Quick Links */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Audit Log */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center"><Activity className="w-5 h-5 text-slate-600" /></div>
                  <div>
                    <h3 className="font-semibold text-slate-800">Audit Trail</h3>
                    <p className="text-xs text-slate-400">Recent system activity</p>
                  </div>
                </div>
                <button onClick={() => navigate('/reports')} className="text-xs text-blue-600 hover:text-blue-500 font-semibold flex items-center gap-1">View All <ChevronRight className="w-3 h-3" /></button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {auditLogs.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">No audit logs yet — activity will appear here.</p>
                ) : auditLogs.slice(0, 12).map(log => (
                  <div key={log.id} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
                    <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Shield className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">{log.action?.replace(/_/g,' ')}</span>
                        {log.entity_type && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">{log.entity_type}</span>}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">{log.actor_name||'System'}{log.details?` — ${log.details}`:''}</p>
                      <p className="text-[10px] text-slate-300">{new Date(log.created_at).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label:'View Visitors',    icon: UserPlus,      path:'/visitors',    color:'blue' },
                  { label:'Deliveries',       icon: Package,       path:'/visitors',    color:'indigo' },
                  { label:'Staff Attendance', icon: Users,         path:'/staff',       color:'emerald' },
                  { label:'Broadcast Notice', icon: Siren,         path:'/notices',     color:'amber' },
                  { label:'Reports',          icon: Activity,      path:'/reports',     color:'violet' },
                  { label:'Emergency Log',    icon: Shield,        path:'/settings',    color:'red' },
                ].map(({ label, icon: Icon, path, color }) => (
                  <button key={label} onClick={() => navigate(path)}
                    className={`flex items-center gap-3 p-3.5 bg-${color}-50 hover:bg-${color}-100 border border-${color}-100 rounded-xl transition-all text-left`}>
                    <Icon className={`w-4 h-4 text-${color}-600 flex-shrink-0`} />
                    <span className={`text-sm font-medium text-${color}-700`}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
