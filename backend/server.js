const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const sse   = require('./services/sseManager');
const cache = require('./services/cacheService');
const dashCtrl = require('./controllers/dashboardController');

const app = express();
const PORT = process.env.PORT || 5000;
const BASE_DOMAIN = process.env.BASE_DOMAIN || process.env.MAIN_DOMAIN || 'automytee.in';

app.set('trust proxy', 1); // Required for rate-limit + correct IP behind Vercel/proxies

// ── Production-Safe CORS ─────────────────────────────────────────
const allowedOrigins = [
  `https://${BASE_DOMAIN}`,
  `https://www.${BASE_DOMAIN}`,
  /^https:\/\/[a-z0-9-]+\.automytee\.in$/,   // *.automytee.in subdomains
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/,      // *.vercel.app deployments
  /^http:\/\/localhost(:\d+)?$/,               // local dev (any port)
  /^http:\/\/[a-z0-9-]+\.localhost(:\d+)?$/,  // subdomain.localhost dev
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, mobile apps, Vercel SSR)
    if (!origin) return callback(null, true);
    const allowed = allowedOrigins.some((o) =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );
    if (allowed) return callback(null, true);
    console.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 'Authorization',
    'X-Master-Secret', 'X-Forwarded-Host',
    'X-Requested-With'
  ],
}));

// Handle OPTIONS preflight consistently
// options preflight is handled by app.use(cors) above

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

const societyRoutes   = require('./routes/society');
const authRoutes      = require('./routes/authRoutes');
const tenantRoutes    = require('./routes/tenant');
const dashboardRoutes = require('./routes/dashboardRoutes');
const adminRoutes     = require('./routes/adminRoutes');
const masterRoutes    = require('./routes/masterRoutes');
const memberRoutes    = require('./routes/memberRoutes');
const publicRoutes    = require('./routes/publicRoutes');
const staffRoutes     = require('./routes/staffRoutes');
const gatePassRoutes  = require('./routes/gatePassRoutes'); // Import Gate Pass Routes
const maintenanceRoutes = require('./routes/maintenanceRoutes');

const authenticateToken = require('./middleware/auth');
const tenantResolver    = require('./middleware/tenantResolver');

const { initMasterDB } = require('./database/init');
const startGatePassCron = require('./services/gatePassCron');
const startMaintenanceCron = require('./services/maintenanceCron');

// Initialize master database schema ONLY if not running in production serverless environments
// Running this during Vercel cold-starts severely slows down the API and causes deadlocks!
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  initMasterDB().catch(err => console.error('[Boot] DB init warning:', err.message));
  startGatePassCron();
  startMaintenanceCron();
}

// Apply tenant resolution globally (before all routes)
app.use(tenantResolver);

// ── API Routes ────────────────────────────────────────────────────
app.use('/api/society',    societyRoutes);
app.use('/api/auth',       authRoutes);
app.use('/api/tenant',     tenantRoutes);
app.use('/api/dashboard',  dashboardRoutes);
app.use('/api/admin',      adminRoutes);
app.use('/api/master',     masterRoutes);
app.use('/api/member',     memberRoutes);
app.use('/api/public',     publicRoutes);
app.use('/api/staff',      staffRoutes);    // Staff auth + operations
app.use('/api/gatepass',   gatePassRoutes); // Gate Pass Operations
app.use('/api/maintenance', maintenanceRoutes);

// ── SSE Stream (no auth middleware — token verified inside controller) ────────
app.get('/api/stream/dashboard', dashCtrl.streamDashboard);

// ── Post-mutation cache invalidation + SSE push ───────────────────────────────
// After any successful write to maintenance or ads, we:
//  1. Invalidate affected cache keys for this tenant
//  2. Push a lightweight SSE update to connected dashboards
app.use((req, res, next) => {
  const origJson = res.json.bind(res);
  res.json = function(body) {
    // Only act on successful mutations
    if (body?.success && ['POST','PUT','PATCH','DELETE'].includes(req.method)) {
      const tenantKey = req.tenant?.dbName || 'default';
      const url = req.originalUrl;

      if (url.includes('/api/maintenance')) {
        cache.invalidatePrefix(`${tenantKey}_maint`);
        cache.invalidate(`${tenantKey}_stats`);
        // Push a maintenance update event — the frontend only refreshes that section
        setImmediate(() => sse.emit(tenantKey, 'maintenance', { ts: Date.now() }));
        setImmediate(() => sse.emit(tenantKey, 'stats',       { ts: Date.now() }));
      }

      if (url.includes('/api/admin/ads') || url.includes('/api/ads')) {
        cache.invalidate(`${tenantKey}_ads`);
        cache.invalidate(`${tenantKey}_analytics`);
        setImmediate(() => sse.emit(tenantKey, 'ads',       { ts: Date.now() }));
        setImmediate(() => sse.emit(tenantKey, 'analytics', { ts: Date.now() }));
      }

      if (url.includes('/api/admin/flats') || url.includes('/api/admin/members')) {
        cache.invalidate(`${tenantKey}_stats`);
        setImmediate(() => sse.emit(tenantKey, 'stats', { ts: Date.now() }));
      }
    }
    return origJson(body);
  };
  next();
});


// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', platform: 'SmartSOC API v2.0', domain: BASE_DOMAIN });
});

// Global error handler
app.use((err, req, res, next) => {
  if (err.message && err.message.startsWith('CORS')) {
    return res.status(403).json({ success: false, message: err.message });
  }
  
  console.error('[Unhandled Error]:', err);
  
  // Provide more info if not in production or for specific debugging
  const isProd = process.env.NODE_ENV === 'production';
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error.',
    error: isProd ? 'A system error occurred. Please contact support.' : (err.message || String(err)),
    stack: isProd ? undefined : err.stack
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`   Base Domain : ${BASE_DOMAIN}`);
    console.log(`   Wildcard    : *.${BASE_DOMAIN}`);
  });
}

module.exports = app;

