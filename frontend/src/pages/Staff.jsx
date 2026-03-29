import React, { useState } from 'react';
import {
  UserCheck, Plus, Pencil, Trash2, Search, Loader2,
  Key, Copy, CheckCheck, Eye, EyeOff, User, ShieldOff,
} from 'lucide-react';
import PageLayout from '../components/PageLayout';
import Modal from '../components/Modal';
import useAdminCrud from '../hooks/useAdminCrud';

const EMPTY_FORM = {
  name: '', phone: '', role: '', salary: '', shift: '',
  username: '', password: '',
};

const ROLE_COLORS = {
  Security:    'bg-red-50 text-red-700 border border-red-200',
  Cleaner:     'bg-blue-50 text-blue-700 border border-blue-200',
  Gardener:    'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Plumber:     'bg-orange-50 text-orange-700 border border-orange-200',
  Electrician: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  Manager:     'bg-purple-50 text-purple-700 border border-purple-200',
};

export default function Staff() {
  const { data, loading, error, create, update, remove } = useAdminCrud('/api/admin/staff');
  const [search, setSearch]       = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');
  const [showPw, setShowPw]       = useState(false);

  // Credentials card — shown after successful creation
  const [credsModal, setCredsModal]     = useState(false);
  const [newCreds,   setNewCreds]       = useState(null);
  const [copiedUser, setCopiedUser]     = useState(false);
  const [copiedPass, setCopiedPass]     = useState(false);

  const filtered = data.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.role?.toLowerCase().includes(search.toLowerCase()) ||
    s.phone?.includes(search) ||
    s.username?.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      name: item.name, phone: item.phone || '',
      role: item.role || item.staff_role || '',
      salary: item.salary || '', shift: item.shift || '',
      username: item.username || '', password: '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const copyToClipboard = async (text, type) => {
    await navigator.clipboard.writeText(text);
    if (type === 'user') { setCopiedUser(true); setTimeout(() => setCopiedUser(false), 2000); }
    else                 { setCopiedPass(true); setTimeout(() => setCopiedPass(false), 2000); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.role) { setFormError('Name and role are required.'); return; }
    setSaving(true); setFormError('');
    try {
      if (editItem) {
        await update(editItem.id, form);
        setModalOpen(false);
      } else {
        // Create staff — backend returns credentials
        const payload = { ...form };
        if (!payload.username) delete payload.username; // let backend auto-generate
        if (!payload.password) delete payload.password;

        const res = await create(payload);
        setModalOpen(false);

        // Show credentials modal if returned
        if (res?.credentials) {
          setNewCreds({ name: form.name, ...res.credentials });
          setCredsModal(true);
        }
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Save failed.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this staff member?')) return;
    try { await remove(id); } catch { alert('Delete failed.'); }
  };

  const getRoleColor = (role) => ROLE_COLORS[role] || 'bg-slate-50 text-slate-600 border border-slate-200';

  return (
    <PageLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Staff Management</h1>
            <p className="text-slate-500 text-sm">{data.length} staff members • Credentials auto-generated</p>
          </div>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all active:scale-95">
          <Plus className="w-4 h-4" /> Add Staff Member
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, role, username..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <Key className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <span className="font-bold">Auto Credentials: </span>
          When you add a staff member, a <strong>username</strong> (e.g. <code className="bg-blue-100 px-1 rounded">security_421</code>) and
          a <strong>temporary password</strong> (e.g. <code className="bg-blue-100 px-1 rounded">temp@563</code>) are generated automatically.
          Share these with the staff so they can log in at <strong>/staff/login</strong>.
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" /> Loading staff...
          </div>
        ) : error ? (
          <div className="py-10 text-center text-red-500">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100">
                  {['Name / Username', 'Role', 'Phone', 'Shift', 'Salary', 'Status', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan="8" className="py-12 text-center text-slate-400 text-sm">No staff members found.</td></tr>
                ) : filtered.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-700 font-bold text-xs flex-shrink-0">
                          {s.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-slate-800 block">{s.name}</span>
                          {s.username && (
                            <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                              <User className="w-3 h-3" /> {s.username}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getRoleColor(s.role || s.staff_role)}`}>
                        {s.role || s.staff_role || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">{s.phone || '—'}</td>
                    <td className="px-5 py-4 text-sm text-slate-600 capitalize">{s.shift || '—'}</td>
                    <td className="px-5 py-4 text-sm text-slate-700 font-medium">
                      {s.salary ? `₹${parseFloat(s.salary).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${s.is_active !== 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                        {s.is_active !== 0 ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500">
                      {s.created_at ? new Date(s.created_at).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(s)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(s.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => !saving && setModalOpen(false)}
        title={editItem ? 'Edit Staff Member' : 'Add Staff Member'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name *</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Ramesh Kumar" required />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Role *</label>
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white" required>
              <option value="">Select Role...</option>
              {['Security', 'Cleaner', 'Gardener', 'Plumber', 'Electrician', 'Manager'].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone</label>
            <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="9876543210" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Salary (₹)</label>
              <input type="number" step="0.01" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="12000" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Shift</label>
              <select value={form.shift} onChange={e => setForm({ ...form, shift: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                <option value="">Select</option>
                {['morning', 'evening', 'night', 'full-day'].map(s => (
                  <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Credential fields */}
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" /> Login Credentials (optional — leave blank to auto-generate)
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Username</label>
                <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  placeholder="Auto: security_421" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  {editItem ? 'Reset Password (leave blank to keep)' : 'Password'}
                </label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 pr-10 font-mono"
                    placeholder={editItem ? 'New password (optional)' : 'Auto: temp@421'} />
                  <button type="button" onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-70 transition-all flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editItem ? 'Update Staff' : 'Add & Generate Credentials'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Credentials Display Modal */}
      {credsModal && newCreds && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            {/* Green header */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Staff Credentials Created!</h3>
                  <p className="text-emerald-100 text-sm">Share these with {newCreds.name}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500 bg-amber-50 border border-amber-200 rounded-xl p-3">
                ⚠️ <strong>Save these credentials now.</strong> The password is shown only once. Staff can log in at <code className="bg-slate-100 px-1 rounded text-xs">/staff/login</code>
              </p>

              {/* Username */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Username</p>
                <div className="flex items-center gap-3">
                  <code className="font-mono text-slate-800 font-bold text-base flex-1">{newCreds.username}</code>
                  <button onClick={() => copyToClipboard(newCreds.username, 'user')}
                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                    {copiedUser ? <CheckCheck className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Temporary Password</p>
                <div className="flex items-center gap-3">
                  <code className="font-mono text-slate-800 font-bold text-base flex-1">{newCreds.password}</code>
                  <button onClick={() => copyToClipboard(newCreds.password, 'pass')}
                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                    {copiedPass ? <CheckCheck className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-400 text-center">Staff login URL: <strong>/staff/login</strong></p>

              <button onClick={() => setCredsModal(false)}
                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold rounded-xl hover:opacity-90 transition-all">
                Done — I've Saved the Credentials
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
