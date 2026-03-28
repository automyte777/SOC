/**
 * Role-Based Access Control Middleware
 *
 * Roles in the system:
 *   society_secretary  → full admin (was society_admin)
 *   home_owner         → owner-level read access
 *   home_member        → limited member read access
 *   tenant             → minimal access (complaints, visitors)
 *
 * Legacy role aliases are also supported for backward compatibility.
 */

const ROLE_HIERARCHY = {
  society_secretary: 4,
  home_owner:        3,
  home_member:       2,
  tenant:            1,
  // Legacy aliases
  society_admin:     4,  // same as society_secretary
  resident:          2,  // same as home_member
  staff:             1,
};

/**
 * requireRole(...allowedRoles)
 * Returns a middleware that allows access only to users whose role
 * is in the provided list. Also handles legacy role aliases.
 *
 * Usage:
 *   router.get('/something', authenticateToken, requireRole('society_secretary'));
 *   router.get('/shared',    authenticateToken, requireRole('society_secretary', 'home_owner'));
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const userRole = req.user.role;

    // Expand legacy role names to their current equivalents
    const normalised = {
      society_admin: 'society_secretary',
      resident:      'home_member',
      staff:         'tenant',
    }[userRole] || userRole;

    if (allowedRoles.includes(normalised) || allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${userRole}.`
    });
  };
};

// ── Convenience shorthands (backward compat) ──────────────────
const isAdmin  = requireRole('society_secretary', 'society_admin');
const isMember = requireRole('society_secretary', 'home_owner', 'home_member', 'tenant', 'society_admin', 'resident', 'staff');

module.exports = { requireRole, isAdmin, isMember };
