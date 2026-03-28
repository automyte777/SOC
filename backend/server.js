const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1); // Fix Express-Rate-Limit crash behind proxy/localhost
app.use(cors());
app.use(express.json());

const societyRoutes   = require('./routes/society');
const authRoutes      = require('./routes/authRoutes');
const tenantRoutes    = require('./routes/tenant');
const dashboardRoutes = require('./routes/dashboardRoutes');
const adminRoutes     = require('./routes/adminRoutes');
const masterRoutes    = require('./routes/masterRoutes');
const memberRoutes    = require('./routes/memberRoutes');
const publicRoutes    = require('./routes/publicRoutes'); // Added publicRoutes require

const authenticateToken = require('./middleware/auth');
const tenantResolver    = require('./middleware/tenantResolver');

const { initMasterDB } = require('./database/init');

// Initialize master database schema & run migrations
initMasterDB();

// Apply tenant resolution globally (before all routes)
app.use(tenantResolver);

// ── API Routes ───────────────────────────────────────────────────
app.use('/api/society',    societyRoutes);    // register + check-subdomain
app.use('/api/auth',       authRoutes);       // login
app.use('/api/tenant',     tenantRoutes);     // tenant-scoped generic data
app.use('/api/dashboard',  dashboardRoutes);  // stats / charts
app.use('/api/admin',      adminRoutes);      // admin CRUD (residents, flats, etc.)
app.use('/api/master',     masterRoutes);     // master admin (approve/reject)
app.use('/api/member',     memberRoutes);     // non-admin role endpoints
app.use('/api/public',     publicRoutes);     // public endpoints without Auth

// Health check
app.get('/', (req, res) => {
  res.send('SmartSOC Multi-Society Management Platform API v2.0');
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`   Domain: ${process.env.MAIN_DOMAIN || 'automytee.in'}`);
});
