/**
 * QuickActionsSection — lazy-loaded quick navigation panel.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Package, Users, Siren, Activity, Shield } from 'lucide-react';

const ACTIONS = [
  { label: 'View Visitors',    icon: UserPlus, path: '/visitors',  color: 'blue' },
  { label: 'Deliveries',       icon: Package,  path: '/visitors',  color: 'indigo' },
  { label: 'Staff Attendance', icon: Users,    path: '/staff',     color: 'emerald' },
  { label: 'Broadcast Notice', icon: Siren,    path: '/notices',   color: 'amber' },
  { label: 'Reports',          icon: Activity, path: '/reports',   color: 'violet' },
  { label: 'Emergency Log',    icon: Shield,   path: '/settings',  color: 'red' },
];

export default function QuickActionsSection() {
  const navigate = useNavigate();
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
      <h3 className="font-semibold text-slate-800 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        {ACTIONS.map(({ label, icon: Icon, path, color }) => (
          <button
            key={label}
            onClick={() => navigate(path)}
            className={`flex items-center gap-3 p-3.5 bg-${color}-50 hover:bg-${color}-100 border border-${color}-100 rounded-xl transition-all text-left`}
          >
            <Icon className={`w-4 h-4 text-${color}-600 flex-shrink-0`} />
            <span className={`text-sm font-medium text-${color}-700`}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
