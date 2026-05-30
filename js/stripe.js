/* ========================================
   CyprusWay — Stripe Checkout Integration
   Gated behind CW.config.stripeEnabled.
   When Stripe is ready, flip the config flag
   and add the Stripe.js <script> tag to
   premium.html. No code changes needed here.
   ======================================== */

(function () {
  'use strict';

  var STRIPE_PUBLISHABLE_KEY = 'pk_live_REPLACE_WITH_YOUR_KEY';

  var stripe = null;
  var isLibraryLoaded = false;

  /* --- Init Stripe.js (runs if script tag is present) --- */
  function initStripe() {
    if (typeof Stripe === 'undefined') return;
    if (STRIPE_PUBLISHABLE_KEY.indexOf('REPLACE') !== -1) return;

    stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
    isLibraryLoaded = true;
  }

  /* --- Create checkout session via Supabase edge function ---
     Always compiled. Only called when stripeEnabled is true.
     Requires: CW.auth.getSession() for the JWT token.
     Requires: create-checkout-session edge function deployed. --- */
  function createCheckoutSession() {
    var auth = window.CW && window.CW.auth;
    if (!auth) return Promise.reject(new Error('Auth not loaded'));

    return auth.getSession().then(function (session) {
      if (!session) throw new Error('Not signed in');

      return fetch(
        window.CW.config.supabaseUrl + '/functions/v1/create-checkout-session',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + session.access_token,
            'Content-Type': 'application/json',
            'apikey': window.CW.config.supabaseAnonKey
          }
        }
      );
    }).then(function (r) { return r.json(); });
  }

  /* --- Show "coming soon" panel --- */
  function showComingSoon() {
    var panel = document.getElementById('auth-coming-soon');
    var btn = document.getElementById('auth-upgrade-btn');
    if (panel) panel.style.display = 'block';
    if (btn) btn.style.display = 'none';
    document.getElementById('auth-promo-section') &&
      (document.getElementById('auth-promo-section').style.display = 'none');
  }

  /* --- Show upgrade button (stripe ready, not premium) --- */
  function showUpgradeBtn() {
    var btn = document.getElementById('auth-upgrade-btn');
    var panel = document.getElementById('auth-coming-soon');
    if (btn) btn.style.display = 'inline-block';
    if (panel) panel.style.display = 'none';
  }

  /* --- Handle upgrade button click --- */
  function handleUpgrade() {
    if (!window.CW || !window.CW.config) return;

    /* Gate: Stripe not enabled yet */
    if (!window.CW.config.stripeEnabled) {
      showComingSoon();
      return;
    }

    /* Stripe.js library not loaded */
    if (!isLibraryLoaded) {
      window.alert('Payment is not configured. Please try again later.');
      return;
    }

    createCheckoutSession()
      .then(function (data) {
        if (data.sessionId) {
          stripe.redirectToCheckout({ sessionId: data.sessionId });
        } else {
          window.alert(data.error || 'Could not start checkout. Please try again.');
        }
      })
      .catch(function () {
        window.alert('Something went wrong. Please try again.');
      });
  }

  /* --- Public API --- */
  window.CW.stripe = {
    init: initStripe,
    showUpgradeBtn: showUpgradeBtn,
    showComingSoon: showComingSoon
  };

  /* --- Wire upgrade button --- */
  function wireButton() {
    var btn = document.getElementById('auth-upgrade-btn');
    if (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        handleUpgrade();
      });
    }
  }

  /* --- Init --- */
  function init() {
    initStripe();
    wireButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
