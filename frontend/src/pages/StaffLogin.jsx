import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Shield, Eye, EyeOff, Loader2, Building2, AlertCircle, User } from 'lucide-react';
import { getSubdomainFromHost } from '../utils/domain';

export default function StaffLogin() {
  const navigate  = useNavigate();
  const [subdomain, setSubdomain] = useState('');
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    const detected = getSubdomainFromHost();
    if (detected) setSubdomain(detected);
  }, []);

  const handleChange = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.username.trim() || !form.password) {
      return setError('Please enter your username and password.');
    }
    if (!subdomain) {
      return setError('Society not identified. Please access via your society URL.');
    }

    setLoading(true);
    try {
      const { data } = await axios.post('/api/staff/login', {
        username:  form.username.trim().toLowerCase(),
        password:  form.password,
        subdomain,
      });

      if (data.success) {
        localStorage.setItem('token',    data.token);
        localStorage.setItem('user',     JSON.stringify(data.user));
        localStorage.setItem('is_staff', 'true');
        navigate(data.dashboardPath || '/security/dashboard', { replace: true });
      } else {
        setError(data.error || data.message || 'Login failed.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center p-4 relative overflow-hidden">

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">

        {/* Badge */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-400 text-sm font-semibold tracking-wide">
            <Shield className="w-4 h-4" />
            Staff Portal
          </div>
        </div>

        {/* Card */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/40">

          {/* Icon + Title */}
          <div className="text-center mb-8">
            <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Staff Login</h1>
            <p className="text-slate-400 text-sm mt-1.5">
              {subdomain
                ? <><span className="font-semibold text-blue-400 capitalize">{subdomain}</span> Society</>
                : 'Sign in with your staff credentials'}
            </p>
          </div>

          {/* Society indicator */}
          {subdomain && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 mb-6">
              <Building2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="text-sm text-emerald-300 font-medium capitalize">{subdomain} — Detected automatically</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-300">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  id="staff-username"
                  type="text"
                  name="username"
                  autoComplete="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="e.g. security_101"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="staff-password"
                  type={showPw ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Your password"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="staff-login-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60 text-white font-bold rounded-xl shadow-lg shadow-blue-600/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
            >
              {loading
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Signing in...</>
                : <><Shield className="w-5 h-5" /> Sign In to Portal</>}
            </button>
          </form>

          {/* Back to resident login */}
          <div className="mt-6 text-center">
            <a
              href="/login"
              className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
            >
              ← Resident / Secretary Login
            </a>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-700 text-xs mt-6">
          SmartSOC Staff Portal • Secure Access
        </p>
      </div>
    </div>
  );
}
