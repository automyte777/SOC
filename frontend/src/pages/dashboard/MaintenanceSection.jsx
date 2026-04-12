/**
 * MaintenanceSection — lazy-loaded dashboard section.
 * Handles billing ledger, extra charges, and config modals.
 * Receives all data + handlers as props (no internal fetching).
 */
import React from 'react';
import { CreditCard, Plus, Settings as SettingsIcon, Calendar, Filter, Info, XCircle } from 'lucide-react';

export default function MaintenanceSection({
  mConfig, mStats, mList, extraCharges, flats,
  selectedMonth, setSelectedMonth,
  mStatusFilter, setMStatusFilter,
  selectedFlats, setSelectedFlats,
  showMConfigModal,   setShowMConfigModal,
  showExtraChargeModal, setShowExtraChargeModal,
  handleMConfigSubmit, handleExtraChargeSubmit,
}) {
  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Maintenance Management</h2>
            <p className="text-slate-500 text-xs">Automated billing and extra charges</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowExtraChargeModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-all shadow-lg shadow-amber-100"
          >
            <Plus className="w-4 h-4" /> Extra Charge
          </button>
          <button
            onClick={() => setShowMConfigModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            <SettingsIcon className="w-4 h-4" /> Config
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
        {[
          { label: 'Total Flats',     value: mStats.totalFlats,                 cls: 'text-slate-900' },
          { label: 'Paid Members',    value: mStats.paidMembers,                cls: 'text-emerald-700', lCls: 'text-emerald-600' },
          { label: 'Unpaid Members',  value: mStats.unpaidMembers,              cls: 'text-rose-700',    lCls: 'text-rose-600' },
          { label: 'Total Collected', value: `₹${parseFloat(mStats.totalCollected).toLocaleString()}`, cls: 'text-blue-800', lCls: 'text-blue-600', cardCls: 'border-blue-100 bg-blue-50/30' },
          { label: 'Pending Amount',  value: `₹${parseFloat(mStats.totalPending).toLocaleString()}`,   cls: 'text-amber-800', lCls: 'text-amber-600', cardCls: 'border-amber-100 bg-amber-50/30' },
        ].map(({ label, value, cls, lCls, cardCls = '' }) => (
          <div key={label} className={`bg-white p-5 rounded-2xl border shadow-sm flex flex-col gap-1 ${cardCls || 'border-slate-100'}`}>
            <span className={`text-[10px] font-black uppercase tracking-widest ${lCls || 'text-slate-400'}`}>{label}</span>
            <span className={`text-2xl font-black ${cls}`}>{value}</span>
          </div>
        ))}
      </div>

      {/* Billing ledger */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex flex-wrap items-center justify-between gap-4">
          <h3 className="font-bold text-slate-800">Billing Ledger</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-600 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={mStatusFilter}
                onChange={e => setMStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-600 focus:outline-none"
              >
                <option value="">All Status</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Initiated">Initiated</option>
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 text-left">
                {['Flat Number','Owner Name','Amount','Status','Due Date'].map(h => (
                  <th key={h} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {mList.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400 italic text-sm">No records found for this month.</td></tr>
              ) : mList.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-black text-slate-800 text-sm">{item.flat_number}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{item.owner_name || 'N/A'}</td>
                  <td className="px-6 py-4 font-extrabold text-slate-900 text-sm">₹{parseFloat(item.amount).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${
                      item.status === 'Paid'      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                      item.status === 'Initiated' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                                    'bg-rose-50 text-rose-600 border border-rose-100'
                    }`}>{item.status}</span>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-500">{new Date(item.due_date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Extra Charges */}
      {extraCharges.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Legacy / Extra Charges Overview</h3>
            <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-1 rounded uppercase">
              Total Collected: ₹{extraCharges.reduce((a, c) => a + parseFloat(c.total_collected), 0).toLocaleString()}
            </span>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {extraCharges.map(ec => (
              <div key={ec.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50/30">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-slate-800 text-sm uppercase">{ec.title}</h4>
                  <span className="text-xs font-black text-slate-900">₹{parseFloat(ec.amount).toLocaleString()}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                    <span>Progress</span>
                    <span>{ec.paid_count}/{ec.total_assigned} Paid</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(ec.paid_count / ec.total_assigned) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Config Modal */}
      {showMConfigModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Maintenance Config</h3>
              <button onClick={() => setShowMConfigModal(false)}><XCircle className="w-6 h-6 text-slate-300 hover:text-rose-500 transition-colors" /></button>
            </div>
            <form onSubmit={handleMConfigSubmit} className="p-8 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monthly Amount (₹)</label>
                <input name="amount" type="number" defaultValue={mConfig?.amount} required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="e.g. 5000" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Activation Date</label>
                <input name="start_date" type="date" defaultValue={mConfig?.start_date?.split('T')[0]} required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div className="p-4 bg-blue-50 rounded-2xl flex gap-3">
                <Info className="w-5 h-5 text-blue-600 shrink-0" />
                <p className="text-[10px] font-medium text-blue-700 leading-normal">Billing will be automatically generated on the 1st of every month starting from the selected date.</p>
              </div>
              <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">Activate Maintenance</button>
            </form>
          </div>
        </div>
      )}

      {/* Extra Charge Modal */}
      {showExtraChargeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Add Extra Charge</h3>
              <button onClick={() => setShowExtraChargeModal(false)}><XCircle className="w-6 h-6 text-slate-300 hover:text-rose-500 transition-colors" /></button>
            </div>
            <form onSubmit={handleExtraChargeSubmit} className="p-8 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Charge Title</label>
                <input name="title" required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="e.g. Lift Repair 2024" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Amount (₹)</label>
                <input name="amount" type="number" required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="e.g. 500" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Apply To</label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="apply_to" value="all" defaultChecked className="w-4 h-4 text-blue-600" /><span className="text-sm font-bold text-slate-700">All Flats</span></label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="apply_to" value="selected" className="w-4 h-4 text-blue-600" /><span className="text-sm font-bold text-slate-700">Specific Flats</span></label>
                </div>
              </div>
              <div className="max-h-32 overflow-y-auto border border-slate-100 rounded-xl p-2 grid grid-cols-3 gap-2">
                {flats.map(f => (
                  <button
                    key={f.id} type="button"
                    onClick={() => setSelectedFlats(prev => prev.includes(f.id) ? prev.filter(x => x !== f.id) : [...prev, f.id])}
                    className={`text-[10px] font-bold px-2 py-1.5 rounded-lg border transition-all ${selectedFlats.includes(f.id) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-100 text-slate-600 hover:border-blue-200'}`}
                  >
                    {f.flat_number}
                  </button>
                ))}
              </div>
              <button type="submit" className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-amber-100 hover:bg-amber-600 transition-all">Generate Charges</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
