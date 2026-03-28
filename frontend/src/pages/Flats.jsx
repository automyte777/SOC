import React, { useState } from 'react';
import { Building2, Plus, Pencil, Trash2, Search, Loader2, Home } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import Modal from '../components/Modal';
import useAdminCrud from '../hooks/useAdminCrud';
import { getUser } from '../utils/auth';

const EMPTY_FORM = { flat_number: '', building: '', owner_name: '', status: 'vacant' };

export default function Flats() {
  const user = getUser();
  const isAdmin = user?.role === 'society_secretary';
  
  const { data: flatsData, loading, error, create, update, remove } = useAdminCrud(
    isAdmin ? '/api/admin/flats' : '/api/member/my-property'
  );

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const flatList = Array.isArray(flatsData) ? flatsData : (flatsData ? [flatsData] : []);

  const filtered = flatList.filter(f => {
    const matchesSearch = 
      f.flat_number?.toString().toLowerCase().includes(search.toLowerCase()) ||
      f.building?.toLowerCase().includes(search.toLowerCase()) ||
      f.owner_name?.toLowerCase().includes(search.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'occupied') return matchesSearch && f.status === 'occupied';
    if (statusFilter === 'pending') return matchesSearch && f.status === 'pending_verification';
    if (statusFilter === 'vacant') return matchesSearch && f.status === 'vacant';
    return matchesSearch;
  });

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true); };
  const openEdit = (item) => { 
    setEditItem(item); 
    setForm({ 
      flat_number: item.flat_number, 
      building: item.building || '', 
      owner_name: item.owner_name || '', 
      status: item.status || 'vacant' 
    }); 
    setFormError(''); 
    setModalOpen(true); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.flat_number) { setFormError('Flat number is required.'); return; }
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
    if (!window.confirm('Delete this flat?')) return;
    try { await remove(id); } catch { alert('Delete failed.'); }
  };

  const statusColor = (status) => {
    if (status === 'occupied') return 'bg-emerald-50 text-emerald-700';
    if (status === 'pending_verification') return 'bg-purple-50 text-purple-700 border border-purple-100';
    return 'bg-amber-50 text-amber-700';
  };

  return (
    <PageLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-100">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{isAdmin ? 'Flats / Units' : 'My Property'}</h1>
            <p className="text-slate-500 text-sm">{flatList.length} units registered</p>
          </div>
        </div>
        {isAdmin && (
            <button onClick={openAdd} className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-emerald-100 hover:shadow-emerald-200 transition-all active:scale-95">
              <Plus className="w-4 h-4" /> Add Flat
            </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Units', value: flatList.length, color: 'text-slate-800' },
          { label: 'Occupied', value: flatList.filter(f => f.status === 'occupied').length, color: 'text-emerald-600' },
          { label: 'Vacant', value: flatList.filter(f => f.status === 'vacant').length, color: 'text-amber-600' },
          { label: 'Pending', value: flatList.filter(f => f.status === 'pending_verification').length, color: 'text-purple-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search flats..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
        </div>
        
        <div className="flex items-center gap-2 bg-white border border-slate-200 p-1 rounded-xl">
          {['all', 'occupied', 'vacant', 'pending'].map((s) => (
            <button 
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg capitalize transition-all ${statusFilter === s ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
            >{s}</button>
          ))}
        </div>
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /> Loading flats...</div>
        ) : error ? (
          <div className="py-10 text-center text-red-500">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100">
                  {['Flat No.', 'Building', 'Owner', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan="5" className="py-12 text-center text-slate-400 text-sm">No flats found.</td></tr>
                ) : filtered.map(f => (
                  <tr key={f.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-slate-800">{f.flat_number}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{f.building || '—'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-semibold">{f.owner_name || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusColor(f.status)}`}>{f.status?.replace('_', ' ')}</span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(f)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(f.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Flat' : 'Add New Flat'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Flat Number *</label>
            <input type="text" value={form.flat_number} onChange={e => setForm({ ...form, flat_number: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="e.g. A-101" required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Building / Block</label>
            <input type="text" value={form.building} onChange={e => setForm({ ...form, building: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="e.g. Tower A" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Owner Name (Manual Override)</label>
            <input type="text" value={form.owner_name} onChange={e => setForm({ ...form, owner_name: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="John Doe" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none bg-white focus:ring-2 focus:ring-blue-500/20">
              <option value="vacant">Vacant</option>
              <option value="occupied">Occupied</option>
              <option value="pending_verification">Pending Verification</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-70 transition-all flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editItem ? 'Update' : 'Add Flat'}
            </button>
          </div>
        </form>
      </Modal>
    </PageLayout>
  );
}
