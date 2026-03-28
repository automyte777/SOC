import React, { useState } from 'react';
import { Users, Plus, Pencil, Trash2, Search, Loader2, Home, CheckCircle2, Clock } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import Modal from '../components/Modal';
import useAdminCrud from '../hooks/useAdminCrud';

const EMPTY_FORM = { name: '', email: '', phone: '', flat_id: '', role: 'home_owner', status: 'pending' };

export default function Residents() {
  const { data: residentsData, loading, error, create, update, remove } = useAdminCrud('/api/admin/members');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const residents = Array.isArray(residentsData) ? residentsData : [];

  const filtered = residents.filter(r =>
    r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.email?.toLowerCase().includes(search.toLowerCase()) ||
    r.flat_number?.toLowerCase().includes(search.toLowerCase()) ||
    r.phone?.includes(search)
  );

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true); };
  const openEdit = (item) => { 
    setEditItem(item); 
    setForm({ 
        name: item.name, 
        email: item.email || '', 
        phone: item.phone || '', 
        flat_id: item.flat_id || '', 
        role: item.role || 'home_owner',
        status: item.status || 'pending'
    }); 
    setFormError(''); setModalOpen(true); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone) { setFormError('Name and phone are required.'); return; }
    setSaving(true); setFormError('');
    try {
      if (editItem) await update(editItem.id, form);
      else await create(form);
      setModalOpen(false);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Save failed.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this resident?')) return;
    try { await remove(id); } catch { alert('Delete failed.'); }
  };

  const getRoleBadge = (role) => {
    const map = { home_owner: 'bg-blue-50 text-blue-700', tenant: 'bg-purple-50 text-purple-700', home_member: 'bg-indigo-50 text-indigo-700' };
    return map[role] || 'bg-slate-50 text-slate-600';
  };

  const getStatusBadge = (status) => {
    if (status === 'active') return <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"><CheckCircle2 className="w-3 h-3" /> Approved</span>;
    if (status === 'pending') return <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"><Clock className="w-3 h-3" /> Pending Approval</span>;
    return <span className="text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">{status}</span>;
  };

  return (
    <PageLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-100">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Residents</h1>
            <p className="text-slate-500 text-sm">{residents.length} total users in society</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-100 hover:shadow-blue-200 transition-all active:scale-95">
          <Plus className="w-4 h-4" /> Register Resident
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, phone, flat..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /> Loading records...</div>
        ) : error ? (
          <div className="py-10 text-center text-red-500">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100">
                  {['Resident', 'Contact Details', 'Flat No.', 'Status / Role', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan="5" className="py-12 text-center text-slate-400 text-sm">No residents found.</td></tr>
                ) : filtered.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm">
                          {r.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-slate-800">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-700 font-medium">{r.phone}</div>
                      <div className="text-[10px] text-slate-400">{r.email || 'No email'}</div>
                    </td>
                    <td className="px-6 py-4">
                      {r.flat_number ? (
                        <span className="flex items-center gap-1.5 text-sm text-slate-700 font-bold bg-slate-50 px-2 py-1 rounded-lg w-fit">
                          <Home className="w-3.5 h-3.5 text-slate-400" />
                          {r.block ? `${r.block}-` : ''}{r.flat_number}
                        </span>
                      ) : <span className="text-slate-300 italic text-sm">Not assigned</span>}
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex flex-col gap-1.5">
                          {getStatusBadge(r.status)}
                          <span className={`w-fit px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-tight ${getRoleBadge(r.role)}`}>{r.role?.replace('_', ' ')}</span>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(r)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(r.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Resident Profile' : 'Add New Resident'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name *</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="e.g. John Doe" required />
            </div>
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="john@example.com" />
            </div>
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone *</label>
                <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="9876543210" required />
            </div>
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Flat ID</label>
                <input type="number" value={form.flat_id} onChange={e => setForm({ ...form, flat_id: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none bg-white focus:ring-2 focus:ring-blue-500/20">
                  <option value="home_owner">Owner</option>
                  <option value="tenant">Tenant</option>
                  <option value="home_member">Member</option>
                </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-70 transition-all flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editItem ? 'Update' : 'Register'}
            </button>
          </div>
        </form>
      </Modal>
    </PageLayout>
  );
}
