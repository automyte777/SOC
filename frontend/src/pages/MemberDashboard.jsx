import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Home, ClipboardList, Megaphone, Users, 
  Clock, ShieldCheck, AlertTriangle, 
  Calendar, Car, CheckCircle2, XCircle, CreditCard, Info
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { getUser } from '../utils/auth';

const MemberDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data states
  const [property, setProperty] = useState(null);
  const [family, setFamily] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [events, setEvents] = useState([]);
  const [notices, setNotices] = useState([]);
  const [extraCharges, setExtraCharges] = useState([]);
  const [mCurrent, setMCurrent] = useState(null);
  const [mHistory, setMHistory] = useState([]);

  const user = getUser();
  const societyName = user?.society_name || 'My Society';

  const fetchData = async (isPoll = false) => {
    if (!isPoll) setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [
        propRes, famRes, visRes, compRes, evRes, notRes
      ] = await Promise.all([
        axios.get('/api/member/my-property', { headers }).catch(e => e.response),
        axios.get('/api/member/my-family', { headers }),
        axios.get('/api/member/my-visitors', { headers }),
        axios.get('/api/member/my-complaints', { headers }),
        axios.get('/api/member/events', { headers }),
        axios.get('/api/member/notices', { headers }),
        axios.get('/api/maintenance/member/my-maintenance', { headers }),
        axios.get('/api/maintenance/member/my-extra-charges', { headers })
      ]);

      if (propRes?.data?.success) setProperty(propRes.data.data);
      if (famRes.data.success) setFamily(famRes.data.data);
      if (visRes.data.success) setVisitors(visRes.data.data);
      if (compRes.data.success) setComplaints(compRes.data.data);
      if (evRes.data.success) setEvents(evRes.data.data);
      if (notRes.data.success) setNotices(notRes.data.data);
      
      if (mainRes.data?.success) {
        setMCurrent(mainRes.data.current);
        setMHistory(mainRes.data.history);
      }
      if (ecRes?.data?.success) {
        setExtraCharges(ecRes.data.data);
      }
      
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

  const handlePayMaintenance = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/maintenance/member/pay-maintenance/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) { alert('Payment simulation failed'); }
  };

  const handlePayExtra = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/maintenance/member/pay-extra-charge/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) { alert('Payment simulation failed'); }
  };


  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      
      <main className="flex-1 flex flex-col min-w-0 transition-all duration-300 lg:ml-[260px]">
        <Topbar societyName={societyName} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <div className="p-6 max-w-7xl mx-auto w-full">
          <header className="mb-8">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight text-3xl">Resident Portal</h1>
            <p className="text-slate-500 mt-1">Hello, {user?.name}. Living at Flat {user.flat_number}.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="p-4 bg-blue-50 text-blue-600 rounded-xl font-bold"><Home className="w-6 h-6" /></div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Property</p>
                <h3 className="text-xl font-extrabold text-slate-800">{user.flat_number}</h3>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl font-bold"><Users className="w-6 h-6" /></div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Co-Residents</p>
                <h3 className="text-xl font-extrabold text-slate-800">{family.length}</h3>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="p-4 bg-amber-50 text-amber-600 rounded-xl font-bold"><Clock className="w-6 h-6" /></div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Gate Queue</p>
                <h3 className="text-xl font-extrabold text-slate-800">
                  {visitors.filter(v => v.status === 'pending_approval').length}
                </h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Visitor Board */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Recent Visitors</h2>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full uppercase tracking-widest">Live</span>
                </div>
                <div className="p-4">
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
                            <button onClick={() => handleVisitorAction(v.id, 'rejected')} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all active:scale-90"><XCircle className="w-4 h-4" /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>



              {/* Maintenance & Extra Charges (Member) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-white rounded-3xl border-2 border-indigo-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-8 py-6 bg-indigo-50/20 border-b border-indigo-100 flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <CreditCard className="w-5 h-5 text-indigo-600" />
                          <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Maintenance</h2>
                       </div>
                    </div>
                    <div className="p-8">
                       {mCurrent ? (
                         <div className="space-y-4">
                            <div className="flex justify-between items-center">
                               <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{new Date(mCurrent.month + '-01').toLocaleString('default', { month: 'long' })} Bill</span>
                               <span className="text-xl font-black text-slate-900">₹{parseFloat(mCurrent.amount).toLocaleString()}</span>
                            </div>
                            <div className={`p-4 rounded-2xl flex items-center justify-between ${mCurrent.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-600'}`}>
                               <span className="text-[10px] font-black uppercase tracking-widest">Status: {mCurrent.status}</span>
                               {mCurrent.status === 'Pending' && (
                                 <button onClick={() => handlePayMaintenance(mCurrent.id)} className="px-4 py-1.5 bg-slate-900 text-white text-[9px] font-black rounded-lg uppercase shadow-lg shadow-slate-200">Pay Now</button>
                               )}
                            </div>
                         </div>
                       ) : <p className="text-center py-4 text-slate-400 text-xs font-bold uppercase tracking-widest italic tracking-tight">No Pending Maintenance</p>}
                    </div>
                 </div>

                 <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                       <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Extra Dues</h2>
                    </div>
                    <div className="p-6 space-y-3">
                       {extraCharges.length === 0 ? <p className="text-center py-4 text-slate-300 text-[10px] font-black uppercase tracking-widest">NONE</p> : extraCharges.map(ec => (
                         <div key={ec.assignment_id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                            <span className="text-xs font-bold text-slate-700">{ec.title}</span>
                            {ec.status === 'Pending' ? (
                              <button onClick={() => handlePayExtra(ec.assignment_id)} className="text-[9px] font-black text-indigo-600 underline">Pay ₹{parseFloat(ec.amount).toLocaleString()}</button>
                            ) : <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{ec.status}</span>}
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
            </div>

            <div className="space-y-8">
              {/* Notice Board */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-50 flex items-center gap-3">
                  <Megaphone className="w-5 h-5 text-rose-500" />
                  <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Notices</h2>
                </div>
                <div className="p-6 space-y-4">
                  {notices.slice(0, 3).map(n => (
                    <div key={n.id} className="p-5 border-l-4 border-rose-500 bg-rose-50/30 rounded-r-2xl">
                      <h4 className="font-bold text-slate-800 text-sm mb-1 uppercase tracking-tight">{n.title}</h4>
                      <p className="text-xs text-slate-600 line-clamp-2">{n.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Events */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-50 flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Events</h2>
                </div>
                <div className="p-6 space-y-4">
                  {events.slice(0, 3).map(e => (
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
      </main>
    </div>
  );
};

export default MemberDashboard;
