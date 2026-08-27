/* ========================================
   CyprusWay — Premium Page Auth
   Session state and premium status for
   premium.html. Sign-in itself belongs to
   js/onboarding.js — the button here just
   carries data-cw-auth and opens that card.
   ======================================== */

(function () {
  'use strict';

  /* --- State ---
     The client comes from js/supabase-client.js so the whole
     site shares one instance and one token refresh loop. */
  var client = null;
  var currentUser = null;

  /* --- UI Elements --- */
  function getUI() {
    return {
      signedOutBlock: document.getElementById('auth-signed-out'),
      signedInBlock: document.getElementById('auth-signed-in'),
      userDisplay: document.getElementById('auth-user-display'),
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
    if (!currentUser || !client) return Promise.resolve(false);

    return client
      .from('users')
      .select('is_premium')
      .eq('id', currentUser.id)
      .maybeSingle()
      .then(function (res) {
        if (res.error) return false;
        return !!(res.data && res.data.is_premium === true);
      })
      .catch(function () {
        return false;
      });
  }

  /* --- Sign Out --- */
  function signOut() {
    if (!client) return;
    client.auth.signOut().then(function () {
      currentUser = null;
      updateUI();
    });
  }

  /* --- Check current session on load --- */
  function checkSession() {
    return client.auth.getSession().then(function (res) {
      currentUser = (res.data && res.data.session) ? res.data.session.user : null;
      updateUI();
    });
  }

  /* --- Redeem promo code --- */
  function redeemPromoCode() {
    var ui = getUI();
    var code = ui.promoInput && ui.promoInput.value.trim();
    if (!code || !client) return;

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

  /* --- Wire buttons ---
     The sign-in button is not wired here: it carries
     data-cw-auth="signin" and onboarding.js owns the click. */
  function wireButtons() {
    var ui = getUI();
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
  window.CW = window.CW || {};
  window.CW.auth = {
    getSession: function () {
      if (!client) return Promise.resolve(null);
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

    if (!window.CW.getSupabase) {
      console.warn('Supabase client module not loaded');
      return;
    }

    window.CW.getSupabase().then(function (c) {
      client = c;

      client.auth.onAuthStateChange(function (event, session) {
        currentUser = session ? session.user : null;
        updateUI();
      });

      return checkSession();
    }).catch(function () {
      var ui = getUI();
      if (ui.errorMsg) {
        ui.errorMsg.textContent = 'We couldn\'t reach the sign-in service. Please try again.';
        ui.errorMsg.style.display = 'block';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
