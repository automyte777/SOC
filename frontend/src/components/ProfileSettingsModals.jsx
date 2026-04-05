import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, User, Lock, Bell, CheckCircle2, AlertTriangle, Moon, Globe } from 'lucide-react';

export default function ProfileSettingsModals({ showProfile, setShowProfile, showSettings, setShowSettings }) {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Forms
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [settingsForm, setSettingsForm] = useState({ visitorAlerts: true, maintenanceAlerts: true, announcements: true, darkMode: false, language: 'en' });
  const [settingsTab, setSettingsTab] = useState('password'); // password, notifications, preferences

  const fetchProfile = async () => {
    try {
       const token = localStorage.getItem('token');
       if(!token) return;
       const res = await axios.get('/api/member/profile', { headers: { Authorization: `Bearer ${token}` } });
       if(res.data.success) {
         const d = res.data.data;
         setProfile(d);
         setProfileForm({ name: d.name || '', phone: d.phone || '' });
         if(d.settings && Object.keys(d.settings).length > 0) {
            setSettingsForm(d.settings);
         }
       }
    } catch(err) {
       console.error(err);
    }
  };

  useEffect(() => {
    if(showProfile || showSettings) {
      fetchProfile();
      setMessage({ type:'', text:'' });
    }
  }, [showProfile, showSettings]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type:'', text:'' });
    try {
      const token = localStorage.getItem('token');
      await axios.put('/api/member/profile', profileForm, { headers: { Authorization: `Bearer ${token}` } });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      // Update local storage user briefly to reflect name change across app
      const user = JSON.parse(localStorage.getItem('user'));
      if(user) {
         user.name = profileForm.name;
         localStorage.setItem('user', JSON.stringify(user));
      }
      setTimeout(() => setShowProfile(false), 1500);
    } catch(err) {
      setMessage({ type: 'error', text: 'Failed to update profile.' });
    }
    setLoading(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if(passwordForm.newPassword !== passwordForm.confirmPassword) {
       return setMessage({ type: 'error', text: 'New passwords do not match' });
    }
    setLoading(true);
    setMessage({ type:'', text:'' });
    try {
      const token = localStorage.getItem('token');
      await axios.put('/api/member/change-password', {
         currentPassword: passwordForm.currentPassword,
         newPassword: passwordForm.newPassword
      }, { headers: { Authorization: `Bearer ${token}` } });
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch(err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to change password.' });
    }
    setLoading(false);
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    setMessage({ type:'', text:'' });
    try {
      const token = localStorage.getItem('token');
      await axios.put('/api/member/settings', { settings: settingsForm }, { headers: { Authorization: `Bearer ${token}` } });
      setMessage({ type: 'success', text: 'Preferences saved!' });
    } catch(err) {
      setMessage({ type: 'error', text: 'Failed to save preferences.' });
    }
    setLoading(false);
  };

  if(!showProfile && !showSettings) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      {/* PROFILE MODAL */}
      {showProfile && (
        <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2"><User className="w-5 h-5 text-indigo-600"/> My Profile</h3>
            <button onClick={() => setShowProfile(false)}><X className="w-5 h-5 text-slate-400 hover:text-rose-500 transition-colors" /></button>
          </div>
          <div className="p-6">
            {profile ? (
              <>
                <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-2xl">
                  <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 font-black text-xl flex items-center justify-center">
                    {profile.name?.substring(0,2).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg leading-tight">{profile.name}</h4>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full mt-1 inline-block">{profile.role.replace('_', ' ')}</span>
                    <p className="text-xs text-slate-500 font-medium mt-1">{profile.flat_number ? `Flat ${profile.flat_number}` : 'No Flat Bound'}</p>
                  </div>
                </div>
                
                {message.text && (
                  <div className={`p-3 rounded-xl mb-4 text-xs font-bold flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    {message.text}
                  </div>
                )}

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Full Name</label>
                    <input value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email (Read Only)</label>
                    <input disabled value={profile?.email || ''} className="w-full px-4 py-3 bg-slate-100 border border-slate-100 rounded-xl text-sm text-slate-500 cursor-not-allowed font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mobile Number</label>
                    <input value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-800" />
                  </div>
                  <button type="submit" disabled={loading} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 mt-2">
                    {loading ? 'Saving...' : 'Save Profile'}
                  </button>
                </form>
              </>
            ) : (
               <div className="py-10 text-center text-slate-400 text-sm font-bold">Loading profile...</div>
            )}
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2"><Lock className="w-5 h-5 text-slate-600"/> Settings</h3>
            <button onClick={() => setShowSettings(false)}><X className="w-5 h-5 text-slate-400 hover:text-rose-500 transition-colors" /></button>
          </div>
          
          <div className="flex border-b border-slate-100">
             <button onClick={() => setSettingsTab('password')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-colors ${settingsTab === 'password' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-400 hover:bg-slate-50'}`}>Security</button>
             <button onClick={() => setSettingsTab('notifications')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-colors ${settingsTab === 'notifications' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-400 hover:bg-slate-50'}`}>Notifications</button>
             <button onClick={() => setSettingsTab('preferences')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-colors ${settingsTab === 'preferences' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-400 hover:bg-slate-50'}`}>Preferences</button>
          </div>

          <div className="p-6">
            {message.text && (
              <div className={`p-3 rounded-xl mb-4 text-xs font-bold flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {message.text}
              </div>
            )}

            {settingsTab === 'password' && (
               <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Password</label>
                    <input type="password" value={passwordForm.currentPassword} onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})} required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">New Password</label>
                    <input type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Confirm New Password</label>
                    <input type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20" />
                  </div>
                  <button type="submit" disabled={loading} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 mt-2">
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
               </form>
            )}

            {settingsTab === 'notifications' && (
               <div className="space-y-3">
                  <label className="flex items-center justify-between p-4 border border-slate-100 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                     <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5 text-indigo-600" />
                        <div>
                           <p className="font-bold text-slate-800 text-sm">Visitor Alerts</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Push notifications for gate entries</p>
                        </div>
                     </div>
                     <input type="checkbox" checked={settingsForm.visitorAlerts} onChange={e => setSettingsForm({...settingsForm, visitorAlerts: e.target.checked})} className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500" />
                  </label>
                  <label className="flex items-center justify-between p-4 border border-slate-100 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                     <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5 text-blue-600" />
                        <div>
                           <p className="font-bold text-slate-800 text-sm">Maintenance Alerts</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Due date and payment reminders</p>
                        </div>
                     </div>
                     <input type="checkbox" checked={settingsForm.maintenanceAlerts} onChange={e => setSettingsForm({...settingsForm, maintenanceAlerts: e.target.checked})} className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500" />
                  </label>
                  <label className="flex items-center justify-between p-4 border border-slate-100 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                     <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5 text-rose-500" />
                        <div>
                           <p className="font-bold text-slate-800 text-sm">Announcements</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Important notices from secretary</p>
                        </div>
                     </div>
                     <input type="checkbox" checked={settingsForm.announcements} onChange={e => setSettingsForm({...settingsForm, announcements: e.target.checked})} className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500" />
                  </label>
                  <button onClick={handleSaveSettings} disabled={loading} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 mt-4">
                    {loading ? 'Saving...' : 'Save Preferences'}
                  </button>
               </div>
            )}

            {settingsTab === 'preferences' && (
               <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 border border-slate-100 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                     <div className="flex items-center gap-3">
                        <Moon className="w-5 h-5 text-slate-600" />
                        <div>
                           <p className="font-bold text-slate-800 text-sm">Dark Mode</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enable dark theme (Preview)</p>
                        </div>
                     </div>
                     <input type="checkbox" checked={settingsForm.darkMode} onChange={e => setSettingsForm({...settingsForm, darkMode: e.target.checked})} className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500" />
                  </label>

                  <div className="p-4 border border-slate-100 bg-slate-50 rounded-xl">
                     <div className="flex items-center gap-3 mb-2">
                        <Globe className="w-5 h-5 text-slate-600" />
                        <p className="font-bold text-slate-800 text-sm">Language</p>
                     </div>
                     <select value={settingsForm.language} onChange={e => setSettingsForm({...settingsForm, language: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none">
                        <option value="en">English</option>
                        <option value="gu">Gujarati</option>
                        <option value="hi">Hindi</option>
                     </select>
                  </div>

                  <button onClick={handleSaveSettings} disabled={loading} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 mt-4">
                    {loading ? 'Saving...' : 'Save Preferences'}
                  </button>
               </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
