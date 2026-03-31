import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// ── Auth Pages ─────────────────────────────────────────────────────────────
import Signup         from './pages/Signup';
import MemberSignup   from './pages/MemberSignup';
import Login          from './pages/Login';
import Onboarding     from './pages/Onboarding';

// ── Secretary/Admin Pages ──────────────────────────────────────────────────
import Dashboard      from './pages/Dashboard';
import Members        from './pages/Members';
import Residents      from './pages/Residents';
import Flats          from './pages/Flats';
import Visitors       from './pages/Visitors';
import Maintenance    from './pages/Maintenance';
import Complaints     from './pages/Complaints';
import Notices        from './pages/Notices';
import Events         from './pages/Events';
import Staff          from './pages/Staff';
import Parking        from './pages/Parking';
import Reports        from './pages/Reports';
import Settings       from './pages/Settings';
import GatePass       from './pages/GatePass';

// ── Resident Dashboards ────────────────────────────────────────────────────
import HomeOwnerDashboard from './pages/OwnerDashboard';
import MemberDashboard    from './pages/MemberDashboard';
import TenantDashboard    from './pages/TenantDashboard';

// ── Staff Dashboards ───────────────────────────────────────────────────────
import SecurityDashboard  from './pages/SecurityDashboard';
import ManagerDashboard   from './pages/ManagerDashboard';

// ── Master Admin ───────────────────────────────────────────────────────────
import MasterAdminDashboard from './pages/MasterAdminDashboard';

// ── Route Guards ───────────────────────────────────────────────────────────
import PrivateRoute from './components/PrivateRoute';
import RoleRoute    from './components/RoleRoute';
import StaffRoute   from './components/StaffRoute';

import { getUser }              from './utils/auth';
import { getSubdomainFromHost } from './utils/domain';

// ── Role → Dashboard auto-redirect ─────────────────────────────────────────
const RoleBasedRedirect = () => {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;

  const roleRedirects = {
    society_secretary: '/admin/dashboard',
    society_admin:     '/admin/dashboard',
    home_owner:        '/owner/dashboard',
    home_member:       '/member/dashboard',
    tenant:            '/tenant/dashboard',
    resident:          '/member/dashboard',
    // Staff roles
    Security:          '/security/dashboard',
    Manager:           '/manager/dashboard',
    Cleaner:           '/staff/dashboard',
    Gardener:          '/staff/dashboard',
    Plumber:           '/staff/dashboard',
    Electrician:       '/staff/dashboard',
    security_guard:    '/security/dashboard',
  };

  const path = roleRedirects[user.role] || '/login';
  return <Navigate to={path} replace />;
};

function App() {
  const [subdomain, setSubdomain] = useState(null);

  useEffect(() => {
    setSubdomain(getSubdomainFromHost());
  }, []);

  return (
    <Router>
      <Routes>
        {/* Root redirect */}
        <Route
          path="/"
          element={subdomain ? <RoleBasedRedirect /> : <Navigate to="/login" />}
        />

        {/* ── Auth Routes ─────────────────────────────────────────────── */}
        <Route path="/signup"        element={<Signup />} />
        <Route path="/signup/member" element={<MemberSignup />} />
        <Route path="/login"         element={<Login detectedSubdomain={subdomain} />} />
        <Route path="/onboarding"    element={<Onboarding />} />

        {/* ── Master Admin ─────────────────────────────────────────────── */}
        <Route path="/master-admin"  element={<MasterAdminDashboard />} />
        <Route path="/master"        element={<Navigate to="/master-admin" />} />

        {/* ── Resident/Secretary Protected Routes ───────────────────────── */}
        <Route element={<PrivateRoute />}>

          {/* Auto-redirect based on role */}
          <Route path="/dashboard" element={<RoleBasedRedirect />} />

          {/* Shared module routes (accessible to most resident roles) */}
          <Route element={<RoleRoute allowedRoles={['society_secretary', 'home_owner', 'home_member', 'tenant']} />}>
            <Route path="/flats"       element={<Flats />} />
            <Route path="/visitors"    element={<Visitors />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/complaints"  element={<Complaints />} />
            <Route path="/notices"     element={<Notices />} />
            <Route path="/events"      element={<Events />} />
            <Route path="/parking"     element={<Parking />} />
            <Route path="/gatepass"    element={<GatePass />} />
          </Route>

          {/* Secretary-only routes */}
          <Route element={<RoleRoute allowedRoles={['society_secretary']} />}>
            <Route path="/admin/dashboard" element={<Dashboard />} />
            <Route path="/members"         element={<Members />} />
            <Route path="/residents"       element={<Residents />} />
            <Route path="/staff"           element={<Staff />} />
            <Route path="/reports"         element={<Reports />} />
            <Route path="/settings"        element={<Settings />} />
          </Route>

          {/* Home owner dashboard */}
          <Route element={<RoleRoute allowedRoles={['home_owner']} />}>
            <Route path="/owner/dashboard"  element={<HomeOwnerDashboard />} />
          </Route>

          {/* Member dashboard */}
          <Route element={<RoleRoute allowedRoles={['home_member', 'home_owner']} />}>
            <Route path="/member/dashboard" element={<MemberDashboard />} />
          </Route>

          {/* Tenant dashboard */}
          <Route element={<RoleRoute allowedRoles={['tenant']} />}>
            <Route path="/tenant/dashboard" element={<TenantDashboard />} />
          </Route>

        </Route>

        {/* ── Staff Protected Routes (separate JWT) ─────────────────────── */}
        <Route element={<StaffRoute />}>
          {/* Security role */}
          <Route path="/security/dashboard" element={<SecurityDashboard />} />

          {/* Manager role */}
          <Route path="/manager/dashboard"  element={<ManagerDashboard />} />

          {/* Generic staff dashboard (Cleaner, Plumber, etc.) */}
          <Route path="/staff/dashboard"    element={<SecurityDashboard />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
