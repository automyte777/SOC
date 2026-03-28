import React, { useState } from 'react';
import { Megaphone, Plus, Pencil, Trash2, Search, Loader2 } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import Modal from '../components/Modal';
import useAdminCrud from '../hooks/useAdminCrud';
import { getUser } from '../utils/auth';

const EMPTY_FORM = { title: '', description: '' };

export default function Notices() {
  const user = getUser();
  const isAdmin = user?.role === 'society_secretary';
  
  const { data, loading, error, create, update, remove } = useAdminCrud(
    isAdmin ? '/api/admin/notices' : '/api/member/notices'
  );

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const noticeList = Array.isArray(data) ? data : [];

  const filtered = noticeList.filter(n =>
    n.title?.toLowerCase().includes(search.toLowerCase()) ||
    n.description?.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true); };
  const openEdit = (item) => { 
    setEditItem(item); 
    setForm({ title: item.title, description: item.description || '' }); 
    setFormError(''); 
    setModalOpen(true); 
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
    if (!window.confirm('Delete this notice?')) return;
    try { await remove(id); } catch { alert('Delete failed.'); }
  };

  return (
    <PageLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center text-white shadow-lg shadow-sky-100">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Notice Board</h1>
            <p className="text-slate-500 text-sm">{noticeList.length} notices published</p>
          </div>
        </div>
        {isAdmin && (
            <button onClick={openAdd} className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-cyan-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-sky-100 hover:shadow-sky-200 transition-all active:scale-95">
                <Plus className="w-4 h-4" /> Post Notice
            </button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notices..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /> Loading notices...</div>
      ) : error ? (
        <div className="py-10 text-center text-red-500">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-100">No notices found.</div>
          ) : filtered.map(n => (
            <div key={n.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center">
                      <Megaphone className="w-3.5 h-3.5 text-sky-600" />
                    </div>
                    <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">Notice</span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-base leading-snug">{n.title}</h3>
                </div>
                {isAdmin && (
                    <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(n)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(n.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                )}
              </div>
              {n.description && (
                <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">{n.description}</p>
              )}
              <p className="text-xs text-slate-400 mt-auto pt-2 border-t border-slate-50">
                {new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Notice' : 'Post New Notice'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notice Title *</label>
            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="Society Meeting scheduled for..." required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Content / Description</label>
            <textarea rows={5} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none" placeholder="Dear Residents, this is to inform you that..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-sky-500 to-cyan-600 text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-70 transition-all flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editItem ? 'Update Notice' : 'Publish Notice'}
            </button>
          </div>
        </form>
      </Modal>
    </PageLayout>
  );
}
