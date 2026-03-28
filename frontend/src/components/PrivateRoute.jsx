import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getToken } from '../utils/auth';

/**
 * Ensures user is authenticated.
 * If not, redirects to /login.
 */
const PrivateRoute = () => {
  const token = getToken();
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;
