const pool = require('../database/db'); // Master DB pool
const { getTenantConnection } = require('../services/tenantManager');

/**
 * Tenant Resolver Middleware
 * Identifies the society by subdomain, enforces approval status,
 * and attaches the correct DB connection to the request.
 */
const tenantResolver = async (req, res, next) => {
  try {
    // 1. Identification
    const hostname = req.headers['x-forwarded-host'] || req.hostname;
    const mainDomain = process.env.MAIN_DOMAIN || 'automytee.in';

    console.log(`[TenantResolver] Resolving: ${hostname} (Path: ${req.path})`);

    // 2. Skip resolution for system domains
    if (
      hostname === mainDomain ||
      hostname === 'localhost' ||
      hostname.includes('localhost') ||
      hostname.endsWith('.vercel.app') ||
      hostname.endsWith('.am7.in') ||  // additional known system domain
      req.path.startsWith('/api/master') // Shared master admin routes
    ) {
      return next();
    }

    // 3. Extract subdomain
    const parts = hostname.split('.');
    if (parts.length < 2) return next();
    const subdomain = parts[0];

    if (!subdomain || subdomain === 'www') {
      return next();
    }

    // 4. Resolve from DB
    const [societies] = await pool.query(
      `SELECT id, name, database_name, status FROM societies WHERE subdomain = ?`,
      [subdomain]
    );

    if (societies.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Society Not Found',
        error: `The subdomain "${subdomain}" is not registered.`
      });
    }

    const society = societies[0];

    // 5. Status Checks
    if (society.status !== 'approved') {
      const statusMsg = society.status === 'pending' 
        ? 'Account pending approval.' 
        : 'Account suspended.';
      return res.status(403).json({
        success: false,
        message: 'Access Denied',
        error: statusMsg
      });
    }

    if (!society.database_name) {
      return res.status(500).json({
        success: false,
        message: 'Configuration Error',
        error: 'No database assigned to this approved society.'
      });
    }

    // 6. Establish Connection
    const tenantDB = await getTenantConnection(society.database_name);

    req.tenant = {
      id: society.id,
      name: society.name,
      dbName: society.database_name,
      subdomain
    };
    req.tenantDB = tenantDB;

    next();
  } catch (error) {
    console.error('[TenantResolver CRITICAL ERROR]:', error);
    res.status(500).json({
      success: false,
      message: 'Platform Error',
      error: 'We encountered a problem identifying your society. Please try again later.'
    });
  }
};

module.exports = tenantResolver;
