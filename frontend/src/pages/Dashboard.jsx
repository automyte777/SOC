import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  UserPlus, 
  CreditCard,
  TrendingUp,
  ArrowRight,
  IndianRupee
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
    total_flats: 0,
    total_residents: 0,
    visitors_today: 0,
    maintenance_due: 0,
    monthly_collection: 0
  });
  const [activities, setActivities] = useState([]);
  const [chartData, setChartData] = useState({
    visitorTrend: [],
    maintenanceTrend: []
  });
  const [loading, setLoading] = useState(true);

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

        const [statsRes, activityRes, chartsRes] = await Promise.all([
          axios.get('/api/dashboard/stats', config).catch(err => ({ data: { success: false }, err })),
          axios.get('/api/dashboard/activity', config).catch(err => ({ data: { success: false }, err })),
          axios.get('/api/dashboard/charts', config).catch(err => ({ data: { success: false }, err }))
        ]);

        if (statsRes.data?.success) setStats(statsRes.data.stats);
        if (activityRes.data?.success) setActivities(activityRes.data.activity);
        if (chartsRes.data?.success) setChartData(chartsRes.data.charts);
        
        // Handle potential auth errors
        if (statsRes.err?.response?.status === 401 || statsRes.err?.response?.status === 403) {
          navigate('/login');
        }
        
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
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
