const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authenticateToken = require('../middleware/auth');

// All dashboard routes are protected
router.use(authenticateToken);

// GET /api/dashboard/stats
router.get('/stats', dashboardController.getStats);

// GET /api/dashboard/activity
router.get('/activity', dashboardController.getActivity);

// GET /api/dashboard/charts
router.get('/charts', dashboardController.getChartData);

module.exports = router;
