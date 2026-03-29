import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Users, UserPlus, CreditCard, TrendingUp, ArrowRight,
  IndianRupee, Siren, CheckCircle2, XCircle, Activity, ChevronRight,
  Shield, Package
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
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

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
