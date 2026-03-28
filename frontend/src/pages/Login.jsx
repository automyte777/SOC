import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Building2, 
  Mail, 
  Lock, 
  Loader2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

export default function Login({ detectedSubdomain }) {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    subdomain: detectedSubdomain || ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Update subdomain from prop if it changes
  useEffect(() => {
    if (detectedSubdomain) {
      setFormData(prev => ({ ...prev, subdomain: detectedSubdomain }));
    }
  }, [detectedSubdomain]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.email || !formData.password || (!detectedSubdomain && !formData.subdomain)) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('/api/auth/login', {
        email: formData.email,
        password: formData.password,
        subdomain: formData.subdomain
      });

      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Finalize Subdomain Redirection
        const targetSubdomain = formData.subdomain;
        const currentHostname = window.location.hostname;
        const mainDomain = 'automytee.in';

        if (currentHostname === mainDomain) {
          // Redirect to actual production domain subdomain
          const port = window.location.port ? `:${window.location.port}` : '';
          const protocol = window.location.protocol;
          window.location.href = `${protocol}//${targetSubdomain}.${currentHostname}${port}/dashboard`;
        } else {
          // We are on localhost, OR already on a valid subdomain
          navigate('/dashboard');
        }
      }
    } catch (err) {
      console.error('Login attempt failed:', err);
      const apiError = err.response?.data;
      const message = typeof apiError?.error === 'object' 
        ? (apiError.error.message || JSON.stringify(apiError.error)) 
        : (apiError?.error || apiError?.message || 'Invalid credentials or subdomain. Please check and try again.');
      setError(String(message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] p-6 font-sans">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[120px] opacity-60"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-purple-50 rounded-full blur-[120px] opacity-60"></div>
      </div>

      <div className="relative w-full max-w-[420px] z-10">
        {/* Brand/Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center mb-4 transition-transform hover:scale-105 duration-300">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Society SaaS</h1>
          <p className="text-slate-500 text-sm mt-1">Management Platform</p>
        </div>

        {/* Login Card */}
        <div className="w-[420px] bg-white rounded-2xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-100 p-8">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800">Sign In</h2>
            <p className="text-slate-500 text-sm mt-1">Welcome back! Please enter your details.</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm mb-6 border border-red-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Subdomain Field (Only shown if NOT detected in URL) */}
            {!detectedSubdomain && (
              <div className="space-y-2 animate-in fade-in duration-500">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  Society Subdomain
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    name="subdomain"
                    required
                    value={formData.subdomain}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white placeholder:text-slate-400"
                    placeholder="e.g. greenpark"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                    .automytee.in
                  </div>
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Email Address
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white placeholder:text-slate-400"
                placeholder="john@example.com"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  Password
                </label>
                <Link to="/forgot-password" size="sm" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
                  Forgot?
                </Link>
              </div>
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white placeholder:text-slate-400"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Privacy Note */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 cursor-pointer group">
                <input
                  id="remember-me"
                  name="rememberMe"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer accent-blue-600"
                />
                <label htmlFor="remember-me" className="text-xs text-slate-500 font-medium cursor-pointer group-hover:text-slate-700 transition-colors">
                  Stay logged in for 30 days
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center items-center py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold shadow-[0_5px_20px_-5px_rgba(37,99,235,0.4)] hover:shadow-[0_8px_25px_-5px_rgba(37,99,235,0.5)] transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sign In</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-10 pt-6 border-t border-slate-50 text-center flex flex-col gap-3">
            <p className="text-xs text-slate-500 font-medium">
              Are you a property owner or tenant?{' '}
              <Link to="/signup/member" className="text-purple-600 font-bold hover:text-purple-700 transition-colors">
                Join Your Society
              </Link>
            </p>
            <p className="text-xs text-slate-500 font-medium">
              Platform Admin?{' '}
              <Link to="/signup" className="text-blue-600 font-bold hover:text-blue-700 transition-colors">
                Register a New Society
              </Link>
            </p>
          </div>
        </div>

        {/* Support Link */}
        <p className="text-center mt-8 text-xs text-slate-400 font-medium">
          Protected by industry standard encryption. <br />
          Need help? <a href="#" className="underline hover:text-slate-600">Contact Support</a>
        </p>
      </div>
    </div>
  );
}
