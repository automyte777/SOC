import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Megaphone, Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  X, Upload, Link, Phone, Calendar, Building2, CheckCircle2,
  XCircle, ImageOff, Loader2, AlertCircle, Eye, ExternalLink,
  IndianRupee, User, CreditCard, Clock,
} from 'lucide-react';

/* ── Utility: file → base64 ────────────────────────────────────────────── */
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result); // "data:<mime>;base64,..."
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/* ── Reusable form field ────────────────────────────────────────────────── */
const Field = ({ label, required, children }) => (
  <div className="ad-field">
    <label className="ad-label">
      {label}{required && <span className="ad-required">*</span>}
    </label>
    {children}
  </div>
);

/* ══════════════════════════════════════════════════════════════════════════
   AD FORM MODAL
══════════════════════════════════════════════════════════════════════════ */
function AdFormModal({ ad, societies, secret, onClose, onSaved }) {
  const isEdit = !!ad;
  const fileRef = useRef();

  const [form, setForm] = useState({
    title:          ad?.title          || '',
    description:    ad?.description    || '',
    cta_link:       ad?.cta_link       || '',
    phone_number:   ad?.phone_number   || '',
    start_date:     ad?.start_date     ? ad.start_date.split('T')[0] : '',
    end_date:       ad?.end_date       ? ad.end_date.split('T')[0]   : '',
    is_active:      ad?.is_active !== undefined ? Boolean(ad.is_active) : true,
    society_ids:    (() => {
      try { return typeof ad?.society_ids === 'string'
        ? JSON.parse(ad.society_ids) : (ad?.society_ids || []); }
      catch { return []; }
    })(),
    // Monetization
    client_name:    ad?.client_name    || '',
    client_contact: ad?.client_contact || '',
    price:          ad?.price          != null ? String(ad.price) : '0',
    payment_status: ad?.payment_status || 'pending',
    payment_method: ad?.payment_method || 'manual',
  });

  const [imagePreview, setImagePreview] = useState(ad?.image_url || null);
  const [imageBase64,  setImageBase64]  = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    const b64 = await fileToBase64(file);
    setImagePreview(b64);
    setImageBase64(b64);
    setError('');
  };

  const toggleSociety = (id) => {
    const sid = String(id);
    set('society_ids', form.society_ids.includes(sid)
      ? form.society_ids.filter(s => s !== sid)
      : [...form.society_ids, sid]
    );
  };

  const toggleAll = () => {
    const hasAll = form.society_ids.includes('all');
    set('society_ids', hasAll ? [] : ['all']);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim())       return setError('Title is required.');
    if (!form.description.trim()) return setError('Description is required.');
    if (!form.start_date)         return setError('Start date is required.');
    if (!form.end_date)           return setError('End date is required.');
    if (form.start_date > form.end_date) return setError('End date must be after start date.');
    if (!form.society_ids.length) return setError('Select at least one society.');

    setSaving(true);
    try {
      const payload = { ...form };
      if (imageBase64) payload.image_base64 = imageBase64;
      // Keep existing URL if no new image uploaded
      if (!imageBase64 && imagePreview && imagePreview.startsWith('http')) {
        payload.image_url = imagePreview;
      }

      const hdrs = { headers: { 'x-master-secret': secret } };
      if (isEdit) {
        await axios.put(`/api/master/ads/${ad.id}`, payload, hdrs);
      } else {
        await axios.post('/api/master/ads', payload, hdrs);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed. Check console.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ad-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ad-modal">
        {/* Header */}
        <div className="ad-modal-header">
          <div className="ad-modal-title">
            <Megaphone className="w-5 h-5 text-purple-400" />
            <span>{isEdit ? 'Edit Advertisement' : 'Create New Advertisement'}</span>
          </div>
          <button onClick={onClose} className="ad-modal-close"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="ad-modal-body">
          <div className="ad-form-grid">
            {/* Left Column */}
            <div className="ad-form-left">
              <Field label="Ad Title" required>
                <input className="ad-input" value={form.title}
                  onChange={e => set('title', e.target.value)}
                  placeholder="e.g. New Restaurant Opening" />
              </Field>

              <Field label="Description" required>
                <textarea className="ad-input ad-textarea" value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Describe the advertisement..." rows={4} />
              </Field>

              <div className="ad-row-2">
                <Field label="CTA Link (optional)">
                  <div className="ad-input-icon">
                    <Link className="ad-icon" />
                    <input className="ad-input ad-input-pl" value={form.cta_link}
                      onChange={e => set('cta_link', e.target.value)}
                      placeholder="https://..." />
                  </div>
                </Field>
                <Field label="Phone Number (optional)">
                  <div className="ad-input-icon">
                    <Phone className="ad-icon" />
                    <input className="ad-input ad-input-pl" value={form.phone_number}
                      onChange={e => set('phone_number', e.target.value)}
                      placeholder="+91 98XXX XXXXX" />
                  </div>
                </Field>
              </div>

              <div className="ad-row-2">
                <Field label="Start Date" required>
                  <div className="ad-input-icon">
                    <Calendar className="ad-icon" />
                    <input type="date" className="ad-input ad-input-pl" value={form.start_date}
                      onChange={e => set('start_date', e.target.value)} />
                  </div>
                </Field>
                <Field label="End Date" required>
                  <div className="ad-input-icon">
                    <Calendar className="ad-icon" />
                    <input type="date" className="ad-input ad-input-pl" value={form.end_date}
                      onChange={e => set('end_date', e.target.value)} />
                  </div>
                </Field>
              </div>

              <Field label="Status">
                <button type="button" onClick={() => set('is_active', !form.is_active)}
                  className={`ad-toggle ${form.is_active ? 'ad-toggle-on' : 'ad-toggle-off'}`}>
                  {form.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  {form.is_active ? 'Active' : 'Inactive'}
                </button>
              </Field>

              {/* ── Monetization Section ───────────────────────────── */}
              <div className="ad-mono-divider">💰 Client & Payment Info</div>

              <div className="ad-row-2">
                <Field label="Client Name">
                  <div className="ad-input-icon">
                    <User className="ad-icon" />
                    <input className="ad-input ad-input-pl" value={form.client_name}
                      onChange={e => set('client_name', e.target.value)}
                      placeholder="e.g. Ramesh Sharma" />
                  </div>
                </Field>
                <Field label="Contact Number">
                  <div className="ad-input-icon">
                    <Phone className="ad-icon" />
                    <input className="ad-input ad-input-pl" value={form.client_contact}
                      onChange={e => set('client_contact', e.target.value)}
                      placeholder="+91 98XXX XXXXX" />
                  </div>
                </Field>
              </div>

              <div className="ad-row-2">
                <Field label="Price (₹)">
                  <div className="ad-input-icon">
                    <IndianRupee className="ad-icon" />
                    <input type="number" min="0" step="0.01" className="ad-input ad-input-pl"
                      value={form.price}
                      onChange={e => set('price', e.target.value)}
                      placeholder="0.00" />
                  </div>
                </Field>
                <Field label="Payment Status">
                  <select className="ad-input" value={form.payment_status}
                    onChange={e => set('payment_status', e.target.value)}>
                    <option value="pending">⏳ Pending</option>
                    <option value="paid">✅ Paid</option>
                  </select>
                </Field>
              </div>

              <Field label="Payment Method">
                <select className="ad-input" value={form.payment_method}
                  onChange={e => set('payment_method', e.target.value)}>
                  <option value="manual">🖊 Manual / Cash</option>
                  <option value="upi">📱 UPI</option>
                  <option value="bank_transfer">🏦 Bank Transfer</option>
                  <option value="razorpay" disabled>💳 Razorpay (coming soon)</option>
                </select>
              </Field>
            </div>

            {/* Right Column */}
            <div className="ad-form-right">
              <Field label="Ad Image">
                <div className="ad-image-upload" onClick={() => fileRef.current?.click()}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="preview" className="ad-image-preview" />
                  ) : (
                    <div className="ad-image-placeholder">
                      <Upload className="w-8 h-8 text-slate-500 mb-2" />
                      <p className="text-sm text-slate-500 font-medium">Click to upload image</p>
                      <p className="text-xs text-slate-600 mt-1">PNG, JPG, WebP — auto-compressed if &gt;3 MB</p>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                {imagePreview && (
                  <button type="button" onClick={() => { setImagePreview(null); setImageBase64(null); }}
                    className="ad-remove-image">
                    <X className="w-3.5 h-3.5" /> Remove image
                  </button>
                )}
              </Field>

              <Field label="Target Societies" required>
                <div className="ad-societies">
                  <button type="button"
                    onClick={toggleAll}
                    className={`ad-society-chip ${form.society_ids.includes('all') ? 'ad-chip-on' : 'ad-chip-off'}`}>
                    <Building2 className="w-3.5 h-3.5" /> All Societies
                  </button>
                  {!form.society_ids.includes('all') && societies.map(s => {
                    const sid = String(s.id);
                    const selected = form.society_ids.includes(sid);
                    return (
                      <button key={s.id} type="button" onClick={() => toggleSociety(sid)}
                        className={`ad-society-chip ${selected ? 'ad-chip-on' : 'ad-chip-off'}`}>
                        {selected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>
          </div>

          {error && (
            <div className="ad-error">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </form>

        <div className="ad-modal-footer">
          <button type="button" onClick={onClose} className="ad-btn-cancel">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="ad-btn-save">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : isEdit ? 'Save Changes' : 'Create Ad'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   AD CARD
══════════════════════════════════════════════════════════════════════════ */
function AdCard({ ad, onEdit, onDelete, onToggle, onTogglePayment, payLoading, societies }) {
  const isActive = Boolean(ad.is_active);
  const today = new Date().toISOString().split('T')[0];
  const isLive  = isActive && ad.start_date?.split('T')[0] <= today && ad.end_date?.split('T')[0] >= today;

  const societyIds = (() => {
    try { return typeof ad.society_ids === 'string' ? JSON.parse(ad.society_ids) : (ad.society_ids || []); }
    catch { return []; }
  })();

  const societyLabel = societyIds.includes('all')
    ? 'All Societies'
    : societyIds.map(id => {
        const s = societies.find(x => String(x.id) === String(id));
        return s ? s.name : `#${id}`;
      }).join(', ') || '—';

  const price = parseFloat(ad.price) || 0;

  return (
    <div className={`ad-card ${isLive ? 'ad-card-live' : ''}`}>
      {/* Image */}
      <div className="ad-card-img-wrap">
        {ad.image_url ? (
          <img src={ad.image_url} alt={ad.title} className="ad-card-img" />
        ) : (
          <div className="ad-card-no-img"><ImageOff className="w-6 h-6 text-slate-600" /></div>
        )}
        <div className={`ad-card-badge ${isLive ? 'ad-badge-live' : isActive ? 'ad-badge-scheduled' : 'ad-badge-off'}`}>
          {isLive ? '🟢 Live' : isActive ? '🕐 Scheduled' : '🔴 Off'}
        </div>
        {/* Payment badge overlay */}
        <div className={`ad-pay-badge-overlay ${ad.payment_status === 'paid' ? 'ad-pay-paid' : 'ad-pay-pending'}`}>
          {ad.payment_status === 'paid' ? <><CheckCircle2 className="w-3 h-3" /> Paid</> : <><Clock className="w-3 h-3" /> Pending</>}
        </div>
      </div>

      {/* Body */}
      <div className="ad-card-body">
        <h3 className="ad-card-title">{ad.title}</h3>
        <p className="ad-card-desc">{ad.description}</p>

        <div className="ad-card-meta">
          <span className="ad-meta-item">
            <Calendar className="w-3.5 h-3.5" />
            {ad.start_date?.split('T')[0]} → {ad.end_date?.split('T')[0]}
          </span>
          <span className="ad-meta-item">
            <Building2 className="w-3.5 h-3.5" />
            <span className="truncate max-w-[140px]" title={societyLabel}>{societyLabel}</span>
          </span>
          {ad.client_name && (
            <span className="ad-meta-item">
              <User className="w-3.5 h-3.5" /> {ad.client_name}
            </span>
          )}
          {price > 0 && (
            <span className="ad-meta-item ad-meta-price">
              ₹{price.toLocaleString('en-IN')}
            </span>
          )}
        </div>

        {(ad.cta_link || ad.phone_number) && (
          <div className="ad-card-links">
            {ad.cta_link && (
              <a href={ad.cta_link} target="_blank" rel="noopener noreferrer" className="ad-link-btn">
                <ExternalLink className="w-3 h-3" /> Visit Link
              </a>
            )}
            {ad.phone_number && (
              <span className="ad-link-btn ad-link-phone">
                <Phone className="w-3 h-3" /> {ad.phone_number}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="ad-card-footer">
        <button onClick={() => onToggle(ad)} title="Toggle Active"
          className={`ad-action-btn ${ad.is_active ? 'ad-toggle-btn-on' : 'ad-toggle-btn-off'}`}>
          {ad.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
          {ad.is_active ? 'Active' : 'Inactive'}
        </button>
        <div className="ad-action-right">
          {/* Quick pay toggle */}
          <button
            onClick={() => onTogglePayment(ad)}
            title={ad.payment_status === 'paid' ? 'Mark as Pending' : 'Mark as Paid'}
            disabled={payLoading === ad.id}
            className={`ad-pay-quick-btn ${ad.payment_status === 'paid' ? 'ad-pay-quick-paid' : 'ad-pay-quick-pending'}`}
          >
            {payLoading === ad.id
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : ad.payment_status === 'paid'
                ? <><CheckCircle2 className="w-3 h-3" /> Paid</>
                : <><Clock className="w-3 h-3" /> Pending</>
            }
          </button>
          <button onClick={() => onEdit(ad)} title="Edit" className="ad-icon-btn ad-edit-btn">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(ad)} title="Delete" className="ad-icon-btn ad-del-btn">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN AdsManagement COMPONENT
══════════════════════════════════════════════════════════════════════════ */
export default function AdsManagement({ secret }) {
  const [ads,        setAds]        = useState([]);
  const [societies,  setSocieties]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [showForm,   setShowForm]   = useState(false);
  const [editAd,     setEditAd]     = useState(null);
  const [filter,     setFilter]     = useState('all');
  const [payLoading, setPayLoading] = useState(null);

  const hdrs = { headers: { 'x-master-secret': secret } };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [adsRes, socRes] = await Promise.all([
        axios.get('/api/master/ads', hdrs),
        axios.get('/api/master/societies/all', hdrs),
      ]);
      setAds(adsRes.data.ads || []);
      setSocieties(socRes.data.societies || []);
    } catch (err) {
      setError('Failed to load ads. ' + (err.response?.data?.message || ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (ad) => {
    if (!window.confirm(`Delete ad "${ad.title}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`/api/master/ads/${ad.id}`, hdrs);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed.');
    }
  };

  const handleToggle = async (ad) => {
    try {
      await axios.patch(`/api/master/ads/${ad.id}/toggle`, {}, hdrs);
      fetchData();
    } catch (err) {
      alert('Toggle failed.');
    }
  };

  const handleEdit = (ad) => { setEditAd(ad); setShowForm(true); };
  const handleNew  = ()   => { setEditAd(null); setShowForm(true); };

  const handleSaved = () => { setShowForm(false); setEditAd(null); fetchData(); };

  const handleTogglePayment = async (ad) => {
    const newStatus = ad.payment_status === 'paid' ? 'pending' : 'paid';
    if (!window.confirm(`Mark "${ad.title}" as ${newStatus}?`)) return;
    setPayLoading(ad.id);
    try {
      await axios.patch(`/api/master/ads/${ad.id}/payment`, { payment_status: newStatus }, hdrs);
      fetchData();
    } catch (e) {
      alert(e.response?.data?.message || 'Payment update failed.');
    } finally {
      setPayLoading(null);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const filteredAds = ads.filter(ad => {
    if (filter === 'active')   return Boolean(ad.is_active);
    if (filter === 'inactive') return !Boolean(ad.is_active);
    if (filter === 'live')     return Boolean(ad.is_active) && ad.start_date?.split('T')[0] <= today && ad.end_date?.split('T')[0] >= today;
    if (filter === 'paid')     return ad.payment_status === 'paid';
    if (filter === 'pending')  return ad.payment_status === 'pending';
    return true;
  });

  const stats = {
    total:    ads.length,
    active:   ads.filter(a => a.is_active).length,
    inactive: ads.filter(a => !a.is_active).length,
    live:     ads.filter(a => a.is_active && a.start_date?.split('T')[0] <= today && a.end_date?.split('T')[0] >= today).length,
    paid:     ads.filter(a => a.payment_status === 'paid').length,
    pending:  ads.filter(a => a.payment_status === 'pending').length,
  };

  return (
    <>
      <style>{ADS_STYLES}</style>

      <div className="ads-root">
        {/* Header */}
        <div className="ads-header">
          <div>
            <h2 className="ads-title"><Megaphone className="w-6 h-6 text-purple-500" /> Ads Management</h2>
            <p className="ads-subtitle">Create and manage advertisements shown across society dashboards.</p>
          </div>
          <button onClick={handleNew} className="ads-new-btn">
            <Plus className="w-4 h-4" /> New Advertisement
          </button>
        </div>

        {/* Stats Row */}
        <div className="ads-stats">
          {[
            { label: 'Total Ads',  val: stats.total,    color: 'text-slate-700',  bg: 'bg-slate-100' },
            { label: 'Active',     val: stats.active,   color: 'text-purple-700', bg: 'bg-purple-50' },
            { label: 'Live Now',   val: stats.live,     color: 'text-emerald-700',bg: 'bg-emerald-50'},
            { label: 'Inactive',   val: stats.inactive, color: 'text-rose-700',   bg: 'bg-rose-50'   },
            { label: 'Paid',       val: stats.paid,     color: 'text-emerald-700',bg: 'bg-emerald-50'},
            { label: 'Pending',    val: stats.pending,  color: 'text-amber-700',  bg: 'bg-amber-50'  },
          ].map((s, i) => (
            <div key={i} className={`ads-stat-card ${s.bg}`}>
              <p className="ads-stat-label">{s.label}</p>
              <p className={`ads-stat-val ${s.color}`}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="ads-filters">
          {['all','active','live','inactive','paid','pending'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`ads-filter-tab ${filter === f ? 'ads-filter-active' : 'ads-filter-idle'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="ads-filter-count">
                {stats[f] ?? stats.total}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="ads-loading">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            <span>Loading advertisements...</span>
          </div>
        ) : error ? (
          <div className="ads-error-box">
            <AlertCircle className="w-5 h-5" /> {error}
          </div>
        ) : filteredAds.length === 0 ? (
          <div className="ads-empty">
            <Megaphone className="w-12 h-12 text-slate-600 mb-3" />
            <p className="text-slate-400 font-semibold">No advertisements found</p>
            <p className="text-slate-500 text-sm mt-1">
              {filter !== 'all' ? `No ${filter} ads.` : 'Create your first ad to get started.'}
            </p>
            {filter === 'all' && (
              <button onClick={handleNew} className="ads-empty-cta">
                <Plus className="w-4 h-4" /> Create First Ad
              </button>
            )}
          </div>
        ) : (
          <div className="ads-grid">
            {filteredAds.map(ad => (
              <AdCard key={ad.id} ad={ad} societies={societies}
                onEdit={handleEdit} onDelete={handleDelete} onToggle={handleToggle}
                onTogglePayment={handleTogglePayment} payLoading={payLoading} />
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <AdFormModal
          ad={editAd}
          societies={societies}
          secret={secret}
          onClose={() => { setShowForm(false); setEditAd(null); }}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   INLINE STYLES  (scoped via class prefix "ad-" / "ads-")
══════════════════════════════════════════════════════════════════════════ */
const ADS_STYLES = `
/* Root */
.ads-root { display:flex; flex-direction:column; gap:1.5rem; }

/* Header */
.ads-header { display:flex; flex-wrap:wrap; align-items:flex-start; justify-content:space-between; gap:1rem; }
.ads-title  { display:flex; align-items:center; gap:.5rem; font-size:1.5rem; font-weight:900; color:#1e293b; margin:0; }
.ads-subtitle { font-size:.875rem; color:#64748b; margin-top:.25rem; }
.ads-new-btn {
  display:flex; align-items:center; gap:.5rem;
  background:linear-gradient(135deg,#7c3aed,#6d28d9); color:#fff;
  border:none; border-radius:.75rem; padding:.6rem 1.1rem;
  font-weight:700; font-size:.875rem; cursor:pointer;
  box-shadow:0 4px 15px rgba(109,40,217,.3); transition:all .2s;
}
.ads-new-btn:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(109,40,217,.4); }

/* Stats */
.ads-stats { display:grid; grid-template-columns:repeat(6,1fr); gap:.75rem; }
@media(max-width:900px){ .ads-stats { grid-template-columns:repeat(3,1fr); } }
@media(max-width:540px){ .ads-stats { grid-template-columns:repeat(2,1fr); } }
.ads-stat-card { border-radius:1rem; padding:1rem 1.25rem; }
.ads-stat-label { font-size:.75rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:#64748b; }
.ads-stat-val   { font-size:1.75rem; font-weight:900; margin-top:.2rem; }

/* Filters */
.ads-filters { display:flex; gap:.5rem; flex-wrap:wrap; }
.ads-filter-tab {
  display:flex; align-items:center; gap:.4rem;
  border:none; border-radius:.625rem; padding:.45rem .9rem;
  font-size:.8rem; font-weight:700; cursor:pointer; transition:all .15s;
}
.ads-filter-active { background:#7c3aed; color:#fff; }
.ads-filter-idle   { background:#f1f5f9; color:#64748b; }
.ads-filter-idle:hover { background:#e2e8f0; }
.ads-filter-count {
  background:rgba(255,255,255,.25); border-radius:9999px;
  padding:.05rem .45rem; font-size:.7rem;
}
.ads-filter-idle .ads-filter-count { background:#e2e8f0; color:#475569; }

/* Loading / Error / Empty */
.ads-loading  { display:flex; align-items:center; gap:.75rem; color:#94a3b8; padding:3rem; justify-content:center; font-weight:600; }
.ads-error-box { display:flex; align-items:center; gap:.5rem; background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; border-radius:.75rem; padding:1rem 1.25rem; font-weight:600; }
.ads-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:4rem 2rem; background:#fff; border:2px dashed #e2e8f0; border-radius:1.25rem; text-align:center; }
.ads-empty-cta {
  margin-top:1rem; display:flex; align-items:center; gap:.4rem;
  background:#7c3aed; color:#fff; border:none; border-radius:.75rem;
  padding:.55rem 1.1rem; font-weight:700; font-size:.875rem; cursor:pointer;
}

/* Grid */
.ads-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:1.25rem; }

/* Card */
.ad-card { background:#fff; border-radius:1.125rem; border:1px solid #e2e8f0; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 1px 3px rgba(0,0,0,.04); transition:all .2s; }
.ad-card:hover { box-shadow:0 8px 24px rgba(0,0,0,.08); transform:translateY(-2px); }
.ad-card-live { border-color:#a78bfa; box-shadow:0 0 0 1px #a78bfa; }
.ad-card-img-wrap { position:relative; height:160px; background:#f8fafc; overflow:hidden; }
.ad-card-img { width:100%; height:100%; object-fit:cover; }
.ad-card-no-img { height:100%; display:flex; align-items:center; justify-content:center; }
.ad-card-badge {
  position:absolute; top:.6rem; right:.6rem;
  font-size:.65rem; font-weight:800; text-transform:uppercase; letter-spacing:.04em;
  padding:.2rem .6rem; border-radius:9999px;
}
.ad-badge-live      { background:#d1fae5; color:#065f46; }
.ad-badge-scheduled { background:#dbeafe; color:#1e40af; }
.ad-badge-off       { background:#fee2e2; color:#991b1b; }
.ad-card-body  { flex:1; padding:1rem 1.1rem; display:flex; flex-direction:column; gap:.5rem; }
.ad-card-title { font-size:1rem; font-weight:800; color:#1e293b; margin:0; line-clamp:1; display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden; }
.ad-card-desc  { font-size:.8125rem; color:#64748b; line-height:1.5; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; margin:0; }
.ad-card-meta  { display:flex; flex-direction:column; gap:.3rem; margin-top:.25rem; }
.ad-meta-item  { display:flex; align-items:center; gap:.3rem; font-size:.75rem; color:#94a3b8; font-weight:600; }
.ad-card-links { display:flex; flex-wrap:wrap; gap:.4rem; margin-top:.3rem; }
.ad-link-btn   { display:flex; align-items:center; gap:.25rem; font-size:.7rem; font-weight:700; padding:.2rem .6rem; border-radius:9999px; text-decoration:none; background:#f1f5f9; color:#475569; }
.ad-link-phone { background:#f0fdf4; color:#166534; }
.ad-card-footer { border-top:1px solid #f1f5f9; padding:.75rem 1.1rem; display:flex; align-items:center; justify-content:space-between; }
.ad-action-btn { display:flex; align-items:center; gap:.35rem; border:none; border-radius:.5rem; padding:.3rem .7rem; font-size:.75rem; font-weight:700; cursor:pointer; transition:all .15s; }
.ad-toggle-btn-on  { background:#f3e8ff; color:#7c3aed; }
.ad-toggle-btn-off { background:#f1f5f9; color:#64748b; }
.ad-action-right   { display:flex; gap:.4rem; }
.ad-icon-btn { border:none; border-radius:.5rem; padding:.4rem; cursor:pointer; transition:all .15s; display:flex; align-items:center; }
.ad-edit-btn { background:#eff6ff; color:#2563eb; }
.ad-edit-btn:hover { background:#dbeafe; }
.ad-del-btn  { background:#fff1f2; color:#e11d48; }
.ad-del-btn:hover  { background:#ffe4e6; }

/* Payment badge overlay on card image */
.ad-pay-badge-overlay {
  position:absolute; bottom:.6rem; left:.6rem;
  display:flex; align-items:center; gap:.2rem;
  font-size:.6rem; font-weight:800; text-transform:uppercase; letter-spacing:.04em;
  padding:.2rem .55rem; border-radius:9999px;
}
.ad-pay-paid    { background:#dcfce7; color:#166534; }
.ad-pay-pending { background:#fef3c7; color:#92400e; }

/* Price meta pill */
.ad-meta-price { background:#f5f3ff; color:#7c3aed; border-radius:9999px; padding:.1rem .55rem; font-size:.72rem; font-weight:800; }

/* Quick pay button in card footer */
.ad-pay-quick-btn { display:flex; align-items:center; gap:.25rem; border:none; border-radius:.5rem; padding:.3rem .6rem; font-size:.7rem; font-weight:800; cursor:pointer; transition:all .15s; }
.ad-pay-quick-paid    { background:#dcfce7; color:#166534; }
.ad-pay-quick-paid:hover  { background:#bbf7d0; }
.ad-pay-quick-pending { background:#fef3c7; color:#92400e; }
.ad-pay-quick-pending:hover { background:#fde68a; }
.ad-pay-quick-btn:disabled { opacity:.5; cursor:not-allowed; }

/* Monetization section divider in form */
.ad-mono-divider {
  font-size:.72rem; font-weight:800; text-transform:uppercase; letter-spacing:.06em;
  color:#7c3aed; background:#faf5ff; border:1px solid #ede9fe;
  border-radius:.625rem; padding:.4rem .85rem; display:flex; align-items:center; gap:.3rem;
  margin-top:.25rem;
}

/* ── OVERLAY & MODAL ────────────────────────── */
.ad-overlay { position:fixed; inset:0; background:rgba(0,0,0,.55); backdrop-filter:blur(4px); z-index:1000; display:flex; align-items:center; justify-content:center; padding:1rem; }
.ad-modal   { background:#fff; border-radius:1.5rem; width:100%; max-width:860px; max-height:90vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 25px 60px rgba(0,0,0,.25); }
.ad-modal-header { padding:1.25rem 1.5rem; border-bottom:1px solid #f1f5f9; display:flex; align-items:center; justify-content:space-between; shrink:0; background:#faf5ff; }
.ad-modal-title  { display:flex; align-items:center; gap:.5rem; font-size:1rem; font-weight:800; color:#1e293b; }
.ad-modal-close  { border:none; background:#f1f5f9; color:#64748b; border-radius:.5rem; padding:.35rem; cursor:pointer; display:flex; }
.ad-modal-close:hover { background:#e2e8f0; color:#1e293b; }
.ad-modal-body   { flex:1; overflow-y:auto; padding:1.5rem; }
.ad-modal-footer { padding:1rem 1.5rem; border-top:1px solid #f1f5f9; display:flex; justify-content:flex-end; gap:.75rem; background:#fafafa; shrink:0; }
.ad-btn-cancel { border:1px solid #e2e8f0; background:#fff; color:#64748b; border-radius:.75rem; padding:.55rem 1.25rem; font-weight:700; font-size:.875rem; cursor:pointer; }
.ad-btn-cancel:hover { background:#f8fafc; }
.ad-btn-save {
  display:flex; align-items:center; gap:.4rem;
  background:linear-gradient(135deg,#7c3aed,#6d28d9); color:#fff;
  border:none; border-radius:.75rem; padding:.55rem 1.5rem;
  font-weight:700; font-size:.875rem; cursor:pointer;
  box-shadow:0 4px 15px rgba(109,40,217,.3); transition:all .2s;
}
.ad-btn-save:disabled { opacity:.6; cursor:not-allowed; }

/* Form grid */
.ad-form-grid  { display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; }
@media(max-width:600px){ .ad-form-grid { grid-template-columns:1fr; } }
.ad-form-left  { display:flex; flex-direction:column; gap:1rem; }
.ad-form-right { display:flex; flex-direction:column; gap:1rem; }
.ad-row-2      { display:grid; grid-template-columns:1fr 1fr; gap:.75rem; }

/* Fields */
.ad-field   { display:flex; flex-direction:column; gap:.4rem; }
.ad-label   { font-size:.8rem; font-weight:700; color:#374151; text-transform:uppercase; letter-spacing:.04em; }
.ad-required { color:#e11d48; margin-left:.2rem; }
.ad-input   { width:100%; background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:.75rem; padding:.6rem .85rem; font-size:.875rem; color:#1e293b; outline:none; transition:border .15s; box-sizing:border-box; font-family:inherit; }
.ad-input:focus { border-color:#7c3aed; background:#fff; }
.ad-textarea  { resize:vertical; min-height:100px; }
.ad-input-icon { position:relative; }
.ad-icon    { position:absolute; left:.75rem; top:50%; transform:translateY(-50%); width:1rem; height:1rem; color:#94a3b8; pointer-events:none; }
.ad-input-pl { padding-left:2.25rem; }

/* Toggle */
.ad-toggle { display:flex; align-items:center; gap:.5rem; border:none; border-radius:.75rem; padding:.5rem .9rem; font-size:.875rem; font-weight:700; cursor:pointer; transition:all .2s; width:fit-content; }
.ad-toggle-on  { background:#f3e8ff; color:#7c3aed; }
.ad-toggle-off { background:#f1f5f9; color:#64748b; }

/* Image upload */
.ad-image-upload { border:2px dashed #e2e8f0; border-radius:.875rem; overflow:hidden; cursor:pointer; min-height:150px; display:flex; align-items:center; justify-content:center; transition:border .15s; background:#f8fafc; }
.ad-image-upload:hover { border-color:#a78bfa; background:#faf5ff; }
.ad-image-preview { width:100%; height:150px; object-fit:cover; }
.ad-image-placeholder { display:flex; flex-direction:column; align-items:center; padding:1.5rem; }
.ad-remove-image { display:flex; align-items:center; gap:.25rem; margin-top:.5rem; color:#e11d48; font-size:.75rem; font-weight:700; background:none; border:none; cursor:pointer; padding:0; }

/* Societies multi-select */
.ad-societies { display:flex; flex-wrap:wrap; gap:.4rem; background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:.75rem; padding:.75rem; min-height:80px; }
.ad-society-chip { display:flex; align-items:center; gap:.3rem; padding:.3rem .65rem; border-radius:9999px; font-size:.75rem; font-weight:700; border:none; cursor:pointer; transition:all .15s; }
.ad-chip-on  { background:#7c3aed; color:#fff; }
.ad-chip-off { background:#fff; color:#64748b; border:1px solid #e2e8f0; }
.ad-chip-off:hover { border-color:#7c3aed; color:#7c3aed; }

/* Error */
.ad-error { display:flex; align-items:center; gap:.5rem; background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; border-radius:.75rem; padding:.75rem 1rem; font-size:.875rem; font-weight:600; margin-top:.75rem; }

.hidden { display:none; }
`;
