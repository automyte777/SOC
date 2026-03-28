import React, { useState } from 'react';
import { CreditCard, Plus, Pencil, Trash2, Search, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import Modal from '../components/Modal';
import useAdminCrud from '../hooks/useAdminCrud';
import { getUser } from '../utils/auth';

const EMPTY_FORM = { flat_id: '', amount: '', due_date: '', status: 'pending' };

export default function Maintenance() {
  const user = getUser();
  const isAdmin = user?.role === 'society_secretary';
  
  // 1. Fetch Maintenance Bills
  const { data: bills, loading, error, create, update, remove } = useAdminCrud(
    isAdmin ? '/api/admin/maintenance' : '/api/member/my-maintenance'
  );

  // 2. Fetch Flats (only for Admin to populate the selector)
  const { data: flatsData } = useAdminCrud(isAdmin ? '/api/admin/flats' : null);
  const flats = Array.isArray(flatsData) ? flatsData : [];

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const billList = Array.isArray(bills) ? bills : [];

  const filtered = billList.filter(b =>
    b.flat_number?.toLowerCase().includes(search.toLowerCase()) ||
    b.building?.toLowerCase().includes(search.toLowerCase()) ||
    String(b.amount).includes(search)
  );

  const totalCollected = billList.filter(b => b.status === 'paid').reduce((s, b) => s + parseFloat(b.amount || 0), 0);
  const totalPending = billList.filter(b => b.status === 'pending').reduce((s, b) => s + parseFloat(b.amount || 0), 0);

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({ 
      flat_id: item.flat_id || '', 
      amount: item.amount, 
      due_date: item.due_date ? item.due_date.split('T')[0] : '', 
      status: item.status 
    });
    setFormError(''); 
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.flat_id) { setFormError('Please select a flat.'); return; }
    if (!form.amount) { setFormError('Amount is required.'); return; }
    
    setSaving(true); 
    setFormError('');
    try {
      if (editItem) await update(editItem.id, form);
      else await create(form);
      setModalOpen(false);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save maintenance bill.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this bill?')) return;
    try { await remove(id); } catch { alert('Delete failed.'); }
  };

  return (
    <PageLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-100">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Maintenance</h1>
            <p className="text-slate-500 text-sm">{billList.length} total bills</p>
          </div>
        </div>
        {isAdmin && (
            <button onClick={openAdd} className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-orange-100 hover:shadow-orange-200 transition-all active:scale-95">
                <Plus className="w-4 h-4" /> Create Bill
            </button>
        )}
      </div>

      {/* Finance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Collected', value: `₹${totalCollected.toLocaleString()}`, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Pending Dues', value: `₹${totalPending.toLocaleString()}`, icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Total Bills', value: billList.length, icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">{s.label}</p>
              <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by flat or amount..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
      </div>

      {/* Bills Table */}
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
                  {['Flat', 'Building', 'Amount', 'Due Date', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan="6" className="py-12 text-center text-slate-400 text-sm">No bills found.</td></tr>
                ) : filtered.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-slate-800">{b.flat_number || '—'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{b.building || '—'}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-800">₹{parseFloat(b.amount).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{b.due_date ? new Date(b.due_date).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${b.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>{b.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      {isAdmin ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(b)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(b.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        b.status === 'pending' ? (
                          <button className="px-4 py-1.5 bg-slate-900 text-white text-[10px] font-black rounded-lg uppercase shadow-lg shadow-slate-200 hover:scale-105 active:scale-95 transition-all">Pay Now</button>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-black uppercase flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Settled</span>
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

      {/* Create/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Bill' : 'Create Maintenance Bill'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Select Flat *</label>
            <select 
                value={form.flat_id} 
                onChange={e => setForm({ ...form, flat_id: e.target.value })} 
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none bg-white focus:ring-2 focus:ring-blue-500/20"
                required
            >
                <option value="">-- Choose Flat --</option>
                {flats.map(f => (
                    <option key={f.id} value={f.id}>
                        Flat {f.flat_number} {f.building ? `(${f.building})` : ''}
                    </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Amount (₹) *</label>
            <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="e.g. 2500" required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Due Date</label>
            <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none bg-white focus:ring-2 focus:ring-blue-500/20">
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-70 transition-all flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editItem ? 'Update' : 'Create Bill'}
            </button>
          </div>
        </form>
      </Modal>
    </PageLayout>
  );
}
