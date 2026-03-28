import React, { useState } from 'react';
import { ClipboardList, Plus, Pencil, Trash2, Search, Loader2 } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import Modal from '../components/Modal';
import useAdminCrud from '../hooks/useAdminCrud';
import { getUser } from '../utils/auth';

const EMPTY_FORM = { flat_id: '', title: '', description: '', status: 'open', priority: 'medium' };

const STATUS_COLORS = {
  open: 'bg-red-50 text-red-700',
  'in-progress': 'bg-yellow-50 text-yellow-700',
  resolved: 'bg-emerald-50 text-emerald-700',
};
const PRIORITY_COLORS = {
  high: 'bg-rose-50 text-rose-700',
  medium: 'bg-orange-50 text-orange-700',
  low: 'bg-slate-50 text-slate-600',
};

export default function Complaints() {
  const user = getUser();
  const isAdmin = user?.role === 'society_secretary';
  
  const { data: complaintsData, loading, error, create, update, remove } = useAdminCrud(
    isAdmin ? '/api/admin/complaints' : '/api/member/my-complaints'
  );

  const { data: flatsData } = useAdminCrud(isAdmin ? '/api/admin/flats' : null);
  const flats = Array.isArray(flatsData) ? flatsData : [];

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const complaintList = Array.isArray(complaintsData) ? complaintsData : [];

  const filtered = complaintList.filter(c => {
    const matchSearch = c.title?.toLowerCase().includes(search.toLowerCase()) || c.flat_number?.includes(search);
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({ 
        flat_id: item.flat_id || '', 
        title: item.title, 
        description: item.description || '', 
        status: item.status, 
        priority: item.priority || 'medium' 
    });
    setFormError(''); setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title) { setFormError('Title is required.'); return; }
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
    if (!window.confirm('Delete this complaint?')) return;
    try { await remove(id); } catch { alert('Delete failed.'); }
  };

  return (
    <PageLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-red-100">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Complaints</h1>
            <p className="text-slate-500 text-sm">{complaintList.filter(c => c.status === 'open').length} open complaints</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-rose-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-red-100 hover:shadow-red-200 transition-all active:scale-95">
          <Plus className="w-4 h-4" /> Add Complaint
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'open', 'in-progress', 'resolved'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${filterStatus === s ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{s}</button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search complaints..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /> Loading...</div>
        ) : error ? (
          <div className="py-10 text-center text-red-500">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100">
                  {['Title', 'Flat', 'Priority', 'Status', 'Date', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan="6" className="py-12 text-center text-slate-400 text-sm">No complaints found.</td></tr>
                ) : filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-800">{c.title}</p>
                      {c.description && <p className="text-xs text-slate-400 mt-0.5 max-w-[200px] truncate">{c.description}</p>}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{c.flat_number || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${PRIORITY_COLORS[c.priority] || ''}`}>{c.priority}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[c.status] || ''}`}>{c.status}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
                    <td className="px-6 py-4">
                      {isAdmin ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(c)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(c.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        c.status === 'open' && (
                          <div className="flex items-center gap-1 group relative">
                             <span className="text-[10px] text-slate-400 italic">Waiting for Society Action</span>
                          </div>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Complaint' : 'File New Complaint'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Title *</label>
            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="Water leakage in corridor" required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
            <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none" placeholder="Describe the issue..." />
          </div>
          {isAdmin && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Select Flat</label>
                <select 
                    value={form.flat_id} 
                    onChange={e => setForm({ ...form, flat_id: e.target.value })} 
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none bg-white focus:ring-2 focus:ring-blue-500/20"
                >
                    <option value="">-- Choose Flat --</option>
                    {flats.map(f => (
                        <option key={f.id} value={f.id}>Flat {f.flat_number} {f.building ? `(${f.building})` : ''}</option>
                    ))}
                </select>
              </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            {isAdmin && (
                <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                    <option value="open">Open</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                </select>
                </div>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-70 transition-all flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editItem ? 'Update' : 'File Complaint'}
            </button>
          </div>
        </form>
      </Modal>
    </PageLayout>
  );
}
