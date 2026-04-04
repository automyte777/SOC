// Vercel Serverless Entry Point
// This file is the bridge between Vercel's /api/ routing and your Express app.

let app;
try {
  app = require('../backend/server');
} catch (err) {
  // If the backend fails to load, return a clear error (helps debug deployment issues)
  console.error('[API Bootstrap Error]:', err.message, err.stack);
  app = (req, res) => {
    res.status(500).json({
      success: false,
      message: 'Backend failed to initialize',
      error: err.message,
      hint: 'Check Vercel function logs for full stack trace'
    });
  };
}

module.exports = app;
