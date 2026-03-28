import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Home, ClipboardList, Megaphone, Users, 
  Clock, ShieldCheck, CreditCard, AlertTriangle, 
  Calendar, Car, Plus, Trash2, CheckCircle2, XCircle
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { getUser } from '../utils/auth';

const OwnerDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data states
  const [property, setProperty] = useState(null);
  const [family, setFamily] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [events, setEvents] = useState([]);
  const [notices, setNotices] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  // Form states
  const [showAddMember, setShowAddMember] = useState(false);
  const [showPreApprove, setShowPreApprove] = useState(false);
  const [showCreateComplaint, setShowCreateComplaint] = useState(false);
  
  // Expiry states
  const [isExpired, setIsExpired] = useState(false);
  const [expiryMessage, setExpiryMessage] = useState('');

  // Pagination
  const [visitorPage, setVisitorPage] = useState(1);
  const [totalVisitors, setTotalVisitors] = useState(0);
  
  const user = getUser();
  const societyName = user?.society_name || 'My Society';

  const fetchData = async (isPoll = false) => {
    if (!isPoll) setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [
        propRes, famRes, visRes, mainRes, compRes, evRes, notRes, vehRes
      ] = await Promise.all([
        axios.get('/api/member/my-property', { headers }).catch(e => e.response),
        axios.get('/api/member/my-family', { headers }),
        axios.get(`/api/member/my-visitors?page=${visitorPage}`, { headers }),
        axios.get('/api/member/my-maintenance', { headers }),
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
      if (famRes.data.success) setFamily(famRes.data.data);
      if (visRes.data.success) {
        setVisitors(visRes.data.data);
        setTotalVisitors(visRes.data.total);
      }
      if (mainRes.data.success) setMaintenance(mainRes.data.data);
      if (compRes.data.success) setComplaints(compRes.data.data);
      if (evRes.data.success) setEvents(evRes.data.data);
      if (notRes.data.success) setNotices(notRes.data.data);
      if (vehRes.data.success) setVehicles(vehRes.data.data);
      
    } catch (e) {
      console.error(e);
      if (!isPoll) setError('Failed to load dashboard data. Please try again.');
    } finally {
      if (!isPoll) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const poll = setInterval(() => fetchData(true), 15000); // Poll every 15s
    return () => clearInterval(poll);
  }, [visitorPage]);

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

  const calculateMaintenanceSummary = () => {
    const totalDue = maintenance.filter(m => m.status === 'pending').reduce((acc, m) => acc + parseFloat(m.amount), 0);
    const totalPaid = maintenance.filter(m => m.status === 'paid').reduce((acc, m) => acc + parseFloat(m.amount), 0);
    return { totalDue, totalPaid };
  };

  const { totalDue, totalPaid } = calculateMaintenanceSummary();

  const handleAddMember = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/member/my-family', data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowAddMember(false);
      fetchData();
    } catch (err) { alert('Failed to add member'); }
  };

  const handlePreApprove = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/member/my-visitors/pre-approve', data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowPreApprove(false);
      fetchData();
    } catch (err) { alert('Failed to pre-approve'); }
  };

  const handleCreateComplaint = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/member/my-complaints', data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowCreateComplaint(false);
      fetchData();
    } catch (err) { alert('Failed to create complaint'); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Loading your dashboard...</p>
      </div>
    </div>
  );

  if (isExpired) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white rounded-3xl p-12 max-w-lg w-full text-center shadow-2xl border border-rose-100 flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 animate-bounce">
          <AlertTriangle className="w-10 h-10" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight mb-3">Access Revoked</h1>
          <p className="text-slate-500 font-medium leading-relaxed">{expiryMessage}</p>
        </div>
        <div className="w-full h-px bg-slate-50 my-2"></div>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Rental Term Expired</p>
        <button onClick={() => window.location.reload()} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all">Check Again</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      
      <main className="flex-1 flex flex-col min-w-0 transition-all duration-300 lg:ml-[260px]">
        <Topbar societyName={societyName} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <div className="p-6 max-w-7xl mx-auto w-full">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 font-bold" />
              <span>{error}</span>
            </div>
          )}

          {/* Modals */}
          {showAddMember && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Add Family Member</h3>
                  <button onClick={() => setShowAddMember(false)}><XCircle className="w-6 h-6 text-slate-300 hover:text-rose-500 transition-colors" /></button>
                </div>
                <form onSubmit={handleAddMember} className="p-8 space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Full Name</label>
                    <input name="name" required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="e.g. Jane Doe" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Phone Number</label>
                    <input name="phone" required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="+91 98765 43210" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Role</label>
                    <select name="role" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                      <option value="home_member">Family Member</option>
                      <option value="tenant">Tenant</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all pt-4">Register Member</button>
                </form>
              </div>
            </div>
          )}

          {showPreApprove && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Pre-approve Visitor</h3>
                  <button onClick={() => setShowPreApprove(false)}><XCircle className="w-6 h-6 text-slate-300 hover:text-rose-500 transition-colors" /></button>
                </div>
                <form onSubmit={handlePreApprove} className="p-8 space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Visitor Name</label>
                    <input name="visitor_name" required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="Guest Name" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Phone Number</label>
                    <input name="phone" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="Visitor's Phone" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Expected Arrivial</label>
                    <input name="expected_time" type="datetime-local" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                  </div>
                  <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">Enable Quick Entry</button>
                </form>
              </div>
            </div>
          )}

          {showCreateComplaint && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Raise Complaint</h3>
                  <button onClick={() => setShowCreateComplaint(false)}><XCircle className="w-6 h-6 text-slate-300 hover:text-rose-500 transition-colors" /></button>
                </div>
                <form onSubmit={handleCreateComplaint} className="p-8 space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Subject / Issue</label>
                    <input name="title" required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="e.g. Water Leakage" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Description</label>
                    <textarea name="description" rows="3" required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="Explain the problem in detail..."></textarea>
                  </div>
                  <button type="submit" className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all">Submit Complaint</button>
                </form>
              </div>
            </div>
          )}

          <header className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight text-3xl">Resident Command Center</h1>
                <p className="text-slate-500 mt-1">Hello, {user?.name}. Everything looking good at {property?.building || 'Block'} - {property?.flat_number}.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowPreApprove(true)} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 hover:scale-[1.02] active:scale-95">
                  <ShieldCheck className="w-4 h-4" /> Pre-approve Visitor
                </button>
              </div>
            </div>
          </header>

          {/* Top Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="p-4 bg-blue-50 text-blue-600 rounded-xl font-bold"><Home className="w-6 h-6" /></div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">My Property</p>
                <h3 className="text-xl font-extrabold text-slate-800">{property?.flat_number}</h3>
                <p className="text-[10px] text-slate-500 font-medium">{property?.flat_type || 'Residential'} • {property?.building || 'Wing'}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl font-bold"><Users className="w-6 h-6" /></div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Family Members</p>
                <h3 className="text-xl font-extrabold text-slate-800">{family.length + 1}</h3>
                <p className="text-[10px] text-slate-500 font-medium">{family.length} Registered Members</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="p-4 bg-amber-50 text-amber-600 rounded-xl font-bold"><Clock className="w-6 h-6" /></div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Gate Queue</p>
                <h3 className="text-xl font-extrabold text-slate-800">
                  {visitors.filter(v => v.status === 'pending_approval').length}
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">Pending Approvals</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="p-4 bg-rose-50 text-rose-600 rounded-xl font-bold"><CreditCard className="w-6 h-6" /></div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Balance Due</p>
                <h3 className="text-xl font-extrabold text-slate-800">₹{totalDue}</h3>
                <p className="text-[10px] text-slate-500 font-medium">Maintenance Owed</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column (2 cols wide) */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Gate Activity */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Recent Visitor Activity</h2>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full uppercase tracking-widest">Live Security</span>
                </div>
                <div className="p-2">
                  <div className="space-y-1">
                    {visitors.length === 0 ? (
                      <div className="py-20 text-center flex flex-col items-center gap-3">
                        <div className="p-4 bg-slate-50 rounded-full text-slate-300">
                          <Users className="w-8 h-8" />
                        </div>
                        <p className="text-slate-400 text-sm font-medium italic">No recent visitor activity for your flat.</p>
                      </div>
                    ) : visitors.map(v => (
                      <div key={v.id} className="p-5 flex items-center justify-between hover:bg-slate-50/80 rounded-2xl transition-all border border-transparent hover:border-slate-100 group">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${
                            v.status === 'pending_approval' ? 'bg-amber-100 text-amber-600' :
                            v.status === 'approved' || v.status === 'entered' ? 'bg-emerald-100 text-emerald-600' :
                            'bg-slate-200 text-slate-500'
                          }`}>
                            {v.visitor_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{v.visitor_name}</p>
                            <p className="text-xs text-slate-400 font-medium flex items-center gap-2">
                              {v.purpose || 'Visitor'} • 
                              <Clock className="w-3 h-3" /> 
                              {new Date(v.entry_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                              {v.exit_time && ` - ${new Date(v.exit_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
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
                  {totalVisitors > 10 && (
                    <div className="p-6 border-t border-slate-50 flex items-center justify-between">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Page {visitorPage} of {Math.ceil(totalVisitors/10)}</p>
                      <div className="flex gap-2">
                        <button 
                          disabled={visitorPage === 1}
                          onClick={() => setVisitorPage(v => v - 1)}
                          className="px-4 py-2 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all"
                        >Prev</button>
                        <button 
                          disabled={visitorPage >= Math.ceil(totalVisitors/10)}
                          onClick={() => setVisitorPage(v => v + 1)}
                          className="px-4 py-2 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all"
                        >Next</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Maintenance List */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Maintenance History</h2>
                  </div>
                  <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700">View All Invoices</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Month</th>
                        <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                        <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Due Date</th>
                        <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="px-8 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {maintenance.length === 0 ? (
                        <tr><td colSpan="5" className="px-8 py-10 text-center text-slate-400 italic text-sm">No billing records found.</td></tr>
                      ) : maintenance.map(m => (
                        <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-5 font-bold text-slate-800">{m.billing_month || new Date(m.due_date).toLocaleString('default', { month: 'long', year: 'numeric' })}</td>
                          <td className="px-8 py-5 font-extrabold text-slate-900">₹{m.amount}</td>
                          <td className="px-8 py-5 text-sm text-slate-500 font-medium">{new Date(m.due_date).toLocaleDateString()}</td>
                          <td className="px-8 py-5">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-widest ${
                              m.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600 animate-pulse'
                            }`}>
                              {m.status}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right">
                            {m.status === 'pending' ? (
                              <button className="px-4 py-1.5 bg-indigo-600 text-white text-[10px] font-black rounded-full hover:bg-indigo-700 transition-all uppercase shadow-md shadow-indigo-100">Pay Now</button>
                            ) : (
                              <button className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><ClipboardList className="w-4 h-4" /></button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Complaints & Requests */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Support & Complaints</h2>
                  </div>
                  <button onClick={() => setShowCreateComplaint(true)} className="flex items-center gap-2 px-4 py-1.5 bg-rose-50 text-rose-600 text-[10px] font-black rounded-full hover:bg-rose-100 transition-all uppercase">Raise Ticket</button>
                </div>
                <div className="p-8 space-y-4">
                  {complaints.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-sm font-medium italic">All smooth! No active complaints.</div>
                  ) : complaints.map(c => (
                    <div key={c.id} className="p-5 border border-slate-100 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-bold text-slate-800 uppercase tracking-tight">{c.title}</h4>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${
                            c.priority === 'high' ? 'bg-rose-50 text-rose-600' : 
                            c.priority === 'medium' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'
                          }`}>{c.priority}</span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1">{c.description}</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className={`px-3 py-1 text-[10px] font-black rounded-lg uppercase tracking-widest border-2 ${
                          c.status === 'resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          c.status === 'in-progress' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>{c.status}</span>
                        <p className="text-[10px] text-slate-400 font-bold">{new Date(c.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column (1 col wide) */}
            <div className="space-y-8 text-3xl font-bold">
              
              {/* Family Members */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Family Members</h2>
                  </div>
                  {user.role === 'home_owner' && (
                    <button onClick={() => setShowAddMember(true)} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all active:scale-95"><Plus className="w-4 h-4" /></button>
                  )}
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-indigo-50/30 rounded-2xl border border-indigo-50">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-black">{user.name.charAt(0)}</div>
                    <div>
                      <p className="font-bold text-slate-800 uppercase tracking-tight">{user.name} (You)</p>
                      <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">Primary Owner</p>
                    </div>
                  </div>
                  {family.map(f => (
                    <div key={f.id} className="flex items-center justify-between p-4 border border-slate-50 rounded-2xl hover:bg-slate-50 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black transition-colors ${
                          f.role === 'tenant' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                        }`}>{f.name.charAt(0)}</div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm uppercase tracking-tight">{f.name}</p>
                          <p className={`text-[10px] font-black uppercase tracking-widest ${
                            f.role === 'tenant' ? 'text-amber-600' : 'text-slate-400'
                          }`}>{f.role.replace('_', ' ')}</p>
                        </div>
                      </div>
                      <button className="text-slate-200 hover:text-rose-500 p-2 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notice Board */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-50 flex items-center gap-3">
                  <Megaphone className="w-5 h-5 text-rose-500" />
                  <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Notice Board</h2>
                </div>
                <div className="p-6 space-y-4">
                  {notices.length === 0 ? (
                    <div className="text-center py-6 flex flex-col items-center gap-2">
                       <Megaphone className="w-8 h-8 text-slate-100" />
                       <p className="text-slate-400 italic text-xs font-medium uppercase tracking-widest">No Active Notices</p>
                    </div>
                  ) : notices.slice(0, 3).map(n => (
                    <div key={n.id} className="p-5 border-l-4 border-rose-500 bg-rose-50/30 rounded-r-2xl">
                      <h4 className="font-bold text-slate-800 text-sm mb-1 uppercase tracking-tight">{n.title}</h4>
                      <p className="text-xs text-slate-600 line-clamp-2 mb-2 font-medium leading-relaxed">{n.description}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{new Date(n.created_at).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'})}</p>
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
                  {events.length === 0 ? (
                    <p className="text-center py-6 text-slate-400 italic text-sm font-medium">No upcoming events.</p>
                  ) : events.slice(0, 3).map(e => (
                    <div key={e.id} className="flex gap-4">
                      <div className="shrink-0 w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex flex-col items-center justify-center font-bold">
                        <span className="text-[10px] uppercase leading-none">{new Date(e.event_date).toLocaleString('default', { month: 'short' })}</span>
                        <span className="text-lg leading-tight">{new Date(e.event_date).getDate()}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm uppercase tracking-tight">{e.event_name}</h4>
                        <p className="text-xs text-slate-400 font-medium">@{e.location || 'Society Area'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Parking & Vehicles */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-50 flex items-center gap-3">
                  <Car className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Vehicles & Parking</h2>
                </div>
                <div className="p-6 space-y-4">
                  {vehicles.length === 0 ? (
                    <div className="text-center py-6 flex flex-col items-center gap-2">
                       <Car className="w-8 h-8 text-slate-100" />
                       <p className="text-slate-400 italic text-xs font-medium uppercase tracking-widest">No Vehicles Bound</p>
                    </div>
                  ) : vehicles.map(v => (
                    <div key={v.id} className="p-4 border border-slate-100 rounded-2xl flex items-center justify-between">
                      <div>
                        <p className="font-black text-slate-800 text-sm tracking-widest uppercase">{v.vehicle_number}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest border-t border-slate-50 mt-1 pt-1">{v.vehicle_type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Slot</p>
                        <span className="px-2 py-1 bg-slate-900 text-white text-xs font-black rounded-lg uppercase tracking-tight">{v.parking_slot || 'N/A'}</span>
                      </div>
                    </div>
                  ))}
                  {user.role === 'home_owner' && (
                    <button className="w-full py-3 border-2 border-dashed border-slate-100 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center justify-center gap-2">
                      <Plus className="w-3 h-3" /> Add Vehicle
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OwnerDashboard;
