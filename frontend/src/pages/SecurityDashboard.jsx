import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Shield, LogOut, UserCheck, Search, ClipboardList, Ticket,
  Phone, Plus, Loader2, CheckCircle2, XCircle, Clock, ArrowRight,
  Building2, RefreshCw, Camera, Car, Filter, Calendar, AlertCircle,
  Bell, Users, DoorOpen, TimerOff, Package, Siren, FileText,
  QrCode, ChevronRight, Activity, Timer,
} from 'lucide-react';
import QRScanner from '../components/QRScanner';

const authH = (t) => ({ headers: { Authorization: `Bearer ${t}` } });

const STATUS = {
  pending_approval: { label:'Pending',  cls:'bg-amber-50 text-amber-700 border-amber-200' },
  approved:         { label:'Approved', cls:'bg-emerald-50 text-emerald-700 border-emerald-200' },
  entered:          { label:'Inside',   cls:'bg-blue-50 text-blue-700 border-blue-200' },
  exited:           { label:'Exited',   cls:'bg-slate-100 text-slate-700 border-slate-200' },
  rejected:         { label:'Rejected', cls:'bg-red-50 text-red-700 border-red-200' },
};

const DLVR_STATUS = {
  received:  { label:'Received',  cls:'bg-blue-50 text-blue-700 border-blue-200' },
  notified:  { label:'Notified',  cls:'bg-amber-50 text-amber-700 border-amber-200' },
  collected: { label:'Collected', cls:'bg-emerald-50 text-emerald-700 border-emerald-200' },
  returned:  { label:'Returned',  cls:'bg-slate-100 text-slate-700 border-slate-200' },
};

const PURPOSE_ICONS = { Delivery:'📦', Guest:'👤', Service:'🔧', Cab:'🚕', Other:'🔵' };

function dur(entry, exit) {
  const m = Math.floor(((exit ? new Date(exit) : new Date()) - new Date(entry)) / 60000);
  return m < 60 ? `${m}m` : `${Math.floor(m/60)}h ${m%60}m`;
}

const inp = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all';

function Field({ label, children }) {
  return <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>{children}</div>;
}

function Btn({ saving, label, color='blue' }) {
  const g = color === 'blue' ? 'from-blue-600 to-indigo-600' : color === 'red' ? 'from-red-600 to-rose-600' : `from-${color}-600 to-${color}-700`;
  return (
    <button type="submit" disabled={saving} className={`w-full py-3.5 bg-gradient-to-r ${g} hover:opacity-90 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm`}>
      {saving && <Loader2 className="w-4 h-4 animate-spin" />}{label}
    </button>
  );
}

function Badge({ status, map }) {
  const m = map[status] || { label: status, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
  return <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${m.cls}`}>{m.label}</span>;
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><XCircle className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function CameraCapture({ onCapture, captured }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streaming, setStreaming] = useState(false);
  const [err, setErr] = useState('');

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      videoRef.current.srcObject = stream; videoRef.current.play(); setStreaming(true); setErr('');
    } catch { setErr('Camera access denied.'); }
  };
  const stop = () => { videoRef.current?.srcObject?.getTracks().forEach(t => t.stop()); setStreaming(false); };
  const snap = () => {
    const c = canvasRef.current, v = videoRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    onCapture(c.toDataURL('image/jpeg', 0.65)); stop();
  };
  useEffect(() => () => stop(), []);

  if (captured) return (
    <div className="relative">
      <img src={captured} alt="captured" className="w-full h-36 object-cover rounded-xl border border-slate-600" />
      <button type="button" onClick={() => onCapture(null)} className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg">Retake</button>
    </div>
  );
  return (
    <div>
      {streaming ? (
        <div>
          <video ref={videoRef} className="w-full h-36 object-cover rounded-xl border border-blue-500/40" autoPlay playsInline muted />
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={snap} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2"><Camera className="w-4 h-4" />Capture</button>
            <button type="button" onClick={stop} className="px-4 py-2.5 bg-slate-700 text-slate-200 rounded-xl text-sm">Cancel</button>
          </div>
        </div>
      ) : (
        <div>
          <button type="button" onClick={start} className="w-full h-20 border-2 border-dashed border-slate-600 hover:border-blue-500/60 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-blue-600 transition-all">
            <Camera className="w-5 h-5" /><span className="text-xs font-semibold">Open Camera</span>
          </button>
          <canvas ref={canvasRef} className="hidden" />
          {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
        </div>
      )}
    </div>
  );
}

const TABS = [
  { id:'visitors',  label:'Visitors',   icon: UserCheck },
  { id:'log',       label:'Log',        icon: ClipboardList },
  { id:'deliveries',label:'Deliveries', icon: Package },
  { id:'gatepass',  label:'Gate Pass',  icon: Ticket },
  { id:'shift',     label:'Shift',      icon: Timer },
  { id:'quickcall', label:'Call',       icon: Phone },
];

export default function SecurityDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user  = JSON.parse(localStorage.getItem('user') || '{}');

  const [tab,     setTab]     = useState('visitors');
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);

  const [visitors,   setVisitors]   = useState([]);
  const [visitorLog, setVisitorLog] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [gatePasses, setGatePasses] = useState([]);
  const [shifts,     setShifts]     = useState([]);
  const [flats,      setFlats]      = useState([]);
  const [stats,      setStats]      = useState({});

  const [search,       setSearch]       = useState('');
  const [filterDate,   setFilterDate]   = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState('');
  const [flatSearch,   setFlatSearch]   = useState('');

  const [vModal,  setVModal]  = useState(false);
  const [dModal,  setDModal]  = useState(false);
  const [gpModal, setGpModal] = useState(false);
  const [emModal, setEmModal] = useState(false);
  const [scanModal,setScanModal] = useState(false);
  const [photoLB, setPhotoLB] = useState(null);

  const emptyV = { visitor_name:'', phone:'', flat_id:'', purpose:'Guest', vehicle_number:'', photo_url:'' };
  const [vForm, setVForm] = useState(emptyV);
  const [dForm, setDForm] = useState({ courier_name:'', tracking_no:'', flat_id:'', notes:'', photo_url:'' });
  const [gpForm,setGpForm] = useState({ flat_id:'', resident_name:'', pass_type:'guest', valid_until:'' });
  const [emForm,setEmForm] = useState({ alert_type:'panic', location:'', description:'' });
  const [qrInput,setQrInput] = useState('');
  const [qrDetails, setQrDetails] = useState(null);

  // ── Fetch ──────────────────────────────────────────────
  const fx = useCallback(async (url, setter) => {
    try { const { data } = await axios.get(url, authH(token)); if (data.success) setter(data.data); }
    catch (e) { if (e.response?.status === 401) navigate('/staff/login'); }
  }, [token, navigate]);

  const fetchVisitors  = useCallback(() => fx(`/api/staff/visitors?date=${new Date().toISOString().split('T')[0]}&limit=100`, setVisitors), [fx]);
  const fetchLog       = useCallback(() => {
    const p = new URLSearchParams({ limit:200, ...(filterDate && { date: filterDate }), ...(filterStatus && { status: filterStatus }), ...(search && { search }) });
    fx(`/api/staff/visitors?${p}`, setVisitorLog);
  }, [fx, filterDate, filterStatus, search]);
  const fetchDeliveries= useCallback(() => fx('/api/staff/deliveries', setDeliveries), [fx]);
  const fetchGatePasses= useCallback(() => fx('/api/staff/gate-passes', setGatePasses), [fx]);
  const fetchShifts    = useCallback(() => fx('/api/staff/shift/my-shifts', setShifts), [fx]);
  const fetchFlats     = useCallback(() => fx('/api/staff/flats', setFlats), [fx]);
  const fetchStats     = useCallback(() => fx('/api/staff/visitors/stats', (d) => setStats(d)), [fx]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.allSettled([fetchStats(), fetchVisitors(), fetchFlats()]);
    setLoading(false);
  }, [fetchStats, fetchVisitors, fetchFlats]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const switchTab = (t) => {
    setTab(t); setSearch('');
    if (t==='visitors')   { fetchVisitors(); fetchStats(); }
    if (t==='log')        { fetchLog(); }
    if (t==='deliveries') { fetchDeliveries(); fetchFlats(); }
    if (t==='gatepass')   { fetchGatePasses(); fetchFlats(); }
    if (t==='shift')      fetchShifts();
    if (t==='quickcall')  fetchFlats();
  };

  useEffect(() => { if (tab === 'log') fetchLog(); }, [filterDate, filterStatus]);

  // ── Actions ─────────────────────────────────────────────
  const changeVisitorStatus = async (id, status) => {
    try { await axios.put(`/api/staff/visitors/${id}/status`, { status }, authH(token)); fetchVisitors(); fetchStats(); }
    catch { alert('Failed to update status'); }
  };

  const clockOut = async () => {
    setSaving(true);
    try {
      const { data } = await axios.post('/api/staff/shift/clock-out', {}, authH(token));
      alert(data.message); fetchShifts();
    } catch (e) { alert(e.response?.data?.message || 'Failed to clock out'); }
    finally { setSaving(false); }
  };

  const submitVisitor = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await axios.post('/api/staff/visitors', vForm, authH(token)); setVModal(false); setVForm(emptyV); fetchVisitors(); fetchStats(); }
    catch (err) { alert(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const submitDelivery = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await axios.post('/api/staff/deliveries', dForm, authH(token)); setDModal(false); setDForm({ courier_name:'', tracking_no:'', flat_id:'', notes:'', photo_url:'' }); fetchDeliveries(); }
    catch (err) { alert(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const submitGatePass = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await axios.post('/api/staff/gate-passes', gpForm, authH(token)); setGpModal(false); setGpForm({ flat_id:'', resident_name:'', pass_type:'guest', valid_until:'' }); fetchGatePasses(); }
    catch (err) { alert(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const submitEmergency = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await axios.post('/api/staff/emergency', emForm, authH(token)); alert('🚨 Emergency alert sent to all admins!'); setEmModal(false); setEmForm({ alert_type:'panic', location:'', description:'' }); }
    catch (err) { alert(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const scanQR = async (codeStr) => {
    const code = typeof codeStr === 'string' ? codeStr : qrInput.trim();
    if (!code) return;
    setSaving(true);
    setQrDetails(null);
    try {
      const { data } = await axios.get(`/api/gatepass/verify-pass?code=${code}`, authH(token));
      setQrDetails(data.data);
      setQrInput(code);
    } catch (e) { 
      alert(`❌ ${e.response?.data?.message || 'Invalid QR'}`); 
      setQrInput(''); 
    }
    finally { setSaving(false); }
  };

  const confirmEntry = async () => {
    if (!qrDetails) return;
    setSaving(true);
    try {
      const { data } = await axios.post('/api/gatepass/allow-entry', { pass_id: qrDetails.id }, authH(token));
      alert(`✅ ${data.message}`);
      setScanModal(false); setQrInput(''); setQrDetails(null); fetchGatePasses(); fetchVisitors();
    } catch (e) { alert(`❌ ${e.response?.data?.message || 'Failed'}`); }
    finally { setSaving(false); }
  };

  const updateDelivery = async (id, status) => {
    try { await axios.put(`/api/staff/deliveries/${id}/status`, { status }, authH(token)); fetchDeliveries(); }
    catch { alert('Failed to update delivery'); }
  };

  const pending = visitors.filter(v => v.status === 'pending_approval');
  const inside  = visitors.filter(v => v.status === 'entered');
  const filteredFlats = flats.filter(f =>
    !flatSearch || f.flat_number?.toLowerCase().includes(flatSearch.toLowerCase()) ||
    f.building?.toLowerCase().includes(flatSearch.toLowerCase()) ||
    f.resident_name?.toLowerCase().includes(flatSearch.toLowerCase())
  );
  const filteredLog = visitorLog.filter(v => !search ||
    v.visitor_name?.toLowerCase().includes(search.toLowerCase()) ||
    v.flat_number?.toLowerCase().includes(search.toLowerCase()) ||
    v.phone?.includes(search) || v.vehicle_number?.toLowerCase().includes(search.toLowerCase())
  );

  // ── Today Shift ─────────────────────────────────────────
  const todayShift = shifts.find(s => s.shift_date === new Date().toISOString().split('T')[0]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col">

      {/* TOPBAR */}
      <header className="h-16 border-b border-slate-200 bg-white/90 backdrop-blur-lg flex items-center justify-between px-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-sm">{user.society_name || 'SmartSOC'}</h1>
            <p className="text-[11px] text-blue-600 font-semibold uppercase tracking-wide">Security Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex gap-2">
            <span className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs font-bold text-blue-600">{inside.length} Inside</span>
            {pending.length > 0 && <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs font-bold text-amber-600 animate-pulse">{pending.length} Pending</span>}
          </div>
          {/* PANIC BUTTON */}
          <button onClick={() => setEmModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-red-600/30 animate-pulse">
            <Siren className="w-3.5 h-3.5" />SOS
          </button>
          <button onClick={() => { localStorage.clear(); navigate('/staff/login'); }} className="p-2 bg-white hover:bg-red-500/10 hover:text-red-600 rounded-xl transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* TABS */}
      <div className="border-b border-slate-200 bg-white sticky top-16 z-20">
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto py-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => switchTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${tab===id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
              <Icon className="w-3.5 h-3.5" />{label}
              {id==='visitors' && pending.length > 0 && <span className="bg-amber-500 text-black text-[9px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center">{pending.length}</span>}
              {id==='deliveries' && deliveries.filter(d=>d.status==='received').length > 0 && <span className="bg-blue-500 text-white text-[9px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center">{deliveries.filter(d=>d.status==='received').length}</span>}
            </button>
          ))}
          <button onClick={fetchAll} className="ml-auto p-2 text-slate-500 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors flex-shrink-0">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* MAIN */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-5 space-y-4">

        {/* ── VISITORS TAB ── */}
        {tab === 'visitors' && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label:"Today's Total", value: stats.total_today||0, color:'blue',    icon: Users },
                { label:'Inside Now',   value: stats.inside||0,      color:'emerald', icon: DoorOpen },
                { label:'Pending',      value: stats.pending||0,      color:'amber',   icon: Clock },
                { label:'Exited',       value: stats.exited||0,       color:'slate',   icon: TimerOff },
              ].map(({ label, value, color, icon: Icon }) => (
                <div key={label} className={`bg-${color}-500/10 border border-${color}-500/20 rounded-2xl p-4`}>
                  <div className="flex items-center gap-2 mb-1"><Icon className={`w-4 h-4 text-${color}-400`} /><span className="text-xs text-slate-500">{label}</span></div>
                  <div className={`text-3xl font-black text-${color}-400`}>{value}</div>
                </div>
              ))}
            </div>

            {pending.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2"><AlertCircle className="w-5 h-5 text-amber-600" /><span className="font-bold text-amber-600 text-sm">{pending.length} Awaiting Resident Approval</span></div>
                {pending.map(v => (
                  <div key={v.id} className="bg-white border border-slate-100 shadow-sm rounded-xl p-3 flex items-center gap-3">
                    {v.photo_url ? <img src={v.photo_url} alt="v" className="w-10 h-10 rounded-full object-cover flex-shrink-0 cursor-pointer" onClick={() => setPhotoLB(v.photo_url)} />
                      : <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-600 flex-shrink-0">{v.visitor_name?.[0]?.toUpperCase()}</div>}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 text-sm">{v.visitor_name}</div>
                      <div className="text-xs text-slate-500">Flat {v.flat_number} • {PURPOSE_ICONS[v.purpose]} {v.purpose}{v.vehicle_number && ` • 🚗 ${v.vehicle_number}`}</div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {v.resident_phone && <a href={`tel:${v.resident_phone}`} className="p-2 bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all"><Phone className="w-4 h-4" /></a>}
                      <button onClick={() => changeVisitorStatus(v.id,'approved')} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl">Approve</button>
                      <button onClick={() => changeVisitorStatus(v.id,'rejected')} className="px-3 py-1.5 bg-red-500/20 text-red-600 text-xs font-bold rounded-xl border border-red-500/30">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => { setVModal(true); if(!flats.length) fetchFlats(); }}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white font-bold rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-blue-600/25 transition-all text-base">
              <Plus className="w-5 h-5" />Register New Visitor
            </button>

            <div className="space-y-2">
              {loading ? <div className="flex justify-center py-10 text-slate-500 gap-2"><Loader2 className="animate-spin w-5 h-5" />Loading...</div>
                : visitors.length === 0 ? <div className="text-center py-10 text-slate-600 text-sm">No visitors today.</div>
                : visitors.map(v => (
                  <div key={v.id} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 flex gap-3 items-start hover:border-slate-600 transition-all">
                    {v.photo_url ? <img src={v.photo_url} alt="v" className="w-11 h-11 rounded-full object-cover border border-slate-600 flex-shrink-0 cursor-pointer" onClick={() => setPhotoLB(v.photo_url)} />
                      : <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${STATUS[v.status]?.cls||'bg-slate-700 text-slate-600'}`}>{v.visitor_name?.[0]?.toUpperCase()}</div>}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">{v.visitor_name}</span>
                        <Badge status={v.status} map={STATUS} />
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">🏠 Flat {v.flat_number||'—'}{v.building?` / ${v.building}`:''} • {PURPOSE_ICONS[v.purpose]} {v.purpose}{v.phone&&` • ${v.phone}`}{v.vehicle_number&&` • 🚗 ${v.vehicle_number}`}</p>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        In: {v.entry_time ? new Date(v.entry_time).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '—'}
                        {v.exit_time && ` → ${new Date(v.exit_time).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})} (${dur(v.entry_time,v.exit_time)})`}
                        {v.status==='entered' && !v.exit_time && <span className="text-blue-600"> • {dur(v.entry_time,null)} inside</span>}
                        {v.logged_by_name && <span className="text-slate-600"> • by {v.logged_by_name}</span>}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5 items-end">
                      {v.resident_phone && <a href={`tel:${v.resident_phone}`} className="p-2 bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all"><Phone className="w-3.5 h-3.5" /></a>}
                      {v.status==='approved'  && <button onClick={() => changeVisitorStatus(v.id,'entered')} className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Let In</button>}
                      {v.status==='entered'   && <button onClick={() => changeVisitorStatus(v.id,'exited')}  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1"><ArrowRight className="w-3 h-3" />Exit</button>}
                      {v.status==='pending_approval' && <button onClick={() => changeVisitorStatus(v.id,'rejected')} className="text-xs bg-red-500/10 text-red-600 font-bold px-3 py-1.5 rounded-xl border border-red-500/20"><XCircle className="w-3 h-3" /></button>}
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}

        {/* ── LOG TAB ── */}
        {tab === 'log' && (
          <>
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, flat, phone, vehicle..." className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 shadow-sm rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              <div className="flex items-center gap-2 bg-white border border-slate-200 shadow-sm rounded-xl px-3">
                <Calendar className="w-4 h-4 text-slate-500" />
                <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="bg-transparent text-sm text-slate-900 py-2.5 focus:outline-none" />
              </div>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-white border border-slate-200 shadow-sm rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none">
                <option value="">All Status</option>
                {Object.entries(STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <button onClick={fetchLog} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm flex items-center gap-2"><Filter className="w-4 h-4" />Filter</button>
            </div>
            <p className="text-xs text-slate-500">{filteredLog.length} records</p>
            <div className="space-y-2">
              {filteredLog.length === 0 ? <div className="text-center py-12 text-slate-600 text-sm">No records found.</div>
                : filteredLog.map(v => (
                  <div key={v.id} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 flex gap-3 items-center">
                    {v.photo_url ? <img src={v.photo_url} alt="v" className="w-10 h-10 rounded-full object-cover flex-shrink-0 cursor-pointer" onClick={() => setPhotoLB(v.photo_url)} />
                      : <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${STATUS[v.status]?.cls||'bg-slate-700 text-slate-600'}`}>{v.visitor_name?.[0]?.toUpperCase()}</div>}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{v.visitor_name}</span>
                        <Badge status={v.status} map={STATUS} />
                      </div>
                      <p className="text-xs text-slate-500">Flat {v.flat_number||'—'} • {v.purpose}{v.phone&&` • ${v.phone}`}{v.vehicle_number&&` • 🚗 ${v.vehicle_number}`}</p>
                      <p className="text-[11px] text-slate-600">
                        {v.entry_time ? new Date(v.entry_time).toLocaleString('en-IN') : ''}
                        {v.exit_time && ` → ${new Date(v.exit_time).toLocaleString('en-IN')} (${dur(v.entry_time,v.exit_time)})`}
                        {v.logged_by_name && ` • logged by ${v.logged_by_name}`}
                      </p>
                    </div>
                    {v.resident_phone && <a href={`tel:${v.resident_phone}`} className="p-2.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all flex-shrink-0"><Phone className="w-4 h-4" /></a>}
                  </div>
                ))}
            </div>
          </>
        )}

        {/* ── DELIVERIES TAB ── */}
        {tab === 'deliveries' && (
          <>
            <div className="flex gap-2">
              <button onClick={() => setDModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm shadow-lg transition-all">
                <Plus className="w-4 h-4" />Log Delivery
              </button>
            </div>
            <div className="space-y-2">
              {deliveries.length === 0 ? <div className="text-center py-12 text-slate-600 text-sm">No deliveries logged.</div>
                : deliveries.map(d => (
                  <div key={d.id} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 flex gap-3 items-start">
                    <div className="w-11 h-11 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">{d.courier_name}</span>
                        <Badge status={d.status} map={DLVR_STATUS} />
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Flat {d.flat_number||'—'}{d.tracking_no&&` • Track: ${d.tracking_no}`}{d.received_by_name&&` • by ${d.received_by_name}`}</p>
                      <p className="text-[11px] text-slate-600">{new Date(d.received_at).toLocaleString('en-IN')}{d.collected_at&&` → Collected: ${new Date(d.collected_at).toLocaleString('en-IN')}`}</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {d.status === 'received'  && <button onClick={() => updateDelivery(d.id,'collected')} className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl">Collected</button>}
                      {d.status === 'received'  && <button onClick={() => updateDelivery(d.id,'returned')}  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl">Returned</button>}
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}

        {/* ── GATE PASS TAB ── */}
        {tab === 'gatepass' && (
          <>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setGpModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm"><Plus className="w-4 h-4" />Issue Pass</button>
              <button onClick={() => setScanModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm"><QrCode className="w-4 h-4" />Scan QR</button>
            </div>
            <div className="space-y-3">
              {gatePasses.length === 0 ? <div className="text-center py-12 text-slate-600 text-sm">No gate passes.</div>
                : gatePasses.map(gp => (
                  <div key={gp.id} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 flex gap-3 items-start">
                    <div className="flex-shrink-0">
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(gp.qr_code)}&size=80x80&bgcolor=1e293b&color=ffffff`}
                        alt="QR" className="w-16 h-16 rounded-xl border border-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">{gp.resident_name}</span>
                        <Badge status={gp.status} map={{ active:{label:'Active',cls:'bg-emerald-50 text-emerald-700 border-emerald-200'}, used:{label:'Used',cls:'bg-blue-50 text-blue-700 border-blue-200'}, revoked:{label:'Revoked',cls:'bg-red-50 text-red-700 border-red-200'}, expired:{label:'Expired',cls:'bg-slate-100 text-slate-700 border-slate-200'} }} />
                        <span className="text-[10px] bg-slate-700 text-slate-500 border border-slate-600 px-2 py-0.5 rounded-full font-bold uppercase">{gp.pass_type}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Flat {gp.flat_number||'—'}</p>
                      <p className="text-[11px] font-mono text-slate-600 mt-0.5">{gp.qr_code}</p>
                      {gp.valid_until && <p className="text-[11px] text-slate-500">Valid until: {new Date(gp.valid_until).toLocaleString('en-IN')}</p>}
                      {gp.scanned_at && <p className="text-[11px] text-blue-600">Scanned: {new Date(gp.scanned_at).toLocaleString('en-IN')}</p>}
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}

        {/* ── SHIFT TAB ── */}
        {tab === 'shift' && (
          <>
            {/* Today's shift card */}
            <div className={`rounded-2xl border p-5 ${todayShift?.clock_out ? 'bg-white/40 border-slate-700' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
              <div className="flex items-center gap-3 mb-3">
                <Activity className={`w-5 h-5 ${todayShift?.clock_out ? 'text-slate-500' : 'text-emerald-600'}`} />
                <span className="font-bold text-slate-900">Today's Shift</span>
              </div>
              {todayShift ? (
                <div className="space-y-1">
                  <p className="text-sm text-slate-600">🕐 Clock In: <span className="font-bold text-slate-900">{new Date(todayShift.clock_in).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span></p>
                  {todayShift.clock_out ? (
                    <p className="text-sm text-slate-600">🕐 Clock Out: <span className="font-bold text-slate-900">{new Date(todayShift.clock_out).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span> <span className="text-emerald-600">({Math.floor(todayShift.duration_min/60)}h {todayShift.duration_min%60}m)</span></p>
                  ) : (
                    <p className="text-sm text-emerald-300">⏱ Active — {dur(todayShift.clock_in, null)} elapsed</p>
                  )}
                </div>
              ) : <p className="text-sm text-slate-500">No shift started today. Login auto-starts your shift.</p>}
              {todayShift && !todayShift.clock_out && (
                <button onClick={clockOut} disabled={saving} className="mt-4 w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Timer className="w-4 h-4" />} Clock Out
                </button>
              )}
            </div>
            {/* Shift history */}
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Shift History</h3>
            <div className="space-y-2">
              {shifts.length === 0 ? <div className="text-center py-8 text-slate-600 text-sm">No shift history.</div>
                : shifts.map(s => (
                  <div key={s.id} className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-white">{new Date(s.shift_date + 'T00:00:00').toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})}</span>
                      {s.duration_min ? <span className="text-emerald-600 font-bold text-sm">{Math.floor(s.duration_min/60)}h {s.duration_min%60}m</span> : <span className="text-amber-600 text-xs font-bold">Active</span>}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      In: {s.clock_in ? new Date(s.clock_in).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '—'}
                      {s.clock_out && ` → Out: ${new Date(s.clock_out).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}`}
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}

        {/* ── QUICK CALL TAB ── */}
        {tab === 'quickcall' && (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input value={flatSearch} onChange={e => setFlatSearch(e.target.value)} placeholder="Search flat, block, or resident..."
                className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 shadow-sm rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredFlats.length === 0 ? <div className="col-span-full text-center py-12 text-slate-600 text-sm">No flats found.</div>
                : filteredFlats.map(f => (
                  <div key={f.id} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 hover:border-blue-500/40 transition-all">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0"><Building2 className="w-5 h-5 text-blue-600" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900 text-sm">Flat {f.flat_number}{f.building ? ` — ${f.building}` : ''}</div>
                        <div className="text-xs text-slate-500 truncate">{f.resident_name || f.owner_name || 'No resident'}</div>
                      </div>
                    </div>
                    {f.resident_phone
                      ? <a href={`tel:${f.resident_phone}`} className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-all">
                          <Phone className="w-4 h-4" />Call {f.resident_phone}
                        </a>
                      : <span className="mt-3 flex justify-center w-full py-2.5 bg-slate-50 text-slate-500 text-xs rounded-xl">No phone on record</span>}
                  </div>
                ))}
            </div>
          </>
        )}
      </main>

      {/* ═══════════ MODALS ═══════════ */}

      {/* Visitor Modal */}
      {vModal && (
        <Modal title="🚪 New Visitor Entry" onClose={() => !saving && setVModal(false)}>
          <form onSubmit={submitVisitor} className="space-y-4">
            <Field label="Visitor Name *"><input required value={vForm.visitor_name} onChange={e => setVForm({...vForm,visitor_name:e.target.value})} placeholder="e.g. Rahul Sharma" className={inp} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone"><input type="tel" value={vForm.phone} onChange={e => setVForm({...vForm,phone:e.target.value})} placeholder="+91 98765..." className={inp} /></Field>
              <Field label="Vehicle No."><input value={vForm.vehicle_number} onChange={e => setVForm({...vForm,vehicle_number:e.target.value})} placeholder="MH 01 AB 1234" className={inp} /></Field>
            </div>
            <Field label="Flat *">
              <select required value={vForm.flat_id} onChange={e => setVForm({...vForm,flat_id:e.target.value})} className={inp}>
                <option value="">Select flat...</option>
                {flats.map(f => <option key={f.id} value={f.id}>{f.building?`${f.building} - `:''}Flat {f.flat_number}{f.resident_name?` (${f.resident_name})`:''}</option>)}
              </select>
            </Field>
            <Field label="Purpose">
              <div className="grid grid-cols-5 gap-1.5">
                {['Delivery','Guest','Service','Cab','Other'].map(p => (
                  <button key={p} type="button" onClick={() => setVForm({...vForm,purpose:p})}
                    className={`py-2.5 rounded-xl text-[11px] font-bold transition-all border text-center ${vForm.purpose===p?'bg-blue-600 border-blue-500 text-white':'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                    {PURPOSE_ICONS[p]}<br/>{p}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Photo (Optional)"><CameraCapture captured={vForm.photo_url} onCapture={url => setVForm({...vForm,photo_url:url||''})} /></Field>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex gap-2"><Bell className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" /><p className="text-xs text-blue-300">Resident will get an in-app notification and can Approve or Reject.</p></div>
            <Btn saving={saving} label="Register & Notify Resident" />
          </form>
        </Modal>
      )}

      {/* Delivery Modal */}
      {dModal && (
        <Modal title="📦 Log Delivery" onClose={() => !saving && setDModal(false)}>
          <form onSubmit={submitDelivery} className="space-y-4">
            <Field label="Courier / Company *"><input required value={dForm.courier_name} onChange={e => setDForm({...dForm,courier_name:e.target.value})} placeholder="e.g. Amazon, Swiggy, BlueDart" className={inp} /></Field>
            <Field label="Tracking Number"><input value={dForm.tracking_no} onChange={e => setDForm({...dForm,tracking_no:e.target.value})} placeholder="Optional" className={inp} /></Field>
            <Field label="Flat *">
              <select required value={dForm.flat_id} onChange={e => setDForm({...dForm,flat_id:e.target.value})} className={inp}>
                <option value="">Select flat...</option>
                {flats.map(f => <option key={f.id} value={f.id}>{f.building?`${f.building} - `:''}Flat {f.flat_number}{f.resident_name?` (${f.resident_name})`:''}</option>)}
              </select>
            </Field>
            <Field label="Notes"><input value={dForm.notes} onChange={e => setDForm({...dForm,notes:e.target.value})} placeholder="e.g. Left at gate, package info..." className={inp} /></Field>
            <Field label="Package Photo (Optional)"><CameraCapture captured={dForm.photo_url} onCapture={url => setDForm({...dForm,photo_url:url||''})} /></Field>
            <Btn saving={saving} label="Log Delivery & Notify Resident" />
          </form>
        </Modal>
      )}

      {/* Gate Pass Modal */}
      {gpModal && (
        <Modal title="🎟️ Issue Gate Pass" onClose={() => !saving && setGpModal(false)}>
          <form onSubmit={submitGatePass} className="space-y-4">
            <Field label="Flat *">
              <select required value={gpForm.flat_id} onChange={e => setGpForm({...gpForm,flat_id:e.target.value})} className={inp}>
                <option value="">Select flat...</option>
                {flats.map(f => <option key={f.id} value={f.id}>{f.building?`${f.building} - `:''}Flat {f.flat_number}</option>)}
              </select>
            </Field>
            <Field label="Resident Name *"><input required value={gpForm.resident_name} onChange={e => setGpForm({...gpForm,resident_name:e.target.value})} placeholder="Resident name" className={inp} /></Field>
            <Field label="Pass Type">
              <select value={gpForm.pass_type} onChange={e => setGpForm({...gpForm,pass_type:e.target.value})} className={inp}>
                {['guest','delivery','service','vehicle','other'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </Field>
            <Field label="Valid Until"><input type="datetime-local" value={gpForm.valid_until} onChange={e => setGpForm({...gpForm,valid_until:e.target.value})} className={inp} /></Field>
            <Btn saving={saving} label="Issue Gate Pass" />
          </form>
        </Modal>
      )}

      {/* QR Scan Modal */}
      {scanModal && (
        <Modal title="📷 Scan Gate Pass QR" onClose={() => { setScanModal(false); setQrDetails(null); setQrInput(''); }}>
          <div className="space-y-4">
            {!qrDetails ? (
              <>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden p-2">
                  <QRScanner onScan={scanQR} onError={(e) => {}} />
                </div>
                <div className="text-center text-sm font-bold text-slate-500 uppercase">OR</div>
                <Field label="Manual QR Code Entry">
                  <div className="flex gap-2">
                    <input value={qrInput} onChange={e => setQrInput(e.target.value)} placeholder="GP-1234..." className={inp} />
                    <button onClick={scanQR} disabled={saving || !qrInput.trim()} className="px-5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all disabled:opacity-50">
                      {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Fetch'}
                    </button>
                  </div>
                </Field>
              </>
            ) : (
              <div className="space-y-4">
                <div className="bg-white border-2 border-emerald-500/30 rounded-2xl p-4 text-center">
                  <div className="inline-flex rounded-full bg-emerald-100 p-2 mb-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-wide">{qrDetails.guest_name}</h3>
                  <p className="text-sm font-bold text-slate-500">{qrDetails.purpose} • {qrDetails.mobile}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Resident</span>
                    <span className="font-bold text-slate-700">{qrDetails.member_name || '—'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Flat</span>
                    <span className="font-bold text-indigo-700 text-lg">{qrDetails.flat_number || '—'}</span>
                  </div>
                </div>
                {qrDetails.status !== 'APPROVED' ? (
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl border border-red-200 text-center font-bold text-sm uppercase tracking-wider">
                    Pass is {qrDetails.status}
                  </div>
                ) : (
                  <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl border border-emerald-200 text-center font-bold text-sm">
                    Valid Code • Present at {new Date().toLocaleTimeString()}
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setQrDetails(null); setQrInput(''); }} className="flex-1 py-3 text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl">Scan Another</button>
                  {qrDetails.status === 'APPROVED' && (
                    <button onClick={confirmEntry} disabled={saving} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Allow Entry'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Emergency Modal */}
      {emModal && (
        <Modal title="🚨 Raise Emergency Alert" onClose={() => !saving && setEmModal(false)}>
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex gap-2">
            <Siren className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-300 font-semibold">This will immediately notify ALL society admins/secretary.</p>
          </div>
          <form onSubmit={submitEmergency} className="space-y-4">
            <Field label="Alert Type">
              <div className="grid grid-cols-5 gap-1.5">
                {[['panic','🆘'],['fire','🔥'],['medical','🏥'],['theft','🚔'],['other','⚠️']].map(([v,icon]) => (
                  <button key={v} type="button" onClick={() => setEmForm({...emForm,alert_type:v})}
                    className={`py-2.5 rounded-xl text-[11px] font-bold transition-all border text-center ${emForm.alert_type===v?'bg-red-600 border-red-500 text-white':'bg-white border-slate-200 text-slate-500 hover:border-red-500/40'}`}>
                    {icon}<br/>{v.charAt(0).toUpperCase()+v.slice(1)}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Location"><input value={emForm.location} onChange={e => setEmForm({...emForm,location:e.target.value})} placeholder="e.g. Main Gate, Block B, Parking" className={inp} /></Field>
            <Field label="Description"><textarea rows={3} value={emForm.description} onChange={e => setEmForm({...emForm,description:e.target.value})} placeholder="Describe the situation..." className={inp+' resize-none'} /></Field>
            <Btn saving={saving} label="🚨 Send Emergency Alert" color="red" />
          </form>
        </Modal>
      )}

      {/* Photo lightbox */}
      {photoLB && (
        <div className="fixed inset-0 bg-black/92 z-50 flex items-center justify-center p-4" onClick={() => setPhotoLB(null)}>
          <img src={photoLB} alt="Visitor" className="max-w-sm w-full rounded-2xl shadow-2xl border border-slate-600" />
        </div>
      )}
    </div>
  );
}
