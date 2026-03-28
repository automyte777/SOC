import React, { useState, useEffect } from 'react';
import { Users, Search, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import axios from 'axios';
import PageLayout from '../components/PageLayout';

export default function Members() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('pending');

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/members', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setMembers(res.data.data);
      }
    } catch (err) {
      setError('Failed to load member requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleStatusUpdate = async (id, status, is_approved) => {
    const action = status === 'active' ? 'approve' : 'reject';
    if (!window.confirm(`Are you sure you want to ${action} this request?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/admin/members/${id}/status`, { status, is_approved }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchMembers(); // refresh
    } catch (err) {
      alert(`Failed to ${action} user.`);
    }
  };

  const filteredMembers = members.filter(m => {
    const matchesTab = activeTab === 'all' || m.status === activeTab;
    const matchesSearch = m.name?.toLowerCase().includes(search.toLowerCase()) || 
                          m.email?.toLowerCase().includes(search.toLowerCase()) ||
                          m.flat_number?.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getRoleBadge = (role) => {
    const map = {
      home_owner: 'bg-blue-50 text-blue-700',
      home_member: 'bg-indigo-50 text-indigo-700',
      tenant: 'bg-purple-50 text-purple-700'
    };
    return map[role] || 'bg-slate-50 text-slate-600';
  };

  const getStatusBadge = (status) => {
    if (status === 'pending') return <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-50 rounded-full"><Clock className="w-3.5 h-3.5"/> Pending</span>;
    if (status === 'active') return <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-full"><CheckCircle2 className="w-3.5 h-3.5"/> Approved</span>;
    if (status === 'rejected') return <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-red-700 bg-red-50 rounded-full"><XCircle className="w-3.5 h-3.5"/> Rejected</span>;
    return null;
  };

  return (
    <PageLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Member Requests</h1>
            <p className="text-slate-500 text-sm">Approve or reject signup requests from owners and tenants.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex gap-2 p-1.5 bg-slate-100/50 rounded-xl border border-slate-200">
          <button onClick={() => setActiveTab('pending')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Pending</button>
          <button onClick={() => setActiveTab('active')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Approved</button>
          <button onClick={() => setActiveTab('rejected')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'rejected' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Rejected</button>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search records..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16 gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" /> Loading members...
          </div>
        ) : error ? (
          <div className="py-10 text-center text-red-500 font-medium">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">User Details</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Flat / Block</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Lease / Rental</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredMembers.length === 0 ? (
                  <tr><td colSpan="7" className="py-12 text-center text-slate-400 text-sm font-medium">No records found matching this criteria.</td></tr>
                ) : filteredMembers.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                          {m.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-slate-800">{m.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-700 font-medium">{m.phone}</div>
                      <div className="text-xs text-slate-400">{m.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-slate-800">Flat {m.flat_number}</div>
                      <div className="text-xs text-slate-400 uppercase">Block {m.block || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      {m.role === 'tenant' ? (
                        <div className="text-xs">
                           <p className="font-bold text-slate-800">Ends: {m.rental_end_date ? new Date(m.rental_end_date).toLocaleDateString() : 'N/A'}</p>
                           <p className="text-slate-400">Start: {m.rental_start_date ? new Date(m.rental_start_date).toLocaleDateString() : 'N/A'}</p>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs italic">— Owners —</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${getRoleBadge(m.role)}`}>{m.role.replace('_', ' ')}</span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(m.status)}
                    </td>
                    <td className="px-6 py-4">
                      {m.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleStatusUpdate(m.id, 'active', true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button onClick={() => handleStatusUpdate(m.id, 'rejected', false)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors">
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      )}
                      {m.status !== 'pending' && (
                        <span className="text-slate-400 text-xs font-medium italic">Handled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
