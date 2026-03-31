import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Ticket, PlusCircle, QrCode, Download, Share2, AlertCircle, Clock, CheckCircle2, XCircle, Search
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { getUser } from '../utils/auth';

const GatePass = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [guestName, setGuestName] = useState('');
  const [mobile, setMobile] = useState('');
  const [purpose, setPurpose] = useState('Visit');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');

  const user = getUser();
  const societyName = user?.society_name || 'My Society';

  const fetchPasses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/gatepass/my-passes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setPasses(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasses();
    const interval = setInterval(fetchPasses, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const handleCreatePass = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/gatepass/create-pass', {
        guest_name: guestName,
        mobile,
        purpose,
        valid_from: validFrom,
        valid_until: validUntil,
        visit_date: validFrom.split('T')[0]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setShowModal(false);
        setGuestName('');
        setMobile('');
        setPurpose('Visit');
        setValidFrom('');
        setValidUntil('');
        fetchPasses();
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to create gate pass');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'PENDING': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'USED': return 'bg-slate-100 text-slate-500 border-slate-200';
      case 'EXPIRED': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const handleDownload = (qrPath, guestName) => {
    const link = document.createElement('a');
    link.href = qrPath;
    link.download = `GatePass_${guestName}.png`;
    link.click();
  };

  if (loading && passes.length === 0) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      
      <main className="flex-1 flex flex-col min-w-0 transition-all duration-300 lg:ml-[260px]">
        <Topbar societyName={societyName} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <div className="p-6 max-w-7xl mx-auto w-full">
          <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight text-3xl">Gate Pass</h1>
              <p className="text-slate-500 mt-1">Generate and manage QR-based gate passes for your guests.</p>
            </div>
            <button 
              onClick={() => setShowModal(true)}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 whitespace-nowrap"
            >
              <PlusCircle className="w-5 h-5" /> Create Guest Pass
            </button>
          </header>

          {/* Pass List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {passes.map(pass => (
              <div key={pass.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-indigo-100/50 transition-all relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                  <QrCode className="w-32 h-32" />
                </div>
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest border ${getStatusColor(pass.status)}`}>
                      {pass.status}
                    </span>
                    <h3 className="text-xl font-extrabold text-slate-800 mt-3 truncate">{pass.guest_name}</h3>
                    <p className="text-slate-500 font-medium text-sm mt-1">{pass.purpose} • {pass.mobile}</p>
                  </div>
                  {pass.qr_code_path && (
                    <img src={pass.qr_code_path} alt="QR Code" className="w-20 h-20 rounded-xl bg-white p-1 border-2 border-slate-100 shadow-sm" />
                  )}
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative z-10">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-slate-400 font-bold uppercase tracking-wider">Valid From</span>
                    <span className="text-slate-700 font-bold">{new Date(pass.valid_from).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mb-3">
                    <span className="text-slate-400 font-bold uppercase tracking-wider">Valid Until</span>
                    <span className="text-slate-700 font-bold">{new Date(pass.valid_until).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                     <span className="font-mono bg-white px-2 py-1 rounded text-slate-500 border border-slate-100">{pass.pass_code}</span>
                     
                     {pass.status === 'APPROVED' && pass.qr_code_path && (
                       <button 
                         onClick={() => handleDownload(pass.qr_code_path, pass.guest_name)}
                         className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                       >
                         <Download className="w-3.5 h-3.5" /> Save QR
                       </button>
                     )}
                  </div>
                </div>
              </div>
            ))}

            {passes.length === 0 && !loading && (
              <div className="col-span-full py-20 bg-white rounded-3xl border border-slate-100 text-center shadow-sm">
                <Ticket className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-800">No Gate Passes Yet</h3>
                <p className="text-slate-500 mt-2 max-w-sm mx-auto">Create your first gate pass to invite friends, family, or delivery agents seamlessly.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative z-10 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-indigo-600" /> New Guest Pass
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto w-full">
              <form id="passForm" onSubmit={handleCreatePass} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Guest Name</label>
                  <input 
                    type="text" 
                    required
                    value={guestName}
                    onChange={e => setGuestName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    placeholder="e.g. John Doe"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Mobile Number</label>
                  <input 
                    type="tel" 
                    required
                    value={mobile}
                    onChange={e => setMobile(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    placeholder="10-digit mobile number"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Purpose</label>
                  <select 
                    value={purpose}
                    onChange={e => setPurpose(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all appearance-none font-medium"
                  >
                    <option value="Visit">Personal Visit</option>
                    <option value="Delivery">Delivery / Courier</option>
                    <option value="Cab">Cab / Taxi</option>
                    <option value="Maintenance">Service / Maintenance</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Valid From</label>
                    <input 
                      type="datetime-local" 
                      required
                      value={validFrom}
                      onChange={e => setValidFrom(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Valid Until</label>
                    <input 
                      type="datetime-local" 
                      required
                      value={validUntil}
                      onChange={e => setValidUntil(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0 rounded-b-3xl flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setShowModal(false)}
                className="px-6 py-3 font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                form="passForm"
                type="submit"
                className="px-6 py-3 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95"
              >
                Generate Pass
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GatePass;
