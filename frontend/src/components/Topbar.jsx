import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  Search, 
  Bell, 
  ChevronDown, 
  User, 
  LogOut, 
  Settings as SettingsIcon 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ProfileSettingsModals from './ProfileSettingsModals';

const Topbar = ({ societyName, toggleSidebar }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const userName = user.name || 'User';
  
  const formattedRole = (user.role || '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/member/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setNotifications(res.data.data);
        setUnreadCount(res.data.data.filter(n => !n.is_read).length);
      }
    } catch (err) {
      console.error('Notif fetch failed');
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const markRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/member/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (err) { /* ignore */ }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="lg:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold text-slate-800 hidden md:block">{societyName}</h2>
      </div>

      {/* Search Bar - Hidden on Mobile */}
      <div className="hidden lg:flex flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search residents, flats, records..."
            className="w-full bg-slate-50 border-none rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500/10 transition-all outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
              <div className="px-4 py-2 border-b border-slate-50 flex items-center justify-between">
                <span className="font-bold text-slate-800">Notifications</span>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Recent</span>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-slate-400 text-sm">No new notifications</div>
                ) : notifications.map(n => (
                  <div 
                    key={n.id} 
                    onClick={() => markRead(n.id)}
                    className={`px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-50 last:border-none ${!n.is_read ? 'bg-blue-50/30' : ''}`}
                  >
                    <p className="text-sm font-bold text-slate-800">{n.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-slate-400 mt-2 font-medium">{new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-slate-50 text-center">
                <button className="text-xs font-bold text-blue-600 hover:underline">View All Notifications</button>
              </div>
            </div>
          )}
        </div>

        {/* User Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 p-1 rounded-full hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
              {userName.substring(0, 2).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-slate-700 line-clamp-1">{userName}</p>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider -mt-0.5">{formattedRole}</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
              <button 
                onClick={() => { setIsDropdownOpen(false); setShowProfileModal(true); }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors text-left"
              >
                <User className="w-4 h-4" />
                Profile
              </button>
              <button 
                onClick={() => { setIsDropdownOpen(false); setShowSettingsModal(true); }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors text-left"
              >
                <SettingsIcon className="w-4 h-4" />
                Settings
              </button>
              <div className="my-1 border-t border-slate-50"></div>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors text-left font-medium"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      <ProfileSettingsModals 
        showProfile={showProfileModal} setShowProfile={setShowProfileModal}
        showSettings={showSettingsModal} setShowSettings={setShowSettingsModal}
      />
    </header>
  );
};

export default Topbar;
