import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Briefcase, LogOut, Users, ClipboardList, Bell,
  AlertCircle, Plus, Loader2, RefreshCw, Search,
  CheckCircle2, XCircle, TrendingUp, FileText, Shield,
} from 'lucide-react';

const api = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

const TABS = [
  { id: 'overview',   label: 'Overview',     icon: TrendingUp },
  { id: 'staff',      label: 'Staff Info',   icon: Users },
  { id: 'visitors',   label: 'Visitors',     icon: Shield },
  { id: 'complaints', label: 'Complaints',   icon: AlertCircle },
  { id: 'notices',    label: 'Notices',      icon: Bell },
  { id: 'logs',       label: 'Daily Logs',   icon: ClipboardList },
];

const STATUS_BADGE = {
  entered:          'bg-blue-500/10 text-blue-400 border-blue-500/30',
  pending_approval: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  approved:         'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  exited:           'bg-slate-500/10 text-slate-400 border-slate-500/30',
  rejected:         'bg-red-500/10 text-red-400 border-red-500/30',
  open:             'bg-red-500/10 text-red-400 border-red-500/30',
  'in-progress':    'bg-amber-500/10 text-amber-400 border-amber-500/30',
  resolved:         'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
};

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const token    = localStorage.getItem('token');
  const user     = JSON.parse(localStorage.getItem('user') || '{}');

  const [activeTab, setActiveTab] = useState('overview');
  const [loading,   setLoading]   = useState(false);
  const [search,    setSearch]    = useState('');

  const [visitors,   setVisitors]   = useState([]);
  const [staff,      setStaff]      = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [notices,    setNotices]    = useState([]);
  const [dailyLogs,  setDailyLogs]  = useState([]);
  const [logModal,   setLogModal]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [logForm,    setLogForm]    = useState({ log_type: 'note', description: '' });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [visRes, staffRes, cmpRes, notRes, logRes] = await Promise.all([
        axios.get('/api/staff/visitors',   api(token)),
        axios.get('/api/staff/flats',      api(token)), // reuse flats for staff count hint
        axios.get('/api/member/complaints',{ headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } })),
        axios.get('/api/member/notices',   { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } })),
        axios.get('/api/staff/daily-logs', api(token)),
      ]);
      if (visRes.data.success)  setVisitors(visRes.data.data);
      if (logRes.data.success)  setDailyLogs(logRes.data.data);
      if (cmpRes.data.success)  setComplaints(cmpRes.data.data);
      if (notRes.data.success)  setNotices(notRes.data.data);
    } catch (e) {
      if (e.response?.status === 401 || e.response?.status === 403) navigate('/staff/login');
    } finally {
      setLoading(false);
    }
  }, [token, navigate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleLogout = () => { localStorage.clear(); navigate('/staff/login'); };

  const submitLog = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post('/api/staff/daily-logs', logForm, api(token));
      setLogModal(false);
      setLogForm({ log_type: 'note', description: '' });
      fetchAll();
    } catch (err) { alert(err.response?.data?.message || 'Failed to add log'); }
    finally { setSaving(false); }
  };

  // Stats
  const todayVisitors    = visitors.filter(v => new Date(v.entry_time || v.created_at).toDateString() === new Date().toDateString());
  const insideNow        = visitors.filter(v => v.status === 'entered').length;
  const openComplaints   = complaints.filter(c => c.status === 'open').length;
  const todayLogs        = dailyLogs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length;

  const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">

      {/* Topbar */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-lg flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm leading-tight">{user.society_name || 'SmartSOC'}</h1>
            <p className="text-[11px] text-purple-400 font-semibold tracking-wide uppercase">Manager Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:block text-right">
            <div className="text-sm font-bold text-white">{user.name}</div>
            <div className="text-xs text-slate-400">Manager • {user.shift || 'On Duty'}</div>
          </div>
          <button onClick={handleLogout} className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/10 hover:text-red-400 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Tab Bar */}
      <div className="border-b border-slate-800/80 bg-slate-900/40 sticky top-16 z-20">
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto py-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => { setActiveTab(id); setSearch(''); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === id
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
          <button onClick={fetchAll} className="ml-auto p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-xl transition-colors flex-shrink-0">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-6 py-6 space-y-5">

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <>
            <h2 className="text-lg font-bold text-white">Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user.name?.split(' ')[0]} 👋</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Today's Visitors",   value: todayVisitors.length, color: 'blue',   icon: Shield },
                { label: 'Currently Inside',   value: insideNow,            color: 'emerald', icon: CheckCircle2 },
                { label: 'Open Complaints',    value: openComplaints,       color: 'red',     icon: AlertCircle },
                { label: "Today's Log Entries", value: todayLogs,           color: 'violet',  icon: ClipboardList },
              ].map(({ label, value, color, icon: Icon }) => (
                <div key={label} className={`bg-${color}-500/10 border border-${color}-500/20 rounded-2xl p-5`}>
                  <div className={`w-9 h-9 rounded-xl bg-${color}-500/20 flex items-center justify-center mb-3`}>
                    <Icon className={`w-4 h-4 text-${color}-400`} />
                  </div>
                  <div className={`text-3xl font-bold text-${color}-400`}>{value}</div>
                  <div className="text-xs text-slate-400 mt-1 font-medium">{label}</div>
                </div>
              ))}
            </div>

            {/* Recent visitors preview */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
                <span className="font-semibold text-slate-200 text-sm">Recent Visitor Activity</span>
                <button onClick={() => setActiveTab('visitors')} className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1">
                  View all <Shield className="w-3 h-3" />
                </button>
              </div>
              <div className="divide-y divide-slate-700/50">
                {visitors.slice(0, 5).map(v => (
                  <div key={v.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300">
                      {v.visitor_name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-slate-200 truncate block">{v.visitor_name}</span>
                      <span className="text-xs text-slate-500">Flat {v.flat_number || '—'} • {v.purpose || 'Visit'}</span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_BADGE[v.status] || 'border-slate-600 text-slate-400'}`}>
                      {(v.status || '').replace(/_/g,' ')}
                    </span>
                  </div>
                ))}
                {visitors.length === 0 && <div className="px-5 py-8 text-center text-slate-500 text-sm">No visitors recorded yet.</div>}
              </div>
            </div>
          </>
        )}

        {/* ── STAFF INFO ── */}
        {activeTab === 'staff' && (
          <div className="bg-slate-800/50 border border-slate-700/80 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <p className="font-semibold text-slate-200">Your Colleagues (Staff Directory)</p>
              <p className="text-xs text-slate-500 mt-0.5">Staff info is managed by the Secretary</p>
            </div>
            <div className="p-4 flex gap-3 flex-col sm:flex-row items-center justify-center text-slate-400">
              <Users className="w-10 h-10 text-slate-600" />
              <div>
                <p className="font-semibold text-slate-300">Staff list visible to Secretary only</p>
                <p className="text-sm text-slate-500">Contact your society secretary for staff management.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── VISITORS ── */}
        {activeTab === 'visitors' && (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search visitor or flat..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
            </div>
            <div className="space-y-3">
              {visitors.filter(v =>
                v.visitor_name?.toLowerCase().includes(search.toLowerCase()) ||
                v.flat_number?.toLowerCase().includes(search.toLowerCase())
              ).map(v => (
                <div key={v.id} className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 flex items-center gap-4 hover:border-slate-600 transition-all">
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300 flex-shrink-0">
                    {v.visitor_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-sm">{v.visitor_name}</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_BADGE[v.status] || 'border-slate-600 text-slate-400'}`}>
                        {(v.status || '').replace(/_/g,' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Flat {v.flat_number || '—'} • {v.purpose || 'Visit'} • {v.phone || 'No phone'}</p>
                  </div>
                  <span className="text-xs text-slate-500 flex-shrink-0 hidden sm:block">
                    {v.entry_time ? new Date(v.entry_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── COMPLAINTS ── */}
        {activeTab === 'complaints' && (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search complaints..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
            </div>
            <div className="space-y-3">
              {complaints.filter(c =>
                c.title?.toLowerCase().includes(search.toLowerCase()) ||
                c.flat_number?.toLowerCase().includes(search.toLowerCase())
              ).map(c => (
                <div key={c.id} className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 hover:border-slate-600 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">{c.title}</span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_BADGE[c.status] || 'border-slate-600 text-slate-400'}`}>{c.status}</span>
                        {c.priority && <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-700 px-2 py-0.5 rounded">{c.priority}</span>}
                      </div>
                      {c.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{c.description}</p>}
                      <p className="text-xs text-slate-500 mt-1">Flat {c.flat_number || '—'} • {new Date(c.created_at).toLocaleDateString('en-IN')}</p>
                    </div>
                  </div>
                </div>
              ))}
              {complaints.length === 0 && <div className="text-center py-16 text-slate-500 text-sm">No complaints found.</div>}
            </div>
          </>
        )}

        {/* ── NOTICES ── */}
        {activeTab === 'notices' && (
          <div className="space-y-3">
            {notices.map(n => (
              <div key={n.id} className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 hover:border-slate-600 transition-all">
                <div className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-white">{n.title}</h3>
                    {n.description && <p className="text-sm text-slate-400 mt-1">{n.description}</p>}
                    <p className="text-xs text-slate-500 mt-2">{new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
              </div>
            ))}
            {notices.length === 0 && <div className="text-center py-16 text-slate-500 text-sm">No notices posted.</div>}
          </div>
        )}

        {/* ── DAILY LOGS ── */}
        {activeTab === 'logs' && (
          <>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search logs..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
              </div>
              <button onClick={() => setLogModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-purple-600/20 transition-all active:scale-95">
                <Plus className="w-4 h-4" /> Add Log
              </button>
            </div>
            <div className="space-y-2">
              {dailyLogs.filter(l => l.description?.toLowerCase().includes(search.toLowerCase())).map(log => (
                <div key={log.id} className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 flex gap-3 hover:border-slate-600 transition-all">
                  <span className="text-lg flex-shrink-0 mt-0.5">
                    {{ visitor_entry: '🚶', visitor_exit: '🚪', shift_start: '✅', shift_end: '🔒', incident: '⚠️', note: '📝' }[log.log_type] || '📝'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200">{log.description}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-[11px] font-bold uppercase text-slate-500 bg-slate-700 px-2 py-0.5 rounded">{log.log_type?.replace(/_/g, ' ')}</span>
                      {log.flat_number && <span className="text-[11px] text-slate-500">Flat {log.flat_number}</span>}
                      {log.staff_name  && <span className="text-[11px] text-slate-600">by {log.staff_name}</span>}
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-600 flex-shrink-0">
                    {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              {dailyLogs.length === 0 && <div className="text-center py-16 text-slate-500 text-sm">No logs for today.</div>}
            </div>
          </>
        )}
      </main>

      {/* Log Modal */}
      {logModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="font-bold text-white">Add Log Entry</h3>
              <button onClick={() => !saving && setLogModal(false)} className="text-slate-500 hover:text-white p-1.5 hover:bg-slate-800 rounded-lg">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submitLog} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Log Type</label>
                <select value={logForm.log_type} onChange={e => setLogForm({ ...logForm, log_type: e.target.value })} className={inputCls}>
                  {[['shift_start','Shift Start'],['shift_end','Shift End'],['incident','Incident'],['note','General Note']].map(([v,l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description *</label>
                <textarea required rows={3} value={logForm.description} onChange={e => setLogForm({ ...logForm, description: e.target.value })}
                  placeholder="Describe the event..." className={inputCls + ' resize-none'} />
              </div>
              <button type="submit" disabled={saving}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 transition-all">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save Log Entry
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all';
