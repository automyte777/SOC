const express = require('express');
const router = express.Router();
const societyController = require('../controllers/societyController');
const rateLimit = require('express-rate-limit');

// Rate limiter for registration
const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many signup attempts. Please try again in 15 minutes.' }
});

// GET  /api/society/check-subdomain?name=greenpark
router.get('/check-subdomain', societyController.checkSubdomain.bind(societyController));

// POST /api/society/register
router.post('/register', signupLimiter, (req, res) => societyController.register(req, res));

module.exports = router;
