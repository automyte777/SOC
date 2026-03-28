import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { hasRole } from '../utils/auth';

/**
 * Ensures the authenticated user has the specified role(s).
 * If not, shows unauthorized message.
 */
const RoleRoute = ({ allowedRoles }) => {
  if (!hasRole(allowedRoles)) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-4xl font-extrabold text-slate-800 mb-4">Unauthorized Access</h1>
        <p className="text-slate-500 max-w-md">
          You don't have permission to view this page. Contact your society secretary if you believe this is an error.
        </p>
      </div>
    );
  }

  return <Outlet />;
};

export default RoleRoute;
