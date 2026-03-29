import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getToken, getUser } from '../utils/auth';

const STAFF_ROLES = ['Security', 'Manager', 'Cleaner', 'Gardener', 'Plumber', 'Electrician', 'security_guard'];

/**
 * Ensures user is authenticated AND is NOT a staff member.
 * Staff have their own StaffRoute guard and dedicated pages.
 * If no token → /login
 * If staff token → redirect to their dashboard
 */
const PrivateRoute = () => {
  const token = getToken();
  const user  = getUser();

  if (!token) return <Navigate to="/login" replace />;

  // Block staff from accessing resident/secretary routes
  if (user && (user.is_staff === true || STAFF_ROLES.includes(user.role))) {
    const staffDash = {
      Security:    '/security/dashboard',
      Manager:     '/manager/dashboard',
      security_guard: '/security/dashboard',
    }[user.role] || '/staff/dashboard';
    return <Navigate to={staffDash} replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;
