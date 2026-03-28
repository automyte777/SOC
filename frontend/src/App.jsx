import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Signup from './pages/Signup';
import MemberSignup from './pages/MemberSignup';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import HomeOwnerDashboard from './pages/OwnerDashboard';
import MemberDashboard from './pages/MemberDashboard';
import TenantDashboard from './pages/TenantDashboard';
import MasterAdminDashboard from './pages/MasterAdminDashboard';
import SecurityDashboard from './pages/SecurityDashboard';

import Members from './pages/Members';
import Residents from './pages/Residents';
import Flats from './pages/Flats';
import Visitors from './pages/Visitors';
import Maintenance from './pages/Maintenance';
import Complaints from './pages/Complaints';
import Notices from './pages/Notices';
import Events from './pages/Events';
import Staff from './pages/Staff';
import Parking from './pages/Parking';

import PrivateRoute from './components/PrivateRoute';
import RoleRoute from './components/RoleRoute';

import { getUser } from './utils/auth';
import { getSubdomainFromHost } from './utils/domain';


// Auto-redirect mapping based on role
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
    staff:             '/tenant/dashboard',
    security_guard:    '/security/dashboard',
  };

  const path = roleRedirects[user.role] || '/member/dashboard';
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
        
        {/* Auth Routes */}
        <Route path="/signup" element={<Signup />} />
        <Route path="/signup/member" element={<MemberSignup />} />
        <Route path="/login" element={<Login detectedSubdomain={subdomain} />} />
        <Route path="/onboarding" element={<Onboarding />} />
        
        {/* Master Admin Panel */}
        <Route path="/master-admin" element={<MasterAdminDashboard />} />
        <Route path="/master" element={<Navigate to="/master-admin" />} />
        
        {/* Protected Routes */}
        <Route element={<PrivateRoute />}>
          
          {/* Dashboard route that auto-redirects based on role */}
          <Route path="/dashboard" element={<RoleBasedRedirect />} />

          {/* Admin Routes */}
          {/* Shared Modular Routes (Role-aware pages) */}
          <Route element={<RoleRoute allowedRoles={['society_secretary', 'home_owner', 'home_member', 'tenant']} />}>
            <Route path="/flats" element={<Flats />} />
            <Route path="/visitors" element={<Visitors />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/complaints" element={<Complaints />} />
            <Route path="/notices" element={<Notices />} />
            <Route path="/events" element={<Events />} />
            <Route path="/parking" element={<Parking />} />
          </Route>

          {/* Admin-Only Routes */}
          <Route element={<RoleRoute allowedRoles={['society_secretary']} />}>
            <Route path="/admin/dashboard" element={<Dashboard />} />
            <Route path="/members" element={<Members />} />
            <Route path="/residents" element={<Residents />} />
            <Route path="/staff" element={<Staff />} />
          </Route>

          {/* Owner Dashboard */}
          <Route element={<RoleRoute allowedRoles={['home_owner']} />}>
            <Route path="/owner/dashboard" element={<HomeOwnerDashboard />} />
          </Route>

          {/* Security Routes */}
          <Route element={<RoleRoute allowedRoles={['security_guard']} />}>
            <Route path="/security/dashboard" element={<SecurityDashboard />} />
          </Route>

          {/* Member Dashboard */}
          <Route element={<RoleRoute allowedRoles={['home_member', 'home_owner']} />}>
            <Route path="/member/dashboard" element={<MemberDashboard />} />
          </Route>

          {/* Tenant Dashboard */}
          <Route element={<RoleRoute allowedRoles={['tenant']} />}>
            <Route path="/tenant/dashboard" element={<TenantDashboard />} />
          </Route>
          
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
