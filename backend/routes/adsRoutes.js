const express = require('express');
const router  = express.Router();
const adsCtrl = require('../controllers/adsController');

// ── Analytics (admin) — must come BEFORE /:id to avoid shadowing ───────────
router.get('/ads/analytics/overview',  adsCtrl.getAnalyticsOverview);
router.get('/ads/analytics/per-ad',    adsCtrl.getPerAdAnalytics);
router.get('/ads/analytics/society',   adsCtrl.getSocietyAnalytics);

// ── GET All Ads (admin view) ───────────────────────────────────────────────
router.get('/ads',              adsCtrl.getAllAds);

// ── POST Create Ad ─────────────────────────────────────────────────────────
router.post('/ads',             adsCtrl.createAd);

// ── PUT Update Ad ──────────────────────────────────────────────────────────
router.put('/ads/:id',          adsCtrl.updateAd);

// ── DELETE Ad ──────────────────────────────────────────────────────────────
router.delete('/ads/:id',       adsCtrl.deleteAd);

// ── PATCH Toggle Active ────────────────────────────────────────────────────
router.patch('/ads/:id/toggle', adsCtrl.toggleAdStatus);

// ── GET Ad Analytics (admin) ───────────────────────────────────────────────
router.get('/ads/analytics', adsCtrl.getAdAnalytics);

// ── MONETIZATION ───────────────────────────────────────────────────────────
// PATCH /api/master/ads/:id/payment  — mark paid/pending
router.patch('/ads/:id/payment', adsCtrl.updatePaymentStatus);

// GET /api/master/ads/revenue/overview
router.get('/ads/revenue/overview', adsCtrl.getRevenueOverview);

// GET /api/master/ads/revenue/monthly
router.get('/ads/revenue/monthly', adsCtrl.getRevenueByMonth);

// GET /api/master/ads/revenue/society
router.get('/ads/revenue/society', adsCtrl.getRevenueBySociety);


module.exports = router;
