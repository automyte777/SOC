/**
 * AuditSection — lazy-loaded audit trail panel.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Shield, ChevronRight } from 'lucide-react';

export default function AuditSection({ auditLogs }) {
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
            <Activity className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Audit Trail</h3>
            <p className="text-xs text-slate-400">Recent system activity</p>
          </div>
        </div>
        <button onClick={() => navigate('/reports')} className="text-xs text-blue-600 hover:text-blue-500 font-semibold flex items-center gap-1">
          View All <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {auditLogs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No audit logs yet — activity will appear here.</p>
        ) : auditLogs.slice(0, 12).map(log => (
          <div key={log.id} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
            <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <Shield className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">{log.action?.replace(/_/g, ' ')}</span>
                {log.entity_type && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">{log.entity_type}</span>}
              </div>
              <p className="text-[11px] text-slate-400 truncate">{log.actor_name || 'System'}{log.details ? ` — ${log.details}` : ''}</p>
              <p className="text-[10px] text-slate-300">{new Date(log.created_at).toLocaleString('en-IN')}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
