const pool = require('../database/db'); // Master DB pool
const { getTenantConnection } = require('../services/tenantManager');

/**
 * Tenant Resolver Middleware
 * Identifies the society by subdomain, enforces approval status,
 * and attaches the correct DB connection to the request.
 */
const tenantResolver = async (req, res, next) => {
  // Use x-forwarded-host if available (from proxy), otherwise req.hostname
  const hostname = req.headers['x-forwarded-host'] || req.hostname;
  const mainDomain = process.env.MAIN_DOMAIN || 'automytee.in';

  console.log(`[TenantResolver] Resolving for host: ${hostname}`);

  // 1. Skip resolution for main domain, localhost, or Vercel deployments
  if (
    hostname === mainDomain ||
    hostname === 'localhost' ||
    hostname.includes('localhost') ||
    hostname.endsWith('.vercel.app')
  ) {
    return next();
  }

  // 2. Extract subdomain (e.g. greenpark.automytee.in → greenpark)
  const parts = hostname.split('.');
  const subdomain = parts[0];

  // Ignore common non-tenant prefixes
  if (!subdomain || subdomain === 'www') {
    return next();
  }

  try {
    // 3. Find approved society in master DB
    //    Only societies with status = 'approved' are allowed access
    const [societies] = await pool.query(
      `SELECT id, name, database_name, status
       FROM societies
       WHERE subdomain = ?`,
      [subdomain]
    );

    // 4. Not found at all
    if (societies.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Society Not Found',
        error: `The subdomain "${subdomain}" is not registered on this platform.`
      });
    }

    const society = societies[0];

    // 5. Found but not yet approved
    if (society.status === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Society Not Activated',
        error: 'Your society registration is pending admin approval. Please check back later.'
      });
    }

    // 6. Rejected
    if (society.status === 'rejected') {
      return res.status(403).json({
        success: false,
        message: 'Society Rejected',
        error: 'This society registration was not approved. Please contact support.'
      });
    }

    // 7. Approved — resolve dynamic DB connection
    if (!society.database_name) {
      return res.status(500).json({
        success: false,
        message: 'Configuration Error',
        error: 'Approved society has no database assigned. Please contact support.'
      });
    }

    const tenantDB = await getTenantConnection(society.database_name);

    // 8. Attach tenant context to request
    req.tenant = {
      id: society.id,
      name: society.name,
      dbName: society.database_name,
      subdomain
    };
    req.tenantDB = tenantDB;

    next();
  } catch (error) {
    console.error('[TenantResolver] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error resolving tenant.'
    });
  }
};

module.exports = tenantResolver;
