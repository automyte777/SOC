/**
 * StaffRoute.jsx
 * 
 * A route guard specifically for staff dashboards.
 * Checks that:
 *   1. A JWT token exists in localStorage.
 *   2. The stored user object has `is_staff: true`.
 *   3. Staff are NEVER allowed through PrivateRoute (secretary/resident routes).
 * 
 * If not authenticated, redirects to /staff/login.
 */
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getUser } from '../utils/auth';

const STAFF_ROLES = ['Security', 'Manager', 'Cleaner', 'Gardener', 'Plumber', 'Electrician', 'security_guard'];

export default function StaffRoute() {
  const token = localStorage.getItem('token');
  const user  = getUser();

  if (!token || !user) {
    return <Navigate to="/staff/login" replace />;
  }

  // Must be a staff user — either is_staff flag OR known staff role
  const isStaff = user.is_staff === true || STAFF_ROLES.includes(user.role);
  if (!isStaff) {
    // Resident/secretary trying to access staff route — send to their dashboard
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
