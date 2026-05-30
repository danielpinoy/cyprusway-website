/* ========================================
   CyprusWay — Cookie Consent Banner
   GDPR-compliant cookie consent mechanism.
   ======================================== */

(function () {
  'use strict';

  var STORAGE_KEY = 'cw_cookie_consent';
  var EXPIRY_DAYS = 365;

  /* --- Check if consent was already given --- */
  function hasConsent() {
    var val = localStorage.getItem(STORAGE_KEY);
    if (!val) return false;

    try {
      var data = JSON.parse(val);
      var expires = new Date(data.expires);
      return expires > new Date();
    } catch (e) {
      return false;
    }
  }

  function setConsent() {
    var expiry = new Date();
    expiry.setDate(expiry.getDate() + EXPIRY_DAYS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      accepted: true,
      expires: expiry.toISOString()
    }));
  }

  /* --- Build the banner --- */
  function buildBanner() {
    var banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.innerHTML =
      '<div class="cookie-banner-inner">' +
        '<p class="cookie-banner-text">This site uses cookies for essential functionality and to track affiliate bookings. <a href="privacy.html">Learn more</a>.</p>' +
        '<button class="cookie-banner-accept btn btn-primary">Accept</button>' +
      '</div>';

    document.body.appendChild(banner);

    /* Show with slight delay for animation */
    setTimeout(function () { banner.classList.add('cookie-banner-visible'); }, 300);

    /* Wire accept button */
    banner.querySelector('.cookie-banner-accept').addEventListener('click', function () {
      setConsent();
      banner.classList.remove('cookie-banner-visible');
      setTimeout(function () { banner.remove(); }, 400);
    });
  }

  /* --- Init --- */
  function init() {
    if (!hasConsent()) {
      buildBanner();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
