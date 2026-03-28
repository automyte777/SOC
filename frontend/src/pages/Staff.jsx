import React, { useState } from 'react';
import { UserCheck, Plus, Pencil, Trash2, Search, Loader2 } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import Modal from '../components/Modal';
import useAdminCrud from '../hooks/useAdminCrud';

const EMPTY_FORM = { name: '', phone: '', role: '', salary: '', shift: '' };

const ROLE_COLORS = {
  Security: 'bg-red-50 text-red-700',
  Cleaner: 'bg-blue-50 text-blue-700',
  Gardener: 'bg-emerald-50 text-emerald-700',
  Plumber: 'bg-orange-50 text-orange-700',
  Electrician: 'bg-yellow-50 text-yellow-700',
  Manager: 'bg-purple-50 text-purple-700',
};

export default function Staff() {
  const { data, loading, error, create, update, remove } = useAdminCrud('/api/admin/staff');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const filtered = data.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.role?.toLowerCase().includes(search.toLowerCase()) ||
    s.phone?.includes(search)
  );

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({ name: item.name, phone: item.phone || '', role: item.role || '', salary: item.salary || '', shift: item.shift || '' });
    setFormError(''); setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.role) { setFormError('Name and role are required.'); return; }
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
    if (!window.confirm('Remove this staff member?')) return;
    try { await remove(id); } catch { alert('Delete failed.'); }
  };

  const getRoleColor = (role) => ROLE_COLORS[role] || 'bg-slate-50 text-slate-600';

  return (
    <PageLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Staff Management</h1>
            <p className="text-slate-500 text-sm">{data.length} staff members</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all active:scale-95">
          <Plus className="w-4 h-4" /> Add Staff
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /> Loading staff...</div>
        ) : error ? (
          <div className="py-10 text-center text-red-500">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100">
                  {['Name', 'Role', 'Phone', 'Shift', 'Salary', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan="7" className="py-12 text-center text-slate-400 text-sm">No staff members found.</td></tr>
                ) : filtered.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                          {s.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-slate-800">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getRoleColor(s.role)}`}>{s.role}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{s.phone || '—'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 capitalize">{s.shift || '—'}</td>
                    <td className="px-6 py-4 text-sm text-slate-700 font-medium">{s.salary ? `₹${parseFloat(s.salary).toLocaleString()}` : '—'}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(s.created_at).toLocaleDateString('en-IN')}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(s)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(s.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Staff Member' : 'Add Staff Member'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name *</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="Ramesh Kumar" required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Role *</label>
            <input type="text" list="roles-list" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="Security / Cleaner / Gardener..." required />
            <datalist id="roles-list">
              {['Security', 'Cleaner', 'Gardener', 'Plumber', 'Electrician', 'Manager'].map(r => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone</label>
            <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="9876543210" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Salary (₹)</label>
              <input type="number" step="0.01" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="12000" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Shift</label>
              <select value={form.shift} onChange={e => setForm({ ...form, shift: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                <option value="">Select</option>
                <option value="morning">Morning</option>
                <option value="evening">Evening</option>
                <option value="night">Night</option>
                <option value="full-day">Full Day</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-70 transition-all flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editItem ? 'Update' : 'Add Staff'}
            </button>
          </div>
        </form>
      </Modal>
    </PageLayout>
  );
}
