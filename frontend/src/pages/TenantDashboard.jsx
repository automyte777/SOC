import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Home, ClipboardList, Megaphone, Users, 
  Clock, ShieldCheck, CreditCard, AlertTriangle, 
  Calendar, Car, Plus, Trash2, CheckCircle2, XCircle,
  FileText
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import AdBanner from '../components/AdBanner';
import { getUser } from '../utils/auth';

const TenantDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data states
  const [property, setProperty] = useState(null);
  const [visitors, setVisitors] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [events, setEvents] = useState([]);
  const [notices, setNotices] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  const [isExpired, setIsExpired] = useState(false);
  const [expiryMessage, setExpiryMessage] = useState('');

  const user = getUser();
  const societyName = user?.society_name || 'My Society';

  const fetchData = async (isPoll = false) => {
    if (!isPoll) setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [
        propRes, visRes, compRes, evRes, notRes, vehRes
      ] = await Promise.all([
        axios.get('/api/member/my-property', { headers }).catch(e => e.response),
        axios.get('/api/member/my-visitors', { headers }),
        axios.get('/api/member/my-complaints', { headers }),
        axios.get('/api/member/events', { headers }),
        axios.get('/api/member/notices', { headers }),
        axios.get('/api/member/my-vehicles', { headers })
      ]);

      if (propRes?.status === 403 && propRes.data.expired) {
        setIsExpired(true);
        setExpiryMessage(propRes.data.message);
        setLoading(false);
        return;
      }

      if (propRes?.data?.success) setProperty(propRes.data.data);
      if (visRes.data.success) setVisitors(visRes.data.data);
      if (compRes.data.success) setComplaints(compRes.data.data);
      if (evRes.data.success) setEvents(evRes.data.data);
      if (notRes.data.success) setNotices(notRes.data.data);
      if (vehRes.data.success) setVehicles(vehRes.data.data);
      
    } catch (e) {
      console.error(e);
      if (!isPoll) setError('Failed to load dashboard data.');
    } finally {
      if (!isPoll) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const poll = setInterval(() => fetchData(true), 15000);
    return () => clearInterval(poll);
  }, []);

  const handleVisitorAction = async (id, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/member/security/visitors/${id}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      alert('Failed to update visitor status');
    }
  };

  const getDaysLeft = (date) => {
    if (!date) return 'N/A';
    const diff = new Date(date) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days} Days Left` : 'Expired';
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans p-6 text-center flex flex-col gap-4">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Authenticating Tenant Session...</p>
    </div>
  );

  if (isExpired) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white rounded-3xl p-12 max-w-lg w-full text-center shadow-2xl border border-rose-100 flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 animate-bounce">
          <AlertTriangle className="w-10 h-10" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight mb-3">Notice: Agreement Expired</h1>
          <p className="text-slate-500 font-medium leading-relaxed">{expiryMessage}</p>
        </div>
        <div className="w-full h-px bg-slate-50 my-2"></div>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Login Restricted</p>
        <button onClick={() => window.location.reload()} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all">Check Revocation</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      
      <main className="flex-1 flex flex-col min-w-0 transition-all duration-300 lg:ml-[260px]">
        <Topbar societyName={societyName} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <div className="p-6 max-w-7xl mx-auto w-full">
          <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight text-3xl">Tenant Portal</h1>
              <p className="text-slate-500 mt-1">Living at Flat {user.flat_number}. Welcome home, {user?.name}.</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 px-6 py-3 rounded-2xl flex items-center gap-4 hover:shadow-lg hover:shadow-amber-50 transition-all">
              <div className="p-3 bg-amber-100 text-amber-700 rounded-xl font-bold"><FileText className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Rental Agreement</p>
                <p className="text-sm font-black text-amber-800">{getDaysLeft(user.rental_end_date)}</p>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-4 bg-blue-50 text-blue-600 rounded-xl font-bold"><Home className="w-6 h-6" /></div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Property</p>
                <h3 className="text-xl font-extrabold text-slate-800">Flat {user.flat_number}</h3>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-4 bg-amber-50 text-amber-600 rounded-xl font-bold"><Clock className="w-6 h-6" /></div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Gate Queue</p>
                <h3 className="text-xl font-extrabold text-slate-800">
                  {visitors.filter(v => v.status === 'pending_approval').length}
                </h3>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-4 bg-rose-50 text-rose-600 rounded-xl font-bold"><AlertTriangle className="w-6 h-6" /></div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Active Complaints</p>
                <h3 className="text-xl font-extrabold text-slate-800">{complaints.filter(c => c.status !== 'resolved').length}</h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Gate Control */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
              <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Recent Visitors</h2>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {visitors.length === 0 ? (
                  <div className="py-20 text-center text-slate-300 italic text-sm">No visitor logs.</div>
                ) : visitors.map(v => (
                  <div key={v.id} className="p-5 flex items-center justify-between hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-100 group">
                    <div>
                      <p className="font-bold text-slate-800 uppercase tracking-tight">{v.visitor_name}</p>
                      <p className="text-xs text-slate-400 font-medium">{v.purpose || 'Visit'} • {new Date(v.entry_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest border-2 ${
                        v.status === 'pending_approval' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        v.status === 'approved' || v.status === 'entered' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        'bg-slate-50 text-slate-400 border-slate-100'
                      }`}>
                        {v.status.replace('_', ' ')}
                      </span>
                      {v.status === 'pending_approval' && (
                        <div className="flex gap-2">
                          <button onClick={() => handleVisitorAction(v.id, 'approved')} className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 shadow-lg shadow-emerald-100 transition-all active:scale-90"><CheckCircle2 className="w-4 h-4" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Support Tickets */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                    <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Support Tickets</h2>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-full hover:bg-indigo-100 transition-all uppercase">Raise Request</button>
                </div>
                <div className="p-6 space-y-4">
                  {complaints.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-sm font-medium italic">All smooth!</div>
                  ) : complaints.map(c => (
                    <div key={c.id} className="p-4 border border-slate-100 rounded-2xl flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-800 uppercase tracking-tight">{c.title}</h4>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border ${
                          c.status === 'resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>{c.status}</span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1">{c.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Combined Row for Information */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden lg:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="p-8 border-r border-slate-100">
                    <div className="flex items-center gap-3 mb-6">
                      <Megaphone className="w-5 h-5 text-indigo-600" />
                      <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Recent Notices</h2>
                    </div>
                    <div className="space-y-4">
                      {notices.slice(0, 2).map(n => (
                        <div key={n.id} className="p-4 bg-slate-50 rounded-2xl">
                          <h4 className="font-bold text-slate-800 text-sm mb-1 uppercase tracking-tight">{n.title}</h4>
                          <p className="text-xs text-slate-500 line-clamp-2">{n.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Ad Banner — between Notices and Events */}
                  <div className="px-8 pb-4">
                    <AdBanner societyId={user?.society_id} isMobile={false} />
                  </div>
                  <div className="p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <Calendar className="w-5 h-5 text-emerald-600" />
                      <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Upcoming Events</h2>
                    </div>
                    <div className="space-y-4">
                      {events.slice(0, 2).map(e => (
                        <div key={e.id} className="flex gap-4 items-center">
                          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex flex-col items-center justify-center font-bold">
                            <span className="text-[10px] uppercase">{new Date(e.event_date).toLocaleString('default', { month: 'short' })}</span>
                            <span className="text-lg">{new Date(e.event_date).getDate()}</span>
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm uppercase tracking-tight">{e.event_name}</h4>
                            <p className="text-xs text-slate-400">{e.location || 'Society Area'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default TenantDashboard;
