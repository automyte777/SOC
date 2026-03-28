import React, { useState } from 'react';
import { UserPlus, Plus, Pencil, Trash2, Search, Loader2, Clock } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import Modal from '../components/Modal';
import useAdminCrud from '../hooks/useAdminCrud';
import { getUser } from '../utils/auth';

const EMPTY_FORM = { visitor_name: '', phone: '', flat_id: '', purpose: '', status: 'entered' };

export default function Visitors() {
  const user = getUser();
  const isAdmin = user?.role === 'society_secretary';
  
  const { data: visitorsData, loading, error, create, update, remove } = useAdminCrud(
    isAdmin ? '/api/admin/visitors' : '/api/member/my-visitors'
  );

  const { data: flatsData } = useAdminCrud(isAdmin ? '/api/admin/flats' : null);
  const flats = Array.isArray(flatsData) ? flatsData : [];

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const visitorsList = Array.isArray(visitorsData) ? visitorsData : [];

  const filtered = visitorsList.filter(v =>
    v.visitor_name?.toLowerCase().includes(search.toLowerCase()) ||
    v.phone?.includes(search) ||
    v.purpose?.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({ 
        visitor_name: item.visitor_name, 
        phone: item.phone || '', 
        flat_id: item.flat_id || '', 
        purpose: item.purpose || '', 
        status: item.status || 'entered' 
    });
    setFormError(''); setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.visitor_name) { setFormError('Visitor name is required.'); return; }
    setSaving(true); setFormError('');
    try {
      if (editItem) {
        await update(editItem.id, { 
            ...form, 
            exit_time: form.status === 'exited' ? new Date().toISOString() : null 
        });
      } else {
        await create(form);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Save failed.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this visitor record?')) return;
    try { await remove(id); } catch { alert('Delete failed.'); }
  };

  const statusColor = (s) => ({
    entered: 'bg-blue-50 text-blue-700',
    exited: 'bg-slate-50 text-slate-600',
    pending_approval: 'bg-orange-50 text-orange-700',
    approved: 'bg-emerald-50 text-emerald-700',
    rejected: 'bg-rose-50 text-rose-700'
  }[s] || 'bg-slate-50 text-slate-600');

  const formatTime = (t) => t ? new Date(t).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <PageLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-violet-100">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Visitor Log</h1>
            <p className="text-slate-500 text-sm">{visitorsList.filter(v => v.status === 'entered').length} currently inside</p>
          </div>
        </div>
        {isAdmin && (
          <button onClick={openAdd} className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-violet-100 hover:shadow-violet-200 transition-all active:scale-95">
            <Plus className="w-4 h-4" /> Log Visitor
          </button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search visitors..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /> Loading visitors...</div>
        ) : error ? (
          <div className="py-10 text-center text-red-500">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100">
                  {['Visitor', 'Phone', 'Flat', 'Purpose', 'Entry', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan="7" className="py-12 text-center text-slate-400 text-sm">No visitor records found.</td></tr>
                ) : filtered.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 text-sm font-semibold text-slate-800">{v.visitor_name}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{v.phone || '—'}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{v.flat_number || '—'}</td>
                    <td className="px-5 py-4 text-sm text-slate-600 max-w-[150px] truncate">{v.purpose || '—'}</td>
                    <td className="px-5 py-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(v.entry_time)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusColor(v.status)}`}>{v.status}</span>
                    </td>
                    <td className="px-5 py-4">
                      {isAdmin ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(v)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(v.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        v.status === 'pending_approval' && (
                          <div className="flex gap-1">
                             <button className="px-2 py-1 bg-emerald-500 text-white text-[10px] font-black rounded uppercase">Allow</button>
                             <button className="px-2 py-1 bg-rose-500 text-white text-[10px] font-black rounded uppercase">Deny</button>
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Visitor' : 'Log Visitor Entry'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Visitor Name *</label>
            <input type="text" value={form.visitor_name} onChange={e => setForm({ ...form, visitor_name: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="John Smith" required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone</label>
            <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="9876543210" />
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
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Purpose</label>
            <input type="text" value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="Delivery / Meeting / Guest" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
              <option value="entered">Entered</option>
              <option value="exited">Exited</option>
              <option value="pending_approval">Pending Approval</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-70 transition-all flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editItem ? 'Update' : 'Log Entry'}
            </button>
          </div>
        </form>
      </Modal>
    </PageLayout>
  );
}
