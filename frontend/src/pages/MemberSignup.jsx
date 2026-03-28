import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Building2, User, Mail, Phone, Lock, Hash, MapPin, 
  Loader2, AlertCircle, Eye, EyeOff, ChevronRight, CheckCircle2
} from 'lucide-react';
import { MAIN_DOMAIN, getSubdomainFromHost } from '../utils/domain';

export default function MemberSignup() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'home_owner',
    flat_number: '',
    block: '',
    subdomain: '',
    rental_start_date: '',
    rental_end_date: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Auto-detect subdomain from URL (e.g. somnath.automytee.in)
  useEffect(() => {
    const detected = getSubdomainFromHost();
    if (detected) {
      setFormData(prev => ({ ...prev, subdomain: detected }));
    }
  }, []);

  const handleSubdomainBlur = () => {
    // Subdomain is now detected automatically or entered manually
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match.');
    }

    if (formData.role === 'tenant' && (!formData.rental_start_date || !formData.rental_end_date)) {
      return setError('Rental Start and End dates are mandatory for tenants.');
    }

    setLoading(true);
    try {
      const payload = { ...formData };
      delete payload.confirmPassword;
      
      const response = await axios.post('/api/auth/member-signup', payload);

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 5000);
      }
    } catch (err) {
      console.error('Member signup failed:', err);
      const apiError = err.response?.data;
      const message = typeof apiError?.error === 'object'
        ? (apiError.error.message || JSON.stringify(apiError.error))
        : (apiError?.error || apiError?.message || 'Failed to submit registration. Please check inputs.');
      setError(String(message));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6 font-sans">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-100 p-8 text-center animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Request Sent!</h2>
          <p className="text-slate-600 font-medium leading-relaxed">
            Your request has been sent to the society secretary.<br/>
            You will be able to login only after approval.
          </p>
          <div className="mt-8 pt-6 border-t border-slate-100">
            <Link to="/login" className="text-blue-600 font-bold hover:underline">
              Return to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6 py-12 font-sans">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-100 p-8 md:p-10">
        
        <div className="mb-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white mx-auto mb-5 shadow-lg shadow-purple-500/30">
            <User className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Join Your Society</h2>
          <p className="text-slate-500 font-medium mt-2">Submit a request to your society secretary for platform access.</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm mb-8 border border-red-100 flex items-center gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Section 1: Society Info */}
          <div className="space-y-4">
            <h3 className="text-sm uppercase tracking-wider font-bold text-slate-400 border-b pb-2">1. Connect to Society Node</h3>
            <div className="relative group">
              <label className="text-xs font-bold text-slate-600 uppercase">Society Subdomain URL</label>
              <div className="flex items-center mt-1">
                <input
                  type="text" required name="subdomain"
                  value={formData.subdomain} onChange={handleInputChange} onBlur={handleSubdomainBlur}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:bg-white"
                  placeholder="greenpark"
                />
                <span className="ml-3 text-slate-400 font-bold text-sm">.{MAIN_DOMAIN}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Personal Info */}
          <div className="space-y-4">
            <h3 className="text-sm uppercase tracking-wider font-bold text-slate-400 border-b pb-2 mt-4">2. Personal Details</h3>
            
            <div className="grid md:grid-cols-2 gap-4 mt-2">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1"><User className="w-3 h-3"/> Full Name</label>
                <input required type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full mt-1 px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none" placeholder="John Doe" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1"><Phone className="w-3 h-3"/> Mobile Number</label>
                <input required type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full mt-1 px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none" placeholder="+1..." />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1"><Mail className="w-3 h-3"/> Email Address</label>
              <input required type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full mt-1 px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none" placeholder="john@example.com" />
            </div>
          </div>

          {/* Section 3: Residence Info */}
          <div className="space-y-4">
            <h3 className="text-sm uppercase tracking-wider font-bold text-slate-400 border-b pb-2 mt-4">3. Residence Mapping</h3>
            
            <div className="grid md:grid-cols-3 gap-4 mt-2">
              <div className="md:col-span-1">
                <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1"><MapPin className="w-3 h-3"/> Role Type</label>
                <select name="role" value={formData.role} onChange={handleInputChange} className="w-full mt-1 px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none cursor-pointer font-medium text-slate-700">
                  <option value="home_owner">Property Owner</option>
                  <option value="home_member">Family Member</option>
                  <option value="tenant">Tenant (Rental)</option>
                </select>
              </div>
              <div className="md:col-span-1">
                <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1"><Building2 className="w-3 h-3"/> Wing/Block</label>
                <input type="text" name="block" value={formData.block} onChange={handleInputChange} className="w-full mt-1 px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-purple-500/20 outline-none" placeholder="e.g. A" />
              </div>
              <div className="md:col-span-1">
                <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1">
                  <Hash className="w-3 h-3"/> Flat/Unit No *
                </label>
                <input 
                  required 
                  type="text" 
                  name="flat_number" 
                  value={formData.flat_number} 
                  onChange={handleInputChange} 
                  className="w-full mt-1 px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none" 
                  placeholder="e.g. 101, B-402" 
                />
              </div>
            </div>
            
            {/* Tenant Dates */}
            {formData.role === 'tenant' && (
              <div className="grid md:grid-cols-2 gap-4 mt-4 animate-in fade-in zoom-in-95 duration-300">
                <div>
                  <label className="text-xs font-bold text-amber-600 uppercase">Rental Start Date</label>
                  <input type="date" required name="rental_start_date" value={formData.rental_start_date} onChange={handleInputChange} className="w-full mt-1 px-4 py-3 bg-amber-50/50 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-amber-600 uppercase">Rental End Date</label>
                  <input type="date" required name="rental_end_date" value={formData.rental_end_date} onChange={handleInputChange} className="w-full mt-1 px-4 py-3 bg-amber-50/50 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none" />
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Security */}
          <div className="space-y-4">
            <h3 className="text-sm uppercase tracking-wider font-bold text-slate-400 border-b pb-2 mt-4">4. Security Identity</h3>
            <div className="grid md:grid-cols-2 gap-4 mt-2">
              <div className="relative">
                <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1"><Lock className="w-3 h-3"/> Password</label>
                <input required type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleInputChange} className="w-full mt-1 px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 outline-none" placeholder="••••••••" />
              </div>
              <div className="relative">
                <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1"><Lock className="w-3 h-3"/> Confirm Password</label>
                <input required type={showPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} className="w-full mt-1 px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 outline-none" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-10 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full mt-8 flex justify-center items-center py-4 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <div className="flex items-center gap-2">Submit Request for Approval <ChevronRight className="w-5 h-5"/></div>}
          </button>

          <p className="text-center text-sm font-medium text-slate-500 mt-4">
            Already have an account? <Link to="/login" className="text-purple-600 font-bold hover:underline">Sign In</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
