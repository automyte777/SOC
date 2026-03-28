import React, { useState } from 'react';
import { Calendar, Plus, Pencil, Trash2, Search, Loader2, MapPin } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import Modal from '../components/Modal';
import useAdminCrud from '../hooks/useAdminCrud';
import { getUser } from '../utils/auth';

const EMPTY_FORM = { event_name: '', event_date: '', description: '', location: '' };

export default function Events() {
  const user = getUser();
  const isAdmin = user?.role === 'society_secretary';
  
  const { data, loading, error, create, update, remove } = useAdminCrud(
    isAdmin ? '/api/admin/events' : '/api/member/events'
  );

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const eventsList = Array.isArray(data) ? data : [];

  const filtered = eventsList.filter(e =>
    e.event_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.description?.toLowerCase().includes(search.toLowerCase()) ||
    e.location?.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true); };
  const openEdit = (item) => { 
    setEditItem(item); 
    setForm({ 
        event_name: item.event_name, 
        event_date: item.event_date ? item.event_date.split('T')[0] : '', 
        description: item.description || '', 
        location: item.location || '' 
    }); 
    setFormError(''); 
    setModalOpen(true); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.event_name || !form.event_date) { setFormError('Name and Date are required.'); return; }
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
    if (!window.confirm('Delete this event?')) return;
    try { await remove(id); } catch { alert('Delete failed.'); }
  };

  return (
    <PageLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-rose-100">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Events</h1>
            <p className="text-slate-500 text-sm">{eventsList.length} upcoming activities</p>
          </div>
        </div>
        {isAdmin && (
            <button onClick={openAdd} className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-rose-100 hover:shadow-rose-200 transition-all active:scale-95">
                <Plus className="w-4 h-4" /> Create Event
            </button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /> Loading events...</div>
      ) : error ? (
        <div className="py-10 text-center text-red-500">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-100">No events found.</div>
          ) : filtered.map(e => (
            <div key={e.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">
              <div className="h-2 bg-rose-500" />
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded-full w-fit mb-2">Event</span>
                      <h3 className="font-bold text-slate-900 text-lg leading-tight">{e.event_name}</h3>
                   </div>
                   {isAdmin && (
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(e)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(e.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                   )}
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>{new Date(e.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                  {e.location && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>{e.location}</span>
                    </div>
                  )}
                </div>

                {e.description && (
                  <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed mb-4">{e.description}</p>
                )}
                
                <button className="w-full py-2.5 bg-slate-50 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors">View Details</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Event' : 'Create New Event'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Event Name *</label>
            <input type="text" value={form.event_name} onChange={e => setForm({ ...form, event_name: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="e.g. Annual General Meeting" required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date *</label>
            <input type="date" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Location</label>
            <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="Society Club House" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
            <textarea rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" placeholder="Details about the event..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-70 transition-all flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editItem ? 'Update' : 'Create Event'}
            </button>
          </div>
        </form>
      </Modal>
    </PageLayout>
  );
}
