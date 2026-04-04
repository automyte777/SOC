const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const rateLimit = require('express-rate-limit');

// Rate limiting for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login requests per windowMs
  message: { 
    success: false, 
    message: 'Too many login attempts, please try again after 15 minutes' 
  }
});

// POST /api/auth/member-signup
router.post('/member-signup', authController.memberSignup);

// POST /api/auth/login
router.post('/login', loginLimiter, authController.login);

// POST /api/auth/reset-dev  ← ONE-TIME TOOL: remove after use
// Used to reset a user password via the Vercel API
const resetRouter = require('../reset_password_tool');
router.use(resetRouter);

module.exports = router;
