import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Building2, Trees, ShieldCheck, MailOpen, Activity, LayoutDashboard,
  MapPin, Settings, Check, Building, Key, CheckCircle2, User, Phone,
  Loader2, AlertCircle, Clock, Sparkles, ChevronRight, RefreshCw
} from 'lucide-react';
import { MAIN_DOMAIN } from '../utils/domain';

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function FeatureItem({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-4 text-slate-700 font-medium">
      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
        <Icon className="w-5 h-5" />
      </div>
      {text}
    </div>
  );
}

function FormInput({ label, name, type = 'text', value, onChange, placeholder, required = false, disabled = false }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input
        type={type}
        name={name}
        required={required}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-slate-900 placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
        placeholder={placeholder}
      />
    </div>
  );
}

function FormSelect({ label, name, value, onChange, options, disabled = false }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-slate-900 bg-white disabled:bg-slate-50"
      >
        <option value="" disabled>Select</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function PlanCard({ title, price, features, selected, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer border rounded-xl p-4 transition-all duration-200 ${
        selected
          ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/50'
          : 'border-slate-200 hover:border-slate-300 bg-white'
      }`}
    >
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          {selected ? (
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
          ) : (
            <div className="w-5 h-5 rounded-full border border-slate-300" />
          )}
          <h4 className="font-semibold text-slate-900">{title}</h4>
        </div>
        <span className="font-bold text-slate-900">
          {price}<span className="text-xs text-slate-500 font-normal">/mo</span>
        </span>
      </div>
      <div className="pl-7 space-y-1">
        {features.map((feat, i) => (
          <div key={i} className="text-sm text-slate-600 flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-slate-400" /> {feat}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Success / Pending Approval Screen
// ─────────────────────────────────────────────────────────────
function PendingApprovalScreen({ registrationData }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-100 rounded-full blur-[150px] opacity-40" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-purple-100 rounded-full blur-[150px] opacity-40" />
      </div>

      <div className="relative bg-white rounded-3xl shadow-2xl shadow-slate-200 w-full max-w-md p-10 text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
          <Clock className="w-10 h-10 text-amber-500" strokeWidth={1.5} />
        </div>

        <h2 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">
          Registration Submitted!
        </h2>
        <p className="text-slate-500 mb-6 text-sm leading-relaxed">
          Your society has been submitted for admin approval. We'll activate your account shortly.
        </p>

        {/* URL card */}
        <div className="mb-6 bg-blue-50 rounded-xl px-4 py-3 border border-blue-100 text-left">
          <p className="text-xs text-blue-500 font-semibold uppercase tracking-wider mb-1">Your Society URL (once approved)</p>
          <p className="font-bold text-blue-700 text-sm break-all">
            {registrationData?.requested_url || `${registrationData?.requested_subdomain}.${MAIN_DOMAIN}`}
          </p>
        </div>

        {/* Steps */}
        <div className="mb-8 text-left space-y-3">
          {[
            { done: true,  text: 'Registration form submitted' },
            { done: true,  text: 'Society record created in system' },
            { done: false, text: 'Admin reviews your application' },
            { done: false, text: 'Tenant database provisioned on approval' },
            { done: false, text: 'Your subdomain goes live' },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                step.done ? 'bg-emerald-100' : 'bg-slate-100'
              }`}>
                {step.done
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  : <Clock className="w-3 h-3 text-slate-400" />
                }
              </div>
              <span className={`text-sm ${step.done ? 'text-slate-700' : 'text-slate-400'}`}>
                {step.text}
              </span>
            </div>
          ))}
        </div>

        <div className="text-xs text-slate-400 bg-slate-50 rounded-xl p-4 border border-slate-100">
          <p className="font-semibold text-slate-500 mb-1">What happens next?</p>
          The platform admin will review your registration. Once approved, your society will be live at{' '}
          <span className="font-bold text-blue-600">
            {registrationData?.requested_url || `${registrationData?.requested_subdomain}.${MAIN_DOMAIN}`}
          </span>{' '}
          and you will be able to log in.
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────
// Main Signup Component
// ─────────────────────────────────────────────────────────────
export default function Signup() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    society_name: '',
    subdomain: '',
    city: '',
    society_type: 'Apartment',
    total_units: '',
    admin_name: '',
    admin_email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    plan: 'Starter Plan'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Subdomain availability state
  const [subdomainStatus, setSubdomainStatus] = useState('idle'); // idle | checking | available | taken | invalid
  const [subdomainMessage, setSubdomainMessage] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  // Success state after submission
  const [submitted, setSubmitted] = useState(false);
  const [registrationData, setRegistrationData] = useState(null);

  const debounceTimer = useRef(null);

  // ── Password strength ─────────────────────────────────────
  const calculateStrength = (password) => {
    let strength = 0;
    if (password.length > 5) strength += 1;
    if (password.length > 7) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    setPasswordStrength(Math.min(strength, 5));
  };

  const getStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-red-500';
    if (passwordStrength === 2) return 'bg-orange-500';
    if (passwordStrength === 3) return 'bg-yellow-500';
    if (passwordStrength >= 4) return 'bg-green-500';
    return 'bg-gray-200';
  };

  // ── Real-time subdomain availability check ────────────────
  const checkSubdomainAvailability = useCallback(async (value) => {
    if (!value || value.length < 3) {
      setSubdomainStatus('idle');
      setSubdomainMessage('');
      setSuggestions([]);
      return;
    }

    setSubdomainStatus('checking');
    try {
      const res = await axios.get(`/api/society/check-subdomain?name=${encodeURIComponent(value)}`);
      const data = res.data;
      if (data.available) {
        setSubdomainStatus('available');
        setSubdomainMessage(`✓ "${value}.${MAIN_DOMAIN}" is available!`);
        setSuggestions([]);
      } else {
        setSubdomainStatus('taken');
        setSubdomainMessage(data.message || 'This subdomain is already taken.');
        setSuggestions(data.suggestions || []);
      }
    } catch {
      setSubdomainStatus('idle');
      setSubdomainMessage('');
    }
  }, []);

  // ── Input handler ─────────────────────────────────────────
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'password') calculateStrength(value);

    if (name === 'subdomain') {
      const clean = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
      setFormData((prev) => ({ ...prev, subdomain: clean }));

      // Debounce the API call
      clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        checkSubdomainAvailability(clean);
      }, 500);
    }
  };

  // ── Click a suggestion ────────────────────────────────────
  const applySuggestion = (s) => {
    setFormData((prev) => ({ ...prev, subdomain: s }));
    setSuggestions([]);
    checkSubdomainAvailability(s);
  };

  const handlePlanSelect = (planName) => {
    setFormData((prev) => ({ ...prev, plan: planName }));
  };

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (subdomainStatus === 'taken' || subdomainStatus === 'invalid') {
      setError('Please choose an available subdomain before submitting.');
      return;
    }

    if (subdomainStatus === 'checking') {
      setError('Please wait for subdomain availability check to complete.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('/api/society/register', {
        ...formData,
        total_units: parseInt(formData.total_units)
      });

      if (response.data.success) {
        setRegistrationData(response.data.society);
        setSubmitted(true);
      }
    } catch (err) {
      console.error('Registration failed:', err);
      const apiError = err.response?.data;
      const message = typeof apiError?.error === 'object'
        ? (apiError.error.message || JSON.stringify(apiError.error))
        : (apiError?.error || apiError?.message || 'An error occurred during registration. Please try again.');
      setError(String(message));
      
      if (apiError?.suggestions) setSuggestions(apiError.suggestions);
    } finally {
      setLoading(false);
    }
  };

  // ── Redirect to login after success ──────────────────────
  if (submitted) {
    return <PendingApprovalScreen registrationData={registrationData} />;
  }

  // ── Subdomain field status UI ───────────────────────────
  const subdomainBorderClass = {
    idle:      'border-slate-300',
    checking:  'border-blue-400',
    available: 'border-emerald-500 ring-1 ring-emerald-200',
    taken:     'border-red-400 ring-1 ring-red-100',
    invalid:   'border-red-400 ring-1 ring-red-100',
  }[subdomainStatus] || 'border-slate-300';

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-slate-50 font-sans">

      {/* ── LEFT: Marketing Panel ────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-white border-r border-slate-200">
        <div>
          <div className="flex items-center gap-3 text-blue-600 font-bold text-2xl mb-16">
            <Building2 className="w-8 h-8" />
            <span>SmartSOC</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6">
            Smart Society <br /> Management Platform
          </h1>
          <p className="text-lg text-slate-500 mb-12 max-w-md">
            Manage your society digitally with visitor management, maintenance collection, voting system, event management and more.
          </p>

          <div className="grid gap-6">
            <FeatureItem icon={ShieldCheck}     text="Gate visitor management" />
            <FeatureItem icon={Activity}         text="Maintenance collection" />
            <FeatureItem icon={LayoutDashboard}  text="Society voting system" />
            <FeatureItem icon={Building}         text="Event management" />
            <FeatureItem icon={MailOpen}         text="Notice board" />
            <FeatureItem icon={Trees}            text="Photo gallery" />
            <FeatureItem icon={MapPin}           text="Plot booking system" />
          </div>
        </div>

        <div className="text-sm text-slate-400 mt-12">
          © {new Date().getFullYear()} SmartSOC Platforms Inc. · {MAIN_DOMAIN}
        </div>
      </div>

      {/* ── RIGHT: Form ──────────────────────────────────── */}
      <div className="flex items-start justify-center p-6 lg:p-12 bg-slate-50/50 overflow-y-auto">
        <div className="w-full max-w-[480px] bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Register Your Society</h2>
            <p className="text-sm text-slate-500 mt-1">Get started with a smarter way to manage.</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm mb-6 border border-red-100 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">

            {/* ── SECTION: Society Information ─────────────── */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-2">
                <Building className="w-4 h-4" /> Society Information
              </h3>

              <FormInput
                label="Society Name"
                name="society_name"
                value={formData.society_name}
                onChange={handleInputChange}
                placeholder="e.g. Green Park Residency"
                required
              />

              {/* Subdomain Field with live check */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Subdomain
                  <span className="ml-1 text-xs font-normal text-slate-400">(a-z, 0-9, hyphens · 3–50 chars)</span>
                </label>
                <div className={`flex rounded-md shadow-sm border transition-all ${subdomainBorderClass}`}>
                  <input
                    type="text"
                    name="subdomain"
                    required
                    value={formData.subdomain}
                    onChange={handleInputChange}
                    className="flex-1 min-w-0 px-3 py-2 rounded-l-md sm:text-sm bg-transparent focus:outline-none text-slate-900 placeholder:text-slate-400"
                    placeholder="greenpark"
                  />
                  <span className="inline-flex items-center px-3 rounded-r-md bg-slate-50 text-slate-500 sm:text-sm border-l border-slate-200 whitespace-nowrap">
                    .{MAIN_DOMAIN}
                  </span>
                </div>

                {/* Status indicator */}
                {subdomainStatus === 'checking' && (
                  <p className="text-xs text-blue-500 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Checking availability…
                  </p>
                )}
                {subdomainStatus === 'available' && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3 h-3" /> {subdomainMessage}
                  </p>
                )}
                {(subdomainStatus === 'taken' || subdomainStatus === 'invalid') && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {subdomainMessage}
                  </p>
                )}

                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-slate-500 mb-1.5 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-blue-400" /> Try one of these:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => applySuggestion(s)}
                          className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full hover:bg-blue-100 transition-colors font-medium flex items-center gap-1"
                        >
                          <ChevronRight className="w-2.5 h-2.5" /> {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormSelect
                  label="City"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  options={['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Pune', 'Ahmedabad', 'Surat', 'Other']}
                />
                <FormSelect
                  label="Society Type"
                  name="society_type"
                  value={formData.society_type}
                  onChange={handleInputChange}
                  options={['Apartment', 'Plot Scheme', 'Villa Society', 'Mixed Society']}
                />
              </div>

              <FormInput
                label="Total Flats / Plots"
                name="total_units"
                type="number"
                value={formData.total_units}
                onChange={handleInputChange}
                placeholder="100"
                required
              />
            </div>

            <hr className="border-slate-100" />

            {/* ── SECTION: Admin Information ───────────────── */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4" /> Admin Information
              </h3>

              <FormInput
                label="Admin Full Name"
                name="admin_name"
                value={formData.admin_name}
                onChange={handleInputChange}
                placeholder="John Doe"
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="Admin Email"
                  name="admin_email"
                  type="email"
                  value={formData.admin_email}
                  onChange={handleInputChange}
                  placeholder="admin@society.com"
                  required
                />
                <FormInput
                  label="Mobile Number"
                  name="mobile"
                  type="tel"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  placeholder="9876543210"
                  required
                />
              </div>

              <div className="space-y-2">
                <FormInput
                  label="Password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  required
                />
                {formData.password && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 flex gap-1 h-1.5">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`flex-1 rounded-full ${passwordStrength >= level ? getStrengthColor() : 'bg-slate-200'}`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-slate-500 font-medium whitespace-nowrap w-24">
                      {['Weak', 'Fair', 'Good', 'Strong', 'Excellent'][passwordStrength - 1] || 'Weak'}
                    </span>
                  </div>
                )}
              </div>

              <FormInput
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="••••••••"
                required
              />
            </div>

            <hr className="border-slate-100" />

            {/* ── SECTION: Plan Selection ───────────────────── */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
                Select a Plan
              </h3>
              <div className="grid gap-3">
                <PlanCard
                  title="Starter Plan"
                  price="₹999"
                  features={['Up to 50 Units', 'Gate Visitor Management', 'Notice Board']}
                  selected={formData.plan === 'Starter Plan'}
                  onClick={() => handlePlanSelect('Starter Plan')}
                />
                <PlanCard
                  title="Professional Plan"
                  price="₹2,499"
                  features={['Up to 200 Units', 'Maintenance Collection', 'Society Voting']}
                  selected={formData.plan === 'Professional Plan'}
                  onClick={() => handlePlanSelect('Professional Plan')}
                />
                <PlanCard
                  title="Enterprise Plan"
                  price="₹7,999"
                  features={['Unlimited Units', 'All Features', 'Priority Support']}
                  selected={formData.plan === 'Enterprise Plan'}
                  onClick={() => handlePlanSelect('Enterprise Plan')}
                />
              </div>
            </div>

            {/* ── Submit ───────────────────────────────────── */}
            <button
              type="submit"
              disabled={loading || subdomainStatus === 'checking' || subdomainStatus === 'taken'}
              className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  Submitting...
                </>
              ) : (
                'Submit Registration'
              )}
            </button>

            <p className="text-center text-xs text-slate-500">
              By registering, you agree to our Terms of Service and Privacy Policy.
              Your society will be active after admin approval.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
