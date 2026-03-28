// src/utils/auth.js

export const getUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    return null;
  }
};

export const getToken = () => localStorage.getItem('token');

/**
 * Checks if current user has the required role.
 * Maps legacy roles to new roles for compatibility.
 */
export const hasRole = (allowedRoles) => {
  const user = getUser();
  if (!user) return false;

  const userRole = user.role;
  const normalisedRole = {
    society_admin: 'society_secretary',
    resident:      'home_member',
    staff:         'tenant',
  }[userRole] || userRole;

  return allowedRoles.includes(normalisedRole) || allowedRoles.includes(userRole);
};
