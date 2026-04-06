/**
 * AdBanner — Resident-facing advertisement widget.
 *
 * - Fetches active ads via GET /api/public/ads/active?society_id=<id>
 * - Shows max 1 ad on mobile, auto-rotates every 6s on desktop
 * - Placed between Notice Board and Maintenance sections
 * - No popups, no UI blocking, lazy image loading
 * - CTA → open link | Phone → call + WhatsApp buttons
 *
 * Analytics:
 * - Impression tracked via IntersectionObserver (once per session per ad)
 * - Clicks tracked on CTA / Call / WhatsApp buttons
 * - All tracking is async, fire-and-forget, fail-safe
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { ExternalLink, Phone, MessageCircle, ChevronLeft, ChevronRight, X, Megaphone } from 'lucide-react';

/* ── Cloudinary optimized URL ───────────────────────────────────────────── */
const optimizeCloudinaryUrl = (url) => {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', '/upload/w_800,q_auto,f_auto/');
};

/* ── WhatsApp link builder ─────────────────────────────────────────────── */
const whatsappLink = (phone, title) => {
  const num = phone.replace(/\D/g, '');
  const msg = encodeURIComponent(`Hi, I saw your ad "${title}" on our society app.`);
  return `https://wa.me/${num}?text=${msg}`;
};

/* ── Device detection ──────────────────────────────────────────────────── */
const getDeviceType = () =>
  typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : 'desktop';

/* ── Session storage key for impression dedup ──────────────────────────── */
const IMPRESSION_KEY = (adId) => `ad_imp_${adId}`;

/* ── Pending call tracker (avoid double-firing on re-render) ───────────── */
const _pendingTrack = new Set();

/* ── Debounce helper ───────────────────────────────────────────────────── */
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ── Core fire-and-forget track function ───────────────────────────────── */
const fireTrack = async ({ adId, eventType, societyId }) => {
  if (!adId || !eventType || !societyId) return;

  const dedupeKey = `${adId}|${eventType}`;
  if (_pendingTrack.has(dedupeKey)) return;
  _pendingTrack.add(dedupeKey);

  try {
    await axios.post('/api/public/ads/track', {
      ad_id:       adId,
      event_type:  eventType,
      society_id:  societyId,
      device_type: getDeviceType(),
    }, { timeout: 5000 });
  } catch (_) {
    // Silently swallow — analytics failure must never break UI
  } finally {
    // Remove from pending after a short window so re-fires on new ads work
    setTimeout(() => _pendingTrack.delete(dedupeKey), 500);
  }
};

/* ── Debounced impression tracker ──────────────────────────────────────── */
const debouncedImpression = debounce(({ adId, societyId }) => {
  // Session-level dedup: only one impression per ad per browser tab
  if (sessionStorage.getItem(IMPRESSION_KEY(adId))) return;
  sessionStorage.setItem(IMPRESSION_KEY(adId), '1');
  fireTrack({ adId, eventType: 'impression', societyId });
}, 300);

/* ══════════════════════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════════════════════ */

export default function AdBanner({ societyId, isMobile = false }) {
  const [ads,         setAds]         = useState([]);
  const [current,     setCurrent]     = useState(0);
  const [dismissed,   setDismissed]   = useState(false);
  const [imgLoaded,   setImgLoaded]   = useState(false);
  const [fetched,     setFetched]     = useState(false);
  const intervalRef   = useRef(null);
  const observerRef   = useRef(null);
  const cardRef       = useRef(null);

  /* ── Fetch ads (once, cached via sessionStorage) ─────────────────────── */
  useEffect(() => {
    if (!societyId) return;
    const cacheKey = `ads_cache_${societyId}`;
    const cached   = sessionStorage.getItem(cacheKey);

    if (cached) {
      try {
        const { data, ts } = JSON.parse(cached);
        // Cache valid for 5 minutes
        if (Date.now() - ts < 5 * 60 * 1000 && Array.isArray(data)) {
          setAds(data);
          setFetched(true);
          return;
        }
      } catch (_) {}
    }

    axios.get(`/api/public/ads/active?society_id=${societyId}`)
      .then(res => {
        const data = res.data?.ads || [];
        setAds(data);
        setFetched(true);
        sessionStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() }));
      })
      .catch(() => setFetched(true)); // fail silently
  }, [societyId]);

  /* ── IntersectionObserver — fires impression when card enters viewport ── */
  useEffect(() => {
    if (!fetched || ads.length === 0 || dismissed || !cardRef.current) return;

    // Disconnect previous observer if any
    if (observerRef.current) observerRef.current.disconnect();

    const ad = ads[isMobile ? 0 : current];
    if (!ad) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            debouncedImpression({ adId: ad.id, societyId });
          }
        });
      },
      { threshold: 0.5 } // 50% visibility before counting
    );

    observerRef.current.observe(cardRef.current);

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [fetched, ads, current, dismissed, isMobile, societyId]);

  /* ── Auto-rotate every 6s (desktop only, multiple ads) ──────────────── */
  const startRotation = useCallback(() => {
    if (isMobile || ads.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % ads.length);
      setImgLoaded(false);
    }, 6000);
  }, [isMobile, ads.length]);

  useEffect(() => {
    startRotation();
    return () => clearInterval(intervalRef.current);
  }, [startRotation]);

  const goTo = (idx) => {
    clearInterval(intervalRef.current);
    setCurrent(idx);
    setImgLoaded(false);
    startRotation();
  };

  const prev = () => goTo((current - 1 + ads.length) % ads.length);
  const next = () => goTo((current + 1) % ads.length);

  /* ── Click tracker ────────────────────────────────────────────────────── */
  const handleClick = useCallback((ad) => {
    fireTrack({ adId: ad.id, eventType: 'click', societyId });
  }, [societyId]);

  /* ── Nothing to show ─────────────────────────────────────────────────── */
  if (!fetched || ads.length === 0 || dismissed) return null;

  // On mobile: show only 1 ad (the first one)
  const displayAds = isMobile ? [ads[0]] : ads;
  const ad = displayAds[isMobile ? 0 : current];
  if (!ad) return null;

  const hasImage  = Boolean(ad.image_url);
  const hasCta    = Boolean(ad.cta_link);
  const hasPhone  = Boolean(ad.phone_number);
  const showNav   = !isMobile && displayAds.length > 1;

  return (
    <>
      <style>{AD_BANNER_STYLES}</style>

      <div className={`adb-wrap ${isMobile ? 'adb-mobile' : 'adb-desktop'}`} role="complementary" aria-label="Advertisement">

        {/* Label */}
        <div className="adb-label-row">
          <span className="adb-label"><Megaphone className="adb-label-icon" /> Sponsored</span>
          <button className="adb-dismiss" onClick={() => setDismissed(true)} aria-label="Dismiss ad">
            <X className="adb-dismiss-icon" />
          </button>
        </div>

        {/* Card — ref attached for IntersectionObserver */}
        <div
          ref={cardRef}
          className={`adb-card ${hasImage ? 'adb-has-image' : 'adb-no-image'}`}
        >

          {/* Image */}
          {hasImage && (
            <div className="adb-img-wrap">
              <img
                src={optimizeCloudinaryUrl(ad.image_url)}
                alt={ad.title}
                loading="lazy"
                onLoad={() => setImgLoaded(true)}
                className={`adb-img ${imgLoaded ? 'adb-img-loaded' : 'adb-img-loading'}`}
              />
              {!imgLoaded && <div className="adb-img-shimmer" />}
            </div>
          )}

          {/* Body */}
          <div className="adb-body">
            <h4 className="adb-title">{ad.title}</h4>
            <p className="adb-desc">{ad.description}</p>

            {/* Actions */}
            <div className="adb-actions">
              {hasCta && (
                <a
                  href={ad.cta_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="adb-btn adb-btn-cta"
                  onClick={() => handleClick(ad)}
                >
                  <ExternalLink className="adb-btn-icon" />
                  Learn More
                </a>
              )}
              {!hasCta && hasPhone && (
                <>
                  <a
                    href={`tel:${ad.phone_number}`}
                    className="adb-btn adb-btn-call"
                    onClick={() => handleClick(ad)}
                  >
                    <Phone className="adb-btn-icon" />
                    Call
                  </a>
                  <a
                    href={whatsappLink(ad.phone_number, ad.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="adb-btn adb-btn-wa"
                    onClick={() => handleClick(ad)}
                  >
                    <MessageCircle className="adb-btn-icon" />
                    WhatsApp
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Desktop navigation arrows */}
          {showNav && (
            <>
              <button className="adb-nav adb-nav-prev" onClick={prev} aria-label="Previous ad">
                <ChevronLeft className="adb-nav-icon" />
              </button>
              <button className="adb-nav adb-nav-next" onClick={next} aria-label="Next ad">
                <ChevronRight className="adb-nav-icon" />
              </button>
            </>
          )}
        </div>

        {/* Dots indicator (desktop, multiple ads) */}
        {showNav && (
          <div className="adb-dots">
            {displayAds.map((_, i) => (
              <button
                key={i}
                className={`adb-dot ${i === current ? 'adb-dot-active' : ''}`}
                onClick={() => goTo(i)}
                aria-label={`Ad ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   STYLES
══════════════════════════════════════════════════════════════════════════ */
const AD_BANNER_STYLES = `
/* Wrapper */
.adb-wrap { display:flex; flex-direction:column; gap:.4rem; }
.adb-mobile  { /* inherits flex col */ }
.adb-desktop { /* inherits flex col */ }

/* Label row */
.adb-label-row  { display:flex; align-items:center; justify-content:space-between; }
.adb-label      { display:flex; align-items:center; gap:.3rem; font-size:.65rem; font-weight:800; text-transform:uppercase; letter-spacing:.08em; color:#94a3b8; }
.adb-label-icon { width:.75rem; height:.75rem; }
.adb-dismiss    { background:none; border:none; cursor:pointer; padding:.15rem; color:#cbd5e1; display:flex; align-items:center; border-radius:.25rem; }
.adb-dismiss:hover { color:#64748b; }
.adb-dismiss-icon { width:.8rem; height:.8rem; }

/* Card */
.adb-card {
  background:#fff;
  border-radius:1rem;
  border:1px solid #e2e8f0;
  box-shadow:0 2px 8px rgba(0,0,0,.06);
  overflow:hidden;
  display:flex;
  flex-direction:column;
  position:relative;
  transition:box-shadow .2s;
}
.adb-card:hover { box-shadow:0 4px 16px rgba(0,0,0,.1); }
.adb-has-image  { }
.adb-no-image   { background:linear-gradient(135deg,#f8faff 0%,#f0f4ff 100%); }

/* Image */
.adb-img-wrap   { position:relative; width:100%; height:140px; background:#f1f5f9; overflow:hidden; }
.adb-mobile .adb-img-wrap { height:120px; }
.adb-img        { width:100%; height:100%; object-fit:cover; transition:opacity .4s; display:block; }
.adb-img-loaded   { opacity:1; }
.adb-img-loading  { opacity:0; }
.adb-img-shimmer {
  position:absolute; inset:0;
  background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);
  background-size:200% 100%;
  animation:adb-shimmer 1.4s infinite;
}
@keyframes adb-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

/* Body */
.adb-body    { padding:.85rem 1rem; display:flex; flex-direction:column; gap:.4rem; }
.adb-mobile .adb-body  { padding:.65rem .85rem; gap:.3rem; }
.adb-title   { font-size:.875rem; font-weight:800; color:#1e293b; margin:0; line-clamp:1; display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden; }
.adb-mobile .adb-title { font-size:.8rem; }
.adb-desc    { font-size:.75rem; color:#64748b; line-height:1.5; margin:0; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.adb-mobile .adb-desc  { -webkit-line-clamp:1; font-size:.7rem; }

/* Actions */
.adb-actions { display:flex; flex-wrap:wrap; gap:.4rem; margin-top:.25rem; }
.adb-btn {
  display:inline-flex; align-items:center; gap:.3rem;
  padding:.35rem .8rem; border-radius:.5rem;
  font-size:.72rem; font-weight:700; text-decoration:none;
  border:none; cursor:pointer; transition:all .15s;
  white-space:nowrap;
}
.adb-btn-icon { width:.75rem; height:.75rem; flex-shrink:0; }
.adb-btn-cta  { background:#4f46e5; color:#fff; }
.adb-btn-cta:hover  { background:#4338ca; }
.adb-btn-call { background:#f0fdf4; color:#166534; border:1px solid #bbf7d0; }
.adb-btn-call:hover { background:#dcfce7; }
.adb-btn-wa   { background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0; }
.adb-btn-wa:hover   { background:#dcfce7; }

/* Mobile – compact actions */
.adb-mobile .adb-btn { padding:.3rem .65rem; font-size:.68rem; }

/* Nav arrows */
.adb-nav {
  position:absolute; top:50%; transform:translateY(-50%);
  background:rgba(255,255,255,.9); border:1px solid #e2e8f0;
  border-radius:50%; width:1.75rem; height:1.75rem;
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; box-shadow:0 1px 4px rgba(0,0,0,.1);
  transition:all .15s; z-index:5; padding:0;
}
.adb-nav:hover { background:#fff; box-shadow:0 2px 8px rgba(0,0,0,.15); }
.adb-nav-prev { left:.5rem; }
.adb-nav-next { right:.5rem; }
.adb-nav-icon { width:1rem; height:1rem; color:#64748b; }

/* Dots */
.adb-dots { display:flex; justify-content:center; gap:.35rem; }
.adb-dot {
  width:.45rem; height:.45rem; border-radius:50%;
  background:#e2e8f0; border:none; cursor:pointer; padding:0;
  transition:all .2s;
}
.adb-dot-active { background:#4f46e5; transform:scale(1.2); }
`;
