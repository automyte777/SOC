/**
 * AlertsSection — lazy-loaded emergency alerts panel.
 */
import React from 'react';
import axios from 'axios';
import { Siren } from 'lucide-react';

export default function AlertsSection({ alerts, setAlerts, alertSaving, setAlertSaving }) {
  const active = alerts.filter(a => a.status === 'active');
  if (active.length === 0) return null;

  const ack = async (id) => {
    setAlertSaving(true);
    try {
      const t = localStorage.getItem('token');
      await axios.put(`/api/admin/emergency/${id}/acknowledge`, {}, { headers: { Authorization: `Bearer ${t}` } });
      setAlerts(prev => prev.map(x => x.id === id ? { ...x, status: 'acknowledged' } : x));
    } catch {}
    finally { setAlertSaving(false); }
  };

  const resolve = async (id) => {
    setAlertSaving(true);
    try {
      const t = localStorage.getItem('token');
      await axios.put(`/api/admin/emergency/${id}/resolve`, {}, { headers: { Authorization: `Bearer ${t}` } });
      setAlerts(prev => prev.filter(x => x.id !== id));
    } catch {}
    finally { setAlertSaving(false); }
  };

  const emoji = { panic: '🆘', fire: '🔥', medical: '🏥', theft: '🚔' };

  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center">
          <Siren className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h3 className="font-bold text-red-800">Active Emergency Alerts</h3>
          <p className="text-xs text-red-500">{active.length} unresolved</p>
        </div>
      </div>
      <div className="space-y-2">
        {active.map(a => (
          <div key={a.id} className="bg-white border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <span className="text-2xl">{emoji[a.alert_type] || '⚠️'}</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-red-800 capitalize">{a.alert_type} Alert</div>
              <div className="text-xs text-slate-500">{a.raised_by_name || 'Security'}{a.location ? ` • ${a.location}` : ''}</div>
              {a.description && <div className="text-xs text-slate-600 mt-0.5">{a.description}</div>}
              <div className="text-[11px] text-slate-400">{new Date(a.created_at).toLocaleString('en-IN')}</div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button disabled={alertSaving} onClick={() => ack(a.id)}
                className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-bold rounded-lg transition-all disabled:opacity-50">
                Acknowledge
              </button>
              <button disabled={alertSaving} onClick={() => resolve(a.id)}
                className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-bold rounded-lg transition-all disabled:opacity-50">
                Resolve
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
