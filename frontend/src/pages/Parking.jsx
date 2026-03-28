import React, { useState } from 'react';
import { Car, Plus, Pencil, Trash2, Search, Loader2 } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import Modal from '../components/Modal';
import useAdminCrud from '../hooks/useAdminCrud';
import { getUser } from '../utils/auth';

const EMPTY_FORM = { vehicle_name: '', vehicle_number: '', vehicle_type: 'car' };

export default function Parking() {
  const user = getUser();
  const isAdmin = user?.role === 'society_secretary';
  const { data, loading, error, create, update, remove } = useAdminCrud(
    isAdmin ? '/api/admin/parking' : '/api/member/my-vehicles'
  );

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const filtered = Array.isArray(data) ? data.filter(v =>
    v.vehicle_number?.toLowerCase().includes(search.toLowerCase()) ||
    v.vehicle_name?.toLowerCase().includes(search.toLowerCase())
  ) : [];

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true); };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vehicle_number) { setFormError('Vehicle number is required.'); return; }
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
    if (!window.confirm('Remove this vehicle?')) return;
    try { await remove(id); } catch { alert('Delete failed.'); }
  };

  return (
    <PageLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-100">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Parking & Vehicles</h1>
            <p className="text-slate-500 text-sm">
                {isAdmin ? 'Manage society parking slots' : `Registered Vehicles: ${filtered.length}`}
            </p>
          </div>
        </div>
        {!isAdmin && (
            <button onClick={openAdd} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-slate-200 hover:scale-105 transition-all">
                <Plus className="w-4 h-4" /> Add Vehicle
            </button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by number..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /> Loading...</div>
      ) : error ? (
        <div className="py-10 text-center text-red-500">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-100">No vehicles registered.</div>
          ) : filtered.map(v => (
            <div key={v.id} className="bg-white rounded-2xl border border-slate-100 p-6 flex items-center justify-between group hover:shadow-xl hover:shadow-slate-100/50 transition-all border-l-4 border-l-slate-900">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center">
                  <Car className="w-6 h-6 text-slate-700" />
                </div>
                <div>
                   <h3 className="text-lg font-black text-slate-900 uppercase">{v.vehicle_number}</h3>
                   <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{v.vehicle_name || 'Generic'} • {v.vehicle_type}</p>
                </div>
              </div>
              {!isAdmin && (
                <button onClick={() => handleDelete(v.id)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Register Vehicle">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Vehicle Name (Make/Model)</label>
            <input type="text" value={form.vehicle_name} onChange={e => setForm({ ...form, vehicle_name: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm" placeholder="e.g. Honda City" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Vehicle Number *</label>
            <input type="text" value={form.vehicle_number} onChange={e => setForm({ ...form, vehicle_number: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm" placeholder="e.g. MH-12-AB-1234" required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Type</label>
            <select value={form.vehicle_type} onChange={e => setForm({ ...form, vehicle_type: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white">
              <option value="car">Car / SUV</option>
              <option value="bike">Bike / Two Wheeler</option>
              <option value="other">Other</option>
            </select>
          </div>
          <button type="submit" disabled={saving} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Register Vehicle
          </button>
        </form>
      </Modal>
    </PageLayout>
  );
}
