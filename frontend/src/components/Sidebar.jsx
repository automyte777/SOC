import React from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  UserPlus, 
  CreditCard, 
  ClipboardList, 
  Calendar, 
  Megaphone, 
  UserCheck, 
  Car, 
  BarChart3, 
  Settings,
  Ticket,
  X
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { hasRole } from '../utils/auth';

const allMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['society_secretary', 'home_owner', 'home_member', 'tenant'] },
  { icon: Building2, label: 'Flats / Units', path: '/flats', roles: ['society_secretary', 'home_owner', 'home_member'] },
  { icon: Users, label: 'Residents', path: '/residents', roles: ['society_secretary'] },
  { icon: UserPlus, label: 'Member Requests', path: '/members', roles: ['society_secretary'] },
  { icon: Ticket, label: 'Gate Pass', path: '/gatepass', roles: ['society_secretary', 'home_owner', 'home_member', 'tenant'] },
  { icon: UserPlus, label: 'Visitors', path: '/visitors', roles: ['society_secretary', 'home_owner', 'home_member', 'tenant'] },
  { icon: CreditCard, label: 'Maintenance', path: '/maintenance', roles: ['society_secretary', 'home_owner', 'home_member', 'tenant'] },
  { icon: ClipboardList, label: 'Complaints', path: '/complaints', roles: ['society_secretary', 'home_owner', 'home_member', 'tenant'] },
  { icon: Calendar, label: 'Events', path: '/events', roles: ['society_secretary', 'home_owner', 'home_member'] },
  { icon: Megaphone, label: 'Notice Board', path: '/notices', roles: ['society_secretary', 'home_owner', 'home_member'] },
  { icon: UserCheck, label: 'Staff', path: '/staff', roles: ['society_secretary'] },
  { icon: Car, label: 'Parking', path: '/parking', roles: ['society_secretary', 'home_owner', 'home_member'] },
  { icon: BarChart3, label: 'Reports', path: '/reports', roles: ['society_secretary'] },
  { icon: Settings, label: 'Settings', path: '/settings', roles: ['society_secretary'] },
];

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const visibleMenuItems = allMenuItems.filter(item => hasRole(item.roles));

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={toggleSidebar}
        ></div>
      )}

      <aside className={`fixed top-0 left-0 h-full w-[260px] bg-[#0f172a] text-slate-300 z-50 transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="font-bold text-white tracking-tight">SocietyOS</span>
          </div>
          <button onClick={toggleSidebar} className="lg:hidden text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100%-64px)] scrollbar-hide">
          {visibleMenuItems.map((item, index) => (
            <NavLink
              key={index}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all group
                ${isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                  : 'hover:bg-slate-800/50 hover:text-white'
                }
              `}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
