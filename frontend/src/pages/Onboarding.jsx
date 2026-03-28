import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, Building2 } from 'lucide-react';
import { MAIN_DOMAIN, buildSubdomainUrl, getSubdomainFromHost } from '../utils/domain';

export default function Onboarding() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('registration_result');
      if (stored) setUserData(JSON.parse(stored));
    } catch (e) {}
  }, []);

  const handleGoToDashboard = useCallback(() => {
    const stored = sessionStorage.getItem('registration_result');
    if (!stored) {
      navigate('/login');
      return;
    }

    try {
      const { token, subdomain, user } = JSON.parse(stored);

      if (token) localStorage.setItem('token', token);
      if (user) localStorage.setItem('user', JSON.stringify(user));
      sessionStorage.removeItem('registration_result');

      const currentHostname = window.location.hostname;

      // Production: redirect to society subdomain
      if (subdomain && getSubdomainFromHost() === null && currentHostname !== 'localhost') {
        window.location.href = buildSubdomainUrl(subdomain, '/dashboard');
        return;
      }

      // Development (localhost): go directly to dashboard
      if (subdomain) localStorage.setItem('current_subdomain', subdomain);
      navigate('/dashboard');
    } catch (e) {
      console.error('Onboarding redirect error:', e);
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    if (countdown <= 0) {
      handleGoToDashboard();
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, handleGoToDashboard]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-100 rounded-full blur-[150px] opacity-40" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-purple-100 rounded-full blur-[150px] opacity-40" />
      </div>

      <div className="relative bg-white rounded-3xl shadow-2xl shadow-slate-200 w-full max-w-md p-10 text-center">
        {/* Success Icon */}
        <div className="relative mx-auto mb-6 w-20 h-20">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center animate-pulse-once">
            <CheckCircle className="w-10 h-10 text-emerald-500" strokeWidth={1.5} />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
            <Building2 className="w-3.5 h-3.5 text-white" />
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">
          Welcome Aboard! 🎉
        </h2>
        <p className="text-slate-500 mb-2 text-sm leading-relaxed">
          Your society has been created successfully.
        </p>

        {/* Society Info */}
        {userData?.subdomain && (
          <div className="mb-6 bg-blue-50 rounded-xl px-4 py-3 border border-blue-100">
            <p className="text-xs text-blue-500 font-semibold uppercase tracking-wider mb-1">Your Society URL</p>
            <p className="font-bold text-blue-700 text-sm break-all">
              {userData.subdomain}.{MAIN_DOMAIN}
            </p>
          </div>
        )}

        {/* Steps */}
        <div className="mb-8 text-left space-y-3">
          {[
            { done: true, text: 'Society database created' },
            { done: true, text: 'Admin account configured' },
            { done: true, text: 'Security setup complete' },
            { done: true, text: 'Dashboard ready' },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <span className="text-sm text-slate-600">{step.text}</span>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={handleGoToDashboard}
          className="group relative w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3.5 px-6 rounded-xl font-bold text-sm shadow-lg shadow-blue-100 hover:shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          Go to Dashboard
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Auto-redirect notice */}
        <p className="text-xs text-slate-400 mt-4">
          Redirecting automatically in{' '}
          <span className="font-bold text-blue-500">{countdown}s</span>
          {' '}· <button onClick={() => setCountdown(0)} className="underline hover:text-slate-600 transition-colors">Go now</button>
        </p>
      </div>
    </div>
  );
}
