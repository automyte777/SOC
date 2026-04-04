const jwt = require('jsonwebtoken');
const pool = require('../database/db');
const { getTenantConnection } = require('../services/tenantManager');

/**
 * Authentication Middleware
 * Verifies the JWT token and attaches the user payload to the request.
 * Also resolves req.tenantDB from the JWT's society_id if not already set by tenantResolver.
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access denied. No token provided.' 
    });
  }

  let decoded;
  try {
    if (!process.env.JWT_SECRET) {
      console.error('[Auth] CRITICAL: JWT_SECRET is not set in environment variables!');
      return res.status(500).json({ success: false, message: 'Server misconfiguration: JWT secret missing.' });
    }
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid or expired token.' 
    });
  }

  // Attach the verified user details to the request
  req.user = decoded;

  // If tenantDB is already set by tenantResolver middleware, skip resolution
  if (req.tenantDB) {
    return next();
  }

  // Resolve tenantDB from JWT's society_id (for dev/localhost or direct API calls)
  if (decoded.society_id) {
    try {
      const [societies] = await pool.query(
        'SELECT id, name, database_name, subdomain FROM societies WHERE id = ?',
        [decoded.society_id]
      );

      if (societies.length > 0) {
        const society = societies[0];
        req.tenantDB = await getTenantConnection(society.database_name);
        req.tenant = {
          id: society.id,
          name: society.name,
          dbName: society.database_name,
          subdomain: society.subdomain
        };
      }
    } catch (error) {
      console.error('[Auth Middleware] Failed to resolve tenantDB from JWT:', error);
      // Don't block the request — let controller handle missing tenantDB
    }
  }

  next();
};

module.exports = authenticateToken;
module.exports.requireAuth = authenticateToken;
