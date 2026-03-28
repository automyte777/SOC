import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Users, LogOut, CheckCircle2, Search, Car, UserCheck, Loader2, ArrowRight } from 'lucide-react';
import Modal from '../components/Modal';

export default function SecurityDashboard() {
  const navigate = useNavigate();
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    visitor_name: '',
    phone: '',
    flat_id: '',
    purpose: ''
  });

  const [flats, setFlats] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [visRes, flatRes] = await Promise.all([
        axios.get('/api/member/security/visitors', { headers }),
        axios.get('/api/member/flats', { headers })
      ]);
      if (visRes.data.success) setVisitors(visRes.data.data);
      if (flatRes.data.success) setFlats(flatRes.data.data);
    } catch (e) {
      console.error(e);
      if (e.response?.status === 401) navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const handleAddVisitor = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/member/security/visitors', form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setModalOpen(false);
      fetchData(); // refresh list
    } catch (e) {
      alert('Failed to add visitor');
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/member/security/visitors/${id}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const user = JSON.parse(localStorage.getItem('user')) || {};

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <UserCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold tracking-tight text-white">{user.society_name || 'Society Security'}</h1>
            <p className="text-xs text-blue-400 font-medium">Gate Entrance Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right mr-2">
            <div className="text-sm font-bold">{user.name}</div>
            <div className="text-xs text-slate-400">Security Guard</div>
          </div>
          <button onClick={handleLogout} className="p-2 bg-slate-800 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full space-y-6 flex flex-col">
        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input type="text" placeholder="Search visitors or flat..." className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-500" />
          </div>
          <button onClick={() => { setForm({ visitor_name:'', phone:'', flat_id:'', purpose:'' }); setModalOpen(true); }} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2">
            <UserCheck className="w-5 h-5" /> New Visitor Entry
          </button>
        </div>

        {/* List */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden flex-1 flex flex-col">
          <div className="px-6 py-4 border-b border-slate-700 font-semibold text-slate-300 flex items-center justify-between">
            <span>Recent Gate Activity</span>
            <span className="text-xs font-bold px-2 py-1 bg-slate-700 rounded-md">{visitors.length} Logs</span>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-3">
            {loading ? (
              <div className="flex justify-center items-center h-full text-slate-500 gap-2">
                <Loader2 className="w-6 h-6 animate-spin" /> Loading terminal...
              </div>
            ) : visitors.length === 0 ? (
              <div className="text-center py-20 text-slate-500">No visitors logged today.</div>
            ) : visitors.map(v => (
              <div key={v.id} className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex flex-col sm:flex-row gap-4 sm:items-center justify-between hover:border-slate-600 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg 
                    ${v.status === 'pending_approval' ? 'bg-amber-500/20 text-amber-500' : 
                      v.status === 'approved' || v.status === 'entered' ? 'bg-emerald-500/20 text-emerald-500' :
                      v.status === 'rejected' ? 'bg-red-500/20 text-red-500' : 'bg-slate-700 text-slate-400'}`}>
                    {v.visitor_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-200">{v.visitor_name} <span className="text-sm font-medium text-slate-500 block sm:inline sm:ml-2">Flat {v.flat_number || 'N/A'}</span></h3>
                    <p className="text-xs text-slate-400 mt-1">{v.phone} • {v.purpose || 'Visit'}</p>
                    <div className="mt-2 flex gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border 
                        ${v.status === 'pending_approval' ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' :
                          v.status === 'approved' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' :
                          v.status === 'entered' ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' :
                          v.status === 'rejected' ? 'border-red-500/30 text-red-400 bg-red-500/10' :
                          'border-slate-600 text-slate-400 bg-slate-800'
                        }`}>
                        {v.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 sm:flex-col items-stretch sm:items-end">
                  {v.status === 'approved' && (
                    <button onClick={() => changeStatus(v.id, 'entered')} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex-1 text-center">
                      Mark Entered
                    </button>
                  )}
                  {v.status === 'entered' && (
                    <button onClick={() => changeStatus(v.id, 'exited')} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition-colors flex-1 text-center">
                      Mark Exited
                    </button>
                  )}
                  {v.status === 'pending_approval' && (
                    <div className="text-xs font-medium text-amber-500 px-3 py-2 bg-amber-500/10 rounded-lg flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Waiting for Resident
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Modal Overlay */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New Visitor Entry" dark>
        <form onSubmit={handleAddVisitor} className="space-y-4">
          <div>
            <label className="text-slate-400 text-xs font-bold uppercase mb-1 block">Visitor Name</label>
            <input required type="text" value={form.visitor_name} onChange={e => setForm({...form, visitor_name: e.target.value})} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500" placeholder="e.g. Swiggy Delivery" />
          </div>
          <div>
            <label className="text-slate-400 text-xs font-bold uppercase mb-1 block">Phone Number</label>
            <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500" placeholder="+91..." />
          </div>
          <div>
            <label className="text-slate-400 text-xs font-bold uppercase mb-1 block">Visiting Flat</label>
            <select required value={form.flat_id} onChange={e => setForm({...form, flat_id: e.target.value})} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500">
              <option value="">Select Flat...</option>
              {flats.map(f => <option key={f.id} value={f.id}>{f.building ? `${f.building}-` : ''}{f.flat_number}</option>)}
            </select>
          </div>
          <div>
            <label className="text-slate-400 text-xs font-bold uppercase mb-1 block">Purpose / Details</label>
            <input type="text" value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500" placeholder="Food Delivery, Guest, etc." />
          </div>
          
          <button type="submit" disabled={saving} className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Notify Resident'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
