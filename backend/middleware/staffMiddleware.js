/**
 * staffMiddleware.js
 * JWT authentication middleware specifically for staff routes.
 * Staff tokens have is_staff = true and staff_id in the payload.
 * Staff CANNOT access secretary/resident routes.
 */

const jwt   = require('jsonwebtoken');
const pool  = require('../database/db');
const { getTenantConnection } = require('../services/tenantManager');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_high_entropy_2025';

/**
 * authenticateStaff
 * Verifies JWT, ensures is_staff flag is set, and resolves tenantDB.
 */
const authenticateStaff = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token      = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Staff token required.',
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired staff token.',
    });
  }

  if (!decoded.is_staff) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. This endpoint is for staff only.',
    });
  }

  req.staff = decoded;

  // Resolve tenantDB if not already done by tenantResolver
  if (!req.tenantDB && decoded.society_id) {
    try {
      const [societies] = await pool.query(
        'SELECT id, name, database_name, subdomain FROM societies WHERE id = ?',
        [decoded.society_id]
      );
      if (societies.length > 0) {
        const society  = societies[0];
        req.tenantDB   = await getTenantConnection(society.database_name);
        req.tenant     = {
          id:       society.id,
          name:     society.name,
          dbName:   society.database_name,
          subdomain: society.subdomain,
        };
      }
    } catch (error) {
      console.error('[StaffAuth] Failed to resolve tenantDB:', error.message);
    }
  }

  next();
};

/**
 * requireStaffRole(...roles)
 * Middleware to restrict certain staff routes to specific roles.
 * e.g. requireStaffRole('Security') for gate-pass-specific routes.
 */
const requireStaffRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.staff) {
      return res.status(401).json({ success: false, message: 'Staff authentication required.' });
    }
    if (allowedRoles.length === 0 || allowedRoles.includes(req.staff.role)) {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: `Access denied. Required: ${allowedRoles.join(', ')}. Your role: ${req.staff.role}.`,
    });
  };
};

module.exports = { authenticateStaff, requireStaffRole };
