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
// GET /api/master/ads/analytics?ad_id=&society_id=&from=&to=
router.get('/ads/analytics', adsCtrl.getAdAnalytics);


module.exports = router;
