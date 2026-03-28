import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, Server, KeyRound, Loader2, LayoutDashboard, Building, Users, ScrollText, SwitchCamera,
  CreditCard, Package, Headphones, Settings as ConfigIcon, Database, Send, Tag, PenSquare, Play, XCircle, HardDrive, Menu, X
} from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function MasterAdminDashboard() {
  const [secret, setSecret] = useState(localStorage.getItem('master_secret') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // States
  const [stats, setStats] = useState({});
  const [societies, setSocieties] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [plans, setPlans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [databases, setDatabases] = useState([]);
  const [settings, setSettings] = useState([]);

  const chartData = [
    { name: 'Mon', societies: 1 }, { name: 'Tue', societies: 2 },
    { name: 'Wed', societies: 2 }, { name: 'Thu', societies: 3 },
    { name: 'Fri', societies: 5 }, { name: 'Sat', societies: 7 },
    { name: 'Sun', societies: stats?.totalSocieties || 8 }
  ];

  const fetchCoreData = async (passedSecret = secret) => {
    setLoading(true);
    setError('');
    try {
      const resStats = await axios.get('/api/master/dashboard/stats', { headers: { 'x-master-secret': passedSecret }});
      if (resStats.data.success) {
        setIsAuthenticated(true);
        localStorage.setItem('master_secret', passedSecret);
        setStats(resStats.data.stats);
        setRecentActivities(resStats.data.recentActivities || []);
        fetchTab('societies', passedSecret);
        fetchTab('users', passedSecret);
        fetchTab('plans', passedSecret);
        fetchTab('billing', passedSecret);
        fetchTab('tickets', passedSecret);
        fetchTab('settings', passedSecret);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Invalid Root Key.');
        setIsAuthenticated(false);
        localStorage.removeItem('master_secret');
      } else setError('Server connect fail.');
    } finally { setLoading(false); }
  };

  const fetchTab = async (t, passedSecret = secret) => {
    try {
      const hdrs = { headers: { 'x-master-secret': passedSecret }};
      if (t === 'societies') { const r = await axios.get('/api/master/societies/all', hdrs); setSocieties(r.data.societies||[]); }
      if (t === 'users') { const r = await axios.get('/api/master/users/all', hdrs); setUsers(r.data.users||[]); }
      if (t === 'logs') { const r = await axios.get('/api/master/audit', hdrs); setLogs(r.data.logs||[]); }
      if (t === 'plans') { const r = await axios.get('/api/master/plans', hdrs); setPlans(r.data.plans||[]); }
      if (t === 'billing') { const r = await axios.get('/api/master/billing', hdrs); setPayments(r.data.payments||[]); }
      if (t === 'tickets') { const r = await axios.get('/api/master/tickets', hdrs); setTickets(r.data.tickets||[]); }
      if (t === 'settings') { 
        const r1 = await axios.get('/api/master/settings', hdrs); setSettings(r1.data.settings||[]);
        const r2 = await axios.get('/api/master/system/databases', hdrs); setDatabases(r2.data.databases||[]);
      }
    } catch(e) {}
  };

  useEffect(() => { if (secret && activeTab === 'dashboard') fetchCoreData(); }, []);

  const handleLogin = (e) => { e.preventDefault(); if (secret) fetchCoreData(secret); };

  const reqAction = async (method, url, payload, successMsg, refreshTab) => {
    setActionLoading('acting');
    try {
      const r = await axios({ method, url: '/api/master' + url, data: payload, headers: { 'x-master-secret': secret }});
      if (r.data.success) { alert(successMsg || r.data.message); fetchTab(refreshTab); }
    } catch (e) {
      alert(e.response?.data?.message || 'Action failed.');
    } finally { setActionLoading(null); }
  };

  const handleSocietyAction = async (id, actionStr, name) => {
    if (!window.confirm(`Are you sure you want to ${actionStr} "${name}"?`)) return;
    setActionLoading('soc-'+id);
    try {
      if (actionStr === 'delete') {
        await axios.delete(`/api/master/societies/${id}`, { headers: { 'x-master-secret': secret }});
      } else {
        await axios.post(`/api/master/societies/${id}/${actionStr}`, {}, { headers: { 'x-master-secret': secret }});
      }
      fetchCoreData();
    } catch (err) {} finally { setActionLoading(null); }
  };

  const handleImpersonate = async (soc) => {
    if (!window.confirm(`Impersonate the primary admin of "${soc.name}"?`)) return;
    try {
      const res = await axios.post(`/api/master/societies/impersonate`, { societyId: soc.id }, { headers: { 'x-master-secret': secret }});
      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        const currentHostname = window.location.hostname;
        const subdomain = soc.subdomain || soc.requested_subdomain;
        if (currentHostname !== 'localhost' && !currentHostname.includes('localhost')) {
          const protocol = window.location.protocol;
          const port = window.location.port ? `:${window.location.port}` : '';
          const mainDomain = currentHostname.split('.').length >= 2 ? currentHostname.split('.').slice(-2).join('.') : currentHostname;
          window.location.href = `${protocol}//${subdomain}.${mainDomain}${port}${res.data.dashboardPath}`;
        } else {
          localStorage.setItem('current_subdomain', subdomain);
          window.location.href = res.data.dashboardPath;
        }
      }
    } catch (err) {}
  };

  const TabLink = ({ id, icon: Icon, label }) => (
    <button onClick={() => { setActiveTab(id); fetchTab(id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 translate-x-1' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
      <Icon className="w-5 h-5" /> {label}
    </button>
  );

  if (!isAuthenticated) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md">
        <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-900/20">
                <ShieldAlert className="w-8 h-8"/>
            </div>
        </div>
        <h2 className="text-white text-2xl font-bold mb-2 text-center">Master Auth</h2>
        <p className="text-slate-400 text-center mb-6 text-sm">Enter the system secret key to access the enclave.</p>
        <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input type="password" placeholder="System Secret Token" value={secret} onChange={e=>setSecret(e.target.value)} className="w-full bg-slate-900 text-white pl-10 pr-4 py-3 rounded-xl border border-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all active:scale-95">Authenticate Root</button>
        </form>
        {error && <p className="text-red-400 mt-4 text-center text-sm font-medium">{error}</p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row text-slate-900 font-sans">
      
      {/* MOBILE HEADER */}
      <header className="lg:hidden h-16 bg-slate-900 flex items-center justify-between px-4 sticky top-0 z-50 border-b border-slate-800">
        <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-emerald-500" />
            <span className="text-white font-bold">MasterPanel</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-400 hover:text-white">
            {isSidebarOpen ? <X/> : <Menu/>}
        </button>
      </header>

      {/* SIDEBAR */}
      <aside className={`fixed lg:static top-0 left-0 h-full w-[260px] bg-slate-900 text-white flex flex-col z-50 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-16 hidden lg:flex items-center gap-3 px-6 border-b border-slate-800">
          <ShieldAlert className="w-6 h-6 text-emerald-500" />
          <h1 className="text-lg font-bold">SocietyOS Master</h1>
        </div>
        <div className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="text-[10px] uppercase text-slate-500 font-bold mb-2 mt-4 ml-2 tracking-widest">Main Node</p>
          <TabLink id="dashboard" icon={LayoutDashboard} label="Global Overview" />
          <TabLink id="societies" icon={Building} label="Society Manager" />
          <TabLink id="users" icon={Users} label="Global Users" />
          
          <p className="text-[10px] uppercase text-slate-500 font-bold mb-2 mt-8 ml-2 tracking-widest">SaaS Enclave</p>
          <TabLink id="plans" icon={Package} label="Subscriptions" />
          <TabLink id="billing" icon={CreditCard} label="Billing System" />
          <TabLink id="tickets" icon={Headphones} label="Support Center" />
          <TabLink id="settings" icon={ConfigIcon} label="Global Config" />
          <TabLink id="logs" icon={ScrollText} label="Audit Enclave" />
        </div>
        <div className="p-4 border-t border-slate-800">
            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Authenticated As</p>
                <p className="text-xs font-bold text-white truncate">ROOT_ADMIN_NODE</p>
            </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        <header className="hidden lg:flex h-16 bg-white border-b items-center px-8 shrink-0">
            <h2 className="text-lg font-bold text-slate-800 capitalize">{activeTab.replace('-', ' ')}</h2>
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* OVERVIEW */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2"><LayoutDashboard className="w-6 h-6 text-blue-600"/> Dashboard</h2>
                  <button onClick={() => reqAction('post', '/announcements', { title: prompt("Title:"), message: prompt("Body:"), target_societies: 'all' }, 'Broadcast successful.', 'dashboard')} className="bg-amber-100 text-amber-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-sm hover:bg-amber-200 transition-colors w-full sm:w-auto justify-center"><Send className="w-4 h-4"/> Multi-Cast Broadcast</button>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                   {[ { label: 'Societies', val: stats.totalSocieties, c: 'text-blue-600', bg: 'bg-blue-50' },
                     { label: 'Active', val: stats.activeSocieties, c: 'text-emerald-600', bg: 'bg-emerald-50' },
                     { label: 'Suspended', val: stats.suspendedSocieties, c: 'text-amber-600', bg: 'bg-amber-50' },
                     { label: 'Users', val: stats.totalUsers, c: 'text-indigo-600', bg: 'bg-indigo-50' }].map((k,i) => (
                     <div key={i} className={`p-5 rounded-2xl border border-slate-200 shadow-sm ${k.bg} bg-opacity-30`}>
                       <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">{k.label}</span>
                       <p className={`text-3xl font-black mt-1 ${k.c}`}>{k.val || 0}</p>
                     </div>
                   ))}
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white p-6 rounded-2xl border shadow-sm">
                    <h3 className="font-bold mb-6 text-slate-800 uppercase text-xs tracking-widest">Growth Enclave</h3>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorSoc" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="name" hide/>
                          <RechartsTooltip />
                          <Area type="monotone" dataKey="societies" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSoc)" strokeWidth={3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col">
                     <h3 className="font-bold mb-4 text-xs uppercase tracking-widest text-slate-800">Node Activity</h3>
                     <div className="space-y-3 overflow-y-auto max-h-[200px] flex-1 pr-1 custom-scrollbar">
                       {recentActivities.map(l => (
                         <div key={l.id} className="p-3 bg-slate-50/50 rounded-xl border-l-4 border-blue-500 text-xs">
                           <p className="font-bold text-slate-700 mb-0.5">{l.action}</p>
                           <p className="text-slate-500 line-clamp-1">{l.details}</p>
                         </div>
                       ))}
                       {recentActivities.length === 0 && <p className="text-slate-400 italic text-center py-4">No recent signals.</p>}
                     </div>
                  </div>
                </div>
              </div>
            )}

            {/* SOCIETIES */}
            {activeTab === 'societies' && (
              <div className="space-y-6">
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-2xl font-bold">Society Management Node</h2>
                    <button onClick={() => {
                        const sn = prompt("Society Name:"); const sd = prompt("Unique Subdomain:");
                        const an = prompt("Admin Name:"); const ae = prompt("Admin Email:"); const ap = prompt("Admin Password:");
                        if(sn&&sd&&an&&ae&&ap) reqAction('post', '/societies/create', {society_name:sn, subdomain:sd, admin_name:an, admin_email:ae, password:ap}, 'Society provisioned!', 'societies');
                    }} className="text-sm font-bold text-white bg-blue-600 px-5 py-2.5 rounded-xl hover:bg-blue-500 shadow-lg shadow-blue-900/20 transition-all">+ Instantiate Node</button>
                 </div>
                 <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 font-bold text-slate-500 uppercase text-[10px] tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Tenant Identity</th>
                                    <th className="px-6 py-4">DB Schema</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Root Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {societies.map(soc => (
                                    <tr key={soc.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-900">{soc.name}</p>
                                            <p className="text-[10px] text-blue-600 font-mono">{soc.subdomain}.auto.in</p>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-slate-500">{soc.database_name}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded-full font-black text-[10px] uppercase tracking-wider ${soc.status==='approved'?'bg-emerald-100 text-emerald-800':soc.status==='pending'?'bg-blue-100 text-blue-800':'bg-red-100 text-red-800'}`}>{soc.status}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            {soc.status === 'pending' && <button onClick={() => handleSocietyAction(soc.id, 'approve', soc.name)} className="text-[10px] font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg">Approve</button>}
                                            {soc.status === 'approved' && <button onClick={() => handleSocietyAction(soc.id, 'suspend', soc.name)} className="text-[10px] font-bold bg-amber-500 text-white px-3 py-1.5 rounded-lg">Suspend</button>}
                                            {soc.status === 'suspended' && <button onClick={() => handleSocietyAction(soc.id, 'activate', soc.name)} className="text-[10px] font-bold bg-emerald-500 text-white px-3 py-1.5 rounded-lg">Activate</button>}
                                            <button onClick={() => handleImpersonate(soc)} className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"><SwitchCamera className="w-4 h-4"/></button>
                                            <button onClick={() => handleSocietyAction(soc.id, 'delete', soc.name)} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><XCircle className="w-4 h-4"/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                 </div>
              </div>
            )}

            {/* SHARED TABLE TAB (Users, Logs, Payments) */}
            {(activeTab === 'users' || activeTab === 'logs' || activeTab === 'billing') && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 font-bold text-slate-500 uppercase text-[10px] tracking-wider">
                                <tr>
                                    {activeTab === 'users' ? ['Identity', 'Node Origin', 'Role', 'Controls'].map(h => <th key={h} className="px-6 py-4">{h}</th>) : 
                                     activeTab === 'logs' ? ['Timestamp', 'Action', 'Payload'].map(h => <th key={h} className="px-6 py-4">{h}</th>) :
                                     ['Txn ID', 'Society', 'Amount', 'Status', 'Date'].map(h => <th key={h} className="px-6 py-4">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {activeTab === 'users' && users.map((u, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4"><p className="font-bold">{u.name}</p><p className="text-[10px] text-slate-400">{u.email}</p></td>
                                        <td className="px-6 py-4 font-semibold text-blue-600">{u.society_name}</td>
                                        <td className="px-6 py-4 font-mono text-xs">{u.role}</td>
                                        <td className="px-6 py-4 text-right"><button className="text-[10px] font-bold px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg">View Node</button></td>
                                    </tr>
                                ))}
                                {activeTab === 'logs' && logs.map((l, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-4 text-xs font-mono text-slate-400">{new Date(l.created_at).toLocaleString()}</td>
                                        <td className="px-6 py-4 font-bold text-slate-900">{l.action}</td>
                                        <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">{l.details}</td>
                                    </tr>
                                ))}
                                {activeTab === 'billing' && payments.map((p, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs">{p.transaction_id}</td>
                                        <td className="px-6 py-4 font-bold">{p.society_name}</td>
                                        <td className="px-6 py-4 font-black text-emerald-600">${p.amount}</td>
                                        <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${p.status==='Paid'?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-700'}`}>{p.status}</span></td>
                                        <td className="px-6 py-4 text-slate-500">{new Date(p.created_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* PLANS (Grid) */}
            {activeTab === 'plans' && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.map(p => (
                        <div key={p.id} className="bg-white border text-center p-8 rounded-2xl shadow-sm relative group hover:shadow-xl transition-all hover:-translate-y-1">
                            <button onClick={()=>editPlan(p)} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"><PenSquare className="w-5 h-5"/></button>
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-6 mx-auto">
                                <Package className="w-6 h-6"/>
                            </div>
                            <h3 className="font-black text-xl text-slate-900 tracking-tight">{p.name}</h3>
                            <div className="my-6">
                                <span className="text-4xl font-black text-blue-600">${p.monthly_price}</span>
                                <span className="text-slate-400 text-sm font-bold ml-1">/mo</span>
                            </div>
                            <div className="space-y-3 text-sm font-bold text-slate-500">
                                <p className="flex items-center justify-center gap-2"><Users className="w-4 h-4 text-slate-400"/> {p.max_users} Users Cap</p>
                                <p className="flex items-center justify-center gap-2"><HardDrive className="w-4 h-4 text-slate-400"/> {p.storage_limit_mb} MB Enclave</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* TICKETS */}
            {activeTab === 'tickets' && (
                <div className="grid gap-4">
                    {tickets.map(t => (
                        <div key={t.id} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:border-blue-200 transition-colors">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-50">
                                <div className="space-y-1">
                                    <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">{t.subject}</h3>
                                    <p className="text-xs font-bold text-blue-600 tracking-wider">SOCIETY ORIGIN: {t.society_name}</p>
                                </div>
                                <select value={t.status} onChange={e=>reqAction('put', `/tickets/${t.id}/status`, {status: e.target.value}, 'Updated', 'tickets')} className="bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-black shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer">
                                    <option value="Open">🔴 OPEN</option>
                                    <option value="In Progress">🔵 IN PROGRESS</option>
                                    <option value="Closed">🟢 CLOSED</option>
                                </select>
                            </div>
                            <p className="text-slate-600 leading-relaxed text-sm bg-slate-50/50 p-4 rounded-xl italic font-medium">"{t.description}"</p>
                        </div>
                    ))}
                    {tickets.length === 0 && <div className="text-center py-20 text-slate-400 font-bold uppercase text-xs tracking-widest bg-white rounded-2xl border border-dashed border-slate-300">No signals in concierge desk.</div>}
                </div>
            )}

            {/* SETTINGS */}
            {activeTab === 'settings' && (
                <div className="grid lg:grid-cols-2 gap-6">
                    <div className="bg-white border p-6 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <Database className="w-6 h-6 text-blue-600"/>
                            <h3 className="font-black text-slate-900 uppercase text-sm tracking-widest">Distributed Volumes</h3>
                        </div>
                        <div className="bg-slate-900 rounded-xl p-4 h-48 overflow-y-auto mb-6 custom-scrollbar">
                            <pre className="text-[10px] text-emerald-400 font-mono space-y-2">
                                {databases.map(d => (
                                    <div key={d} className="flex justify-between border-b border-white/5 pb-1">
                                        <span>[DB] {d}</span>
                                        <span className="text-xs">HEALTHY</span>
                                    </div>
                                ))}
                            </pre>
                        </div>
                        <button onClick={()=>reqAction('post', '/system/backup', {dbName:'ALL'}, 'Backup process spawned.', 'settings')} className="w-full bg-slate-900 text-white font-black py-3 rounded-xl hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2"><HardDrive className="w-4 h-4"/> Snapshot All Enclaves</button>
                    </div>
                </div>
            )}

          </div>
        </div>
      </main>

      {/* OVERLAY FOR MOBILE SIDEBAR */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[45] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}
