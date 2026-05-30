/* ========================================
   CyprusWay — Supabase Auth Integration
   Google sign-in. Premium tracking.
   ======================================== */

(function () {
  'use strict';

  /* --- Init Supabase --- */
  var config = window.CW && window.CW.config;
  var supabase = window.supabase;
  if (!supabase) {
    console.warn('Supabase SDK not loaded');
    return;
  }

  var client = supabase.createClient(
    config ? config.supabaseUrl : 'https://knvjmsnwzskbageetbam.supabase.co',
    config ? config.supabaseAnonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtudmptc253enNrYmFnZWV0YmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NTE0MzIsImV4cCI6MjA5NDUyNzQzMn0.jaZ91wRrCyb2Ud5KpNQOaPgCPGd0fXyoW68Kp16HfK0'
  );

  window.CW = window.CW || {};
  window.CW.supabase = client;

  /* --- State --- */
  var currentUser = null;

  /* --- UI Elements --- */
  function getUI() {
    return {
      signedOutBlock: document.getElementById('auth-signed-out'),
      signedInBlock: document.getElementById('auth-signed-in'),
      userDisplay: document.getElementById('auth-user-display'),
      signInBtn: document.getElementById('auth-sign-in-btn'),
      signOutBtn: document.getElementById('auth-sign-out-btn'),
      upgradeBtn: document.getElementById('auth-upgrade-btn'),
      premiumBadge: document.getElementById('auth-premium-badge'),
      premiumActive: document.getElementById('auth-premium-active'),
      errorMsg: document.getElementById('auth-error'),
      comingSoon: document.getElementById('auth-coming-soon'),
      promoSection: document.getElementById('auth-promo-section'),
      promoInput: document.getElementById('promo-code-input'),
      promoRedeemBtn: document.getElementById('promo-redeem-btn'),
      promoMessage: document.getElementById('promo-message')
    };
  }

  /* --- Update UI based on auth + premium state --- */
  function updateUI() {
    var ui = getUI();
    if (!ui.signedOutBlock) return; /* not on premium page */

    var cfg = window.CW && window.CW.config;

    if (currentUser) {
      var name = currentUser.user_metadata && currentUser.user_metadata.full_name
        ? currentUser.user_metadata.full_name
        : currentUser.email;

      ui.signedOutBlock.style.display = 'none';
      ui.signedInBlock.style.display = 'block';
      if (ui.userDisplay) ui.userDisplay.textContent = name;

      /* Check premium status */
      checkPremium().then(function (isPremium) {
        if (isPremium) {
          /* Premium active — hide purchase UI */
          if (ui.upgradeBtn) ui.upgradeBtn.style.display = 'none';
          if (ui.comingSoon) ui.comingSoon.style.display = 'none';
          if (ui.promoSection) ui.promoSection.style.display = 'none';
          if (ui.premiumActive) ui.premiumActive.style.display = 'block';
          if (ui.premiumBadge) ui.premiumBadge.style.display = 'inline';
        } else {
          /* Not premium — show purchase UI based on config */
          if (ui.premiumActive) ui.premiumActive.style.display = 'none';
          if (ui.premiumBadge) ui.premiumBadge.style.display = 'none';

          if (cfg && cfg.stripeEnabled) {
            /* Stripe ready — show upgrade button, let stripe.js handle the rest */
            if (ui.upgradeBtn) ui.upgradeBtn.style.display = 'inline-block';
            if (ui.comingSoon) ui.comingSoon.style.display = 'none';
          } else {
            /* Stripe not ready — show coming soon, hide upgrade button */
            if (ui.comingSoon) ui.comingSoon.style.display = 'block';
            if (ui.upgradeBtn) ui.upgradeBtn.style.display = 'none';
          }

          /* Promo code section — shown only when flag is on */
          if (ui.promoSection) {
            ui.promoSection.style.display = (cfg && cfg.promoCodesEnabled) ? 'block' : 'none';
          }
        }
      });
    } else {
      ui.signedOutBlock.style.display = 'block';
      ui.signedInBlock.style.display = 'none';
      if (ui.comingSoon) ui.comingSoon.style.display = 'none';
      if (ui.promoSection) ui.promoSection.style.display = 'none';
      if (ui.premiumActive) ui.premiumActive.style.display = 'none';
      if (ui.premiumBadge) ui.premiumBadge.style.display = 'none';
    }
  }

  /* --- Check premium from users table --- */
  function checkPremium() {
    if (!currentUser) return Promise.resolve(false);

    return client
      .from('users')
      .select('is_premium')
      .eq('id', currentUser.id)
      .single()
      .then(function (res) {
        if (res.error) return false;
        return res.data && res.data.is_premium === true;
      })
      .catch(function () {
        return false;
      });
  }

  /* --- Sign In --- */
  function signIn() {
    var ui = getUI();
    if (ui.errorMsg) ui.errorMsg.style.display = 'none';

    client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname
      }
    }).then(function (res) {
      if (res.error && ui.errorMsg) {
        ui.errorMsg.textContent = 'Sign-in failed. Please try again.';
        ui.errorMsg.style.display = 'block';
      }
    });
  }

  /* --- Sign Out --- */
  function signOut() {
    client.auth.signOut().then(function () {
      currentUser = null;
      updateUI();
    });
  }

  /* --- Check current session on load --- */
  function checkSession() {
    client.auth.getSession().then(function (res) {
      if (res.data && res.data.session) {
        currentUser = res.data.session.user;
      } else {
        currentUser = null;
      }
      updateUI();
    });
  }

  /* --- Auth state listener --- */
  client.auth.onAuthStateChange(function (event, session) {
    if (session) {
      currentUser = session.user;
    } else {
      currentUser = null;
    }
    updateUI();
  });

  /* --- Redeem promo code --- */
  function redeemPromoCode() {
    var ui = getUI();
    var code = ui.promoInput && ui.promoInput.value.trim();
    if (!code) return;

    if (ui.promoMessage) { ui.promoMessage.style.display = 'none'; }
    if (ui.promoRedeemBtn) { ui.promoRedeemBtn.disabled = true; ui.promoRedeemBtn.textContent = 'Redeeming...'; }

    client.auth.getSession().then(function (res) {
      if (!res.data.session) throw new Error('not_signed_in');

      var token = res.data.session.access_token;

      return fetch(
        window.CW.config.supabaseUrl + '/functions/v1/promo-redeem',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json',
            'apikey': window.CW.config.supabaseAnonKey
          },
          body: JSON.stringify({ code: code })
        }
      );
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.success) {
        window.location.href = 'premium-success.html';
      } else {
        showPromoError(data.error || 'Invalid or expired code.');
      }
    })
    .catch(function (e) {
      showPromoError(e && e.message === 'not_signed_in'
        ? 'Please sign in first.'
        : 'Something went wrong. Please try again.');
    });
  }

  function showPromoError(msg) {
    var ui = getUI();
    if (ui.promoMessage) {
      ui.promoMessage.textContent = msg;
      ui.promoMessage.className = 'promo-feedback promo-error';
      ui.promoMessage.style.display = 'block';
    }
    if (ui.promoRedeemBtn) { ui.promoRedeemBtn.disabled = false; ui.promoRedeemBtn.textContent = 'Redeem'; }
  }

  /* --- Wire buttons --- */
  function wireButtons() {
    var ui = getUI();
    if (ui.signInBtn) {
      ui.signInBtn.addEventListener('click', function (e) {
        e.preventDefault();
        signIn();
      });
    }
    if (ui.signOutBtn) {
      ui.signOutBtn.addEventListener('click', function (e) {
        e.preventDefault();
        signOut();
      });
    }
    if (ui.promoRedeemBtn) {
      ui.promoRedeemBtn.addEventListener('click', function (e) {
        e.preventDefault();
        redeemPromoCode();
      });
    }
  }

  /* --- Public API --- */
  window.CW.auth = {
    getSession: function () {
      return client.auth.getSession().then(function (res) {
        return res.data.session || null;
      });
    },
    getCurrentUser: function () { return currentUser; },
    checkPremium: checkPremium,
    refreshUI: updateUI
  };

  /* --- Init --- */
  function init() {
    wireButtons();
    checkSession();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
