/* ========================================
   CyprusWay — Onboarding
   One card, injected on demand, opened by any
   [data-cw-auth] element. Google and Apple only.
   Also owns the OAuth return leg: decides where
   someone lands after the provider sends them back.
   ======================================== */

(function () {
  'use strict';

  /* --- Interests ---
     Slugs are enforced by a CHECK constraint in the database.
     A wrong value throws 23514 and the write fails, so this
     list is the contract; labels come from the dictionary. */
  var INTERESTS = [
    'beach_coast',
    'ancient_ruins',
    'local_food',
    'wine_villages',
    'nature_trails',
    'nightlife',
    'adventure',
    'culture_art',
    'kid_friendly',
    'hidden_gems',
    'churches_monasteries'
  ];

  /* --- Where the submit button goes ---
     The Figma screen has two buttons, "Explore" and "My CyprusWay",
     carried over from the app where the second means a personalised
     feed. The web has no such surface, so both would have landed
     somewhere generic — a primary/secondary pair claiming one path
     is recommended when the two were equivalent. Collapsed to one. */
  var ROUTES = {
    explore: 'destinations.html'
  };

  var BACKDROP = 'images/Paphos harbour.jpg';
  var DISMISS_KEY = 'cw_onb_dismissed';

  /* --- Icons ---
     Apple, close and lock path data exported from Figma.
     Google is the repo's existing four-colour mark, which
     keeps its brand colours by design. --- */
  var ICON_GOOGLE =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>' +
    '<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>' +
    '<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>' +
    '<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>' +
    '</svg>';

  var ICON_APPLE =
    '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">' +
    '<path fill="currentColor" d="M12.6625 3.76083C13.2275 3.075 13.6258 2.13917 13.6258 1.19417C13.6258 1.065 13.6175 0.935833 13.5983 0.833333C12.6717 0.87 11.56 1.445 10.9025 2.22333C10.3742 2.81583 9.8925 3.76083 9.8925 4.70583C9.8925 4.85417 9.92083 4.9925 9.93 5.03917C9.985 5.04833 10.0783 5.06667 10.18 5.06667C11.005 5.06667 12.0417 4.51083 12.6625 3.76083ZM13.3108 5.26083C11.9308 5.26083 10.8008 6.10417 10.0775 6.10417C9.30917 6.10417 8.30833 5.31667 7.10417 5.31667C4.81583 5.31667 2.5 7.20667 2.5 10.765C2.5 12.9883 3.3525 15.3317 4.4175 16.8425C5.32583 18.12 6.1225 19.1667 7.27083 19.1667C8.40083 19.1667 8.90167 18.4167 10.3092 18.4167C11.7358 18.4167 12.06 19.1483 13.3108 19.1483C14.5525 19.1483 15.3775 18.0083 16.1642 16.8875C17.035 15.6 17.4058 14.3492 17.4142 14.285C17.3408 14.2658 14.9692 13.2933 14.9692 10.5792C14.9692 8.22583 16.8317 7.17 16.9425 7.08667C15.71 5.3175 13.83 5.26083 13.3108 5.26083Z"/>' +
    '</svg>';

  var ICON_CLOSE =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" ' +
    'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M18 6L6 18"/><path d="M6 6L18 18"/>' +
    '</svg>';

  var ICON_LOCK =
    '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
    '<path fill="currentColor" d="M12.5 6.70667V4.5C12.5 3.30653 12.0259 2.16193 11.182 1.31802C10.3381 0.474106 9.19347 0 8 0C6.80653 0 5.66193 0.474106 4.81802 1.31802C3.97411 2.16193 3.5 3.30653 3.5 4.5V6.70667C2.95129 6.98315 2.48968 7.40592 2.16615 7.92828C1.84262 8.45063 1.66976 9.05224 1.66667 9.66667V12.6667C1.66667 13.1044 1.75289 13.5379 1.9204 13.9423C2.08792 14.3467 2.33345 14.7142 2.64298 15.0237C3.2681 15.6488 4.11595 16 5 16H11C11.8841 16 12.7319 15.6488 13.357 15.0237C13.9821 14.3986 14.3333 13.5507 14.3333 12.6667V9.66667C14.3302 9.05224 14.1574 8.45063 13.8339 7.92828C13.5103 7.40592 13.0487 6.98315 12.5 6.70667ZM9.33333 10.9667C9.33333 11.2304 9.25513 11.4882 9.10863 11.7074C8.96212 11.9267 8.75388 12.0976 8.51024 12.1985C8.26661 12.2994 7.99852 12.3258 7.73988 12.2744C7.48124 12.2229 7.24366 12.0959 7.05719 11.9095C6.87072 11.723 6.74373 11.4854 6.69229 11.2268C6.64084 10.9681 6.66724 10.7001 6.76816 10.4564C6.86908 10.2128 7.03997 10.0045 7.25924 9.85804C7.47851 9.71153 7.73629 9.63333 8 9.63333C8.35362 9.63333 8.69276 9.77381 8.94281 10.0239C9.19286 10.2739 9.33333 10.613 9.33333 10.9667ZM8 1.66667C8.75091 1.66843 9.47055 1.9675 10.0015 2.49848C10.5325 3.02945 10.8316 3.74909 10.8333 4.5V6C10.8333 6.08841 10.7982 6.17319 10.7357 6.2357C10.6732 6.29821 10.5884 6.33333 10.5 6.33333H5.5C5.41159 6.33333 5.32681 6.29821 5.2643 6.2357C5.20179 6.17319 5.16667 6.08841 5.16667 6V4.5C5.16843 3.74909 5.4675 3.02945 5.99848 2.49848C6.52945 1.9675 7.24909 1.66843 8 1.66667Z"/>' +
    '</svg>';

  /* --- State --- */
  var overlay = null;
  var card = null;
  var body = null;
  var view = null;          /* 'auth' | 'interests' | 'loading' */
  var lastTrigger = null;
  var currentUser = null;
  var busy = false;

  /* --- Small helpers --- */
  function t(key) {
    if (window.CW && window.CW.i18n) return window.CW.i18n.t(key);
    return '';
  }

  function translateCard() {
    if (card && window.CW && window.CW.i18n) window.CW.i18n.apply(card);
  }

  function dismissed() {
    try { return sessionStorage.getItem(DISMISS_KEY) === '1'; }
    catch (e) { return false; }
  }

  function setDismissed() {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch (e) {}
  }

  function clearDismissed() {
    try { sessionStorage.removeItem(DISMISS_KEY); } catch (e) {}
  }

  /* Supabase persists its session under sb-<ref>-auth-token.
     Scanned rather than hardcoded so a project change can't
     silently break the probe. */
  function hasStoredSession() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && /^sb-.+-auth-token$/.test(k)) return true;
      }
    } catch (e) {}
    return false;
  }

  /* ----------------------------------------
     Shell
     ---------------------------------------- */

  function buildShell() {
    if (overlay) return;

    overlay = document.createElement('div');
    overlay.className = 'onb-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'onb-title');
    overlay.style.backgroundImage = 'url("' + BACKDROP + '")';

    card = document.createElement('div');
    card.className = 'onb-card';

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'onb-close';
    close.setAttribute('data-i18n', 'onb_close');
    close.setAttribute('data-i18n-attr', 'aria-label');
    close.setAttribute('aria-label', 'Close');
    close.innerHTML = ICON_CLOSE;
    close.addEventListener('click', function () { closeCard(); });

    body = document.createElement('div');
    body.className = 'onb-body';

    card.appendChild(close);
    card.appendChild(body);
    overlay.appendChild(card);

    /* Click on the backdrop, not the card, closes */
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeCard();
    });

    document.body.appendChild(overlay);
  }

  function show() {
    buildShell();
    document.body.classList.add('onb-lock');
    overlay.classList.add('is-open');
    document.addEventListener('keydown', onKeydown);
  }

  function closeCard() {
    if (!overlay) return;
    if (view === 'interests') setDismissed();

    overlay.classList.remove('is-open');
    document.body.classList.remove('onb-lock');
    document.removeEventListener('keydown', onKeydown);
    view = null;
    busy = false;

    if (lastTrigger && document.contains(lastTrigger)) {
      lastTrigger.focus();
    } else if (card.contains(document.activeElement)) {
      /* Auto-opened with no trigger to return to — don't leave
         focus on a node that just became display:none. */
      document.activeElement.blur();
    }
    lastTrigger = null;
  }

  /* --- Focus --- */
  function focusables() {
    return Array.prototype.filter.call(
      card.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      function (el) { return !el.disabled && el.offsetParent !== null; }
    );
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeCard();
      return;
    }
    if (e.key !== 'Tab') return;

    var items = focusables();
    if (!items.length) return;

    var first = items[0];
    var last = items[items.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    } else if (card.contains(document.activeElement) === false) {
      e.preventDefault();
      first.focus();
    }
  }

  function focusFirst() {
    var items = focusables();
    /* Skip the close button when there is something better */
    var target = items.length > 1 ? items[1] : items[0];
    if (target) target.focus();
  }

  /* ----------------------------------------
     Alerts
     ---------------------------------------- */

  function alertRegion() {
    return card ? card.querySelector('.onb-alert-region') : null;
  }

  function showAlert(key) {
    var region = alertRegion();
    if (!region) return;
    region.innerHTML =
      '<div class="onb-alert">' +
      '<span class="onb-alert-icon">' + ICON_LOCK + '</span>' +
      '<span class="onb-alert-text" data-i18n="' + key + '"></span>' +
      '</div>';
    translateCard();
  }

  function clearAlert() {
    var region = alertRegion();
    if (region) region.innerHTML = '';
  }

  /* ----------------------------------------
     Views
     ---------------------------------------- */

  function renderLoading() {
    show();
    view = 'loading';
    card.className = 'onb-card onb-card--auth';
    body.innerHTML =
      '<h2 class="sr-only" id="onb-title" data-i18n="onb_loading"></h2>' +
      '<div class="onb-loading">' +
      '<span class="onb-spinner" aria-hidden="true"></span>' +
      '<p data-i18n="onb_loading"></p>' +
      '</div>';
    translateCard();
  }

  function renderAuth(mode) {
    show();
    view = 'auth';
    card.className = 'onb-card onb-card--auth';

    var isSignin = mode === 'signin';

    body.innerHTML =
      '<div class="onb-head">' +
      '<span class="wordmark" aria-hidden="true">' +
      '<span class="cw-cyprus">Cyprus</span><span class="cw-way">Way</span>' +
      '</span>' +
      '<h2 class="onb-title" id="onb-title" data-i18n="' +
      (isSignin ? 'onb_signin_title' : 'onb_signup_title') + '"></h2>' +
      (isSignin ? '<p class="onb-subtitle" data-i18n="onb_signin_sub"></p>' : '') +
      '</div>' +
      '<div class="onb-actions">' +
      '<div class="onb-alert-region" role="status" aria-live="polite"></div>' +
      '<button type="button" class="onb-provider" data-provider="google">' +
      '<span class="onb-provider-icon">' + ICON_GOOGLE + '</span>' +
      '<span class="onb-provider-label" data-i18n="onb_google"></span>' +
      '</button>' +
      '<button type="button" class="onb-provider" data-provider="apple">' +
      '<span class="onb-provider-icon">' + ICON_APPLE + '</span>' +
      '<span class="onb-provider-label" data-i18n="onb_apple"></span>' +
      '</button>' +
      '</div>';

    body.querySelectorAll('.onb-provider').forEach(function (btn) {
      btn.addEventListener('click', function () {
        signIn(btn.getAttribute('data-provider'), btn);
      });
    });

    translateCard();
    focusFirst();
  }

  function renderInterests() {
    show();
    view = 'interests';
    card.className = 'onb-card onb-card--interests';

    var chips = '';
    INTERESTS.forEach(function (slug) {
      chips +=
        '<button type="button" class="onb-chip" aria-pressed="false" data-slug="' + slug + '">' +
        '<img class="onb-chip-img" src="images/interests/' + slug + '.png" alt="" width="24" height="24">' +
        '<span data-i18n="onb_i_' + slug + '"></span>' +
        '</button>';
    });

    body.innerHTML =
      '<div class="onb-head">' +
      '<h2 class="onb-title" id="onb-title" data-i18n="onb_interests_title"></h2>' +
      '<p class="onb-subtitle" data-i18n="onb_interests_sub"></p>' +
      '</div>' +
      '<div class="onb-chips">' + chips + '</div>' +
      '<div class="onb-alert-region" role="status" aria-live="polite"></div>' +
      '<button type="button" class="onb-btn onb-btn--primary" data-dest="explore" disabled aria-disabled="true">' +
      '<span data-i18n="onb_start_exploring"></span></button>';

    body.querySelectorAll('.onb-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        if (busy) return;
        var on = chip.getAttribute('aria-pressed') === 'true';
        chip.setAttribute('aria-pressed', on ? 'false' : 'true');
        updateSubmitState();
      });
    });

    body.querySelectorAll('.onb-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        saveInterests(btn.getAttribute('data-dest'), btn);
      });
    });

    translateCard();
    focusFirst();
  }

  function collectSelected() {
    var out = [];
    card.querySelectorAll('.onb-chip').forEach(function (chip) {
      if (chip.getAttribute('aria-pressed') === 'true') out.push(chip.getAttribute('data-slug'));
    });
    return out;
  }

  /* Pick at least one — the primary button is dead until then */
  function updateSubmitState() {
    var any = collectSelected().length > 0;
    card.querySelectorAll('.onb-btn').forEach(function (btn) {
      btn.disabled = !any;
      btn.setAttribute('aria-disabled', any ? 'false' : 'true');
    });
  }

  /* --- Pending states ---
     Swaps the data-i18n key rather than the text, so a language
     change mid-flight still lands on the right string. */
  function setPending(labelEl, on, key) {
    if (on) {
      labelEl.setAttribute('data-i18n-restore', labelEl.getAttribute('data-i18n'));
      labelEl.setAttribute('data-i18n', key);
    } else {
      var prev = labelEl.getAttribute('data-i18n-restore');
      if (prev) {
        labelEl.setAttribute('data-i18n', prev);
        labelEl.removeAttribute('data-i18n-restore');
      }
    }
    translateCard();
  }

  function lockButtons(selector, on) {
    card.querySelectorAll(selector).forEach(function (b) { b.disabled = on; });
  }

  /* ----------------------------------------
     Sign in — Google and Apple are the same action.
     signInWithOAuth creates the account if it doesn't exist.
     ---------------------------------------- */

  function signIn(provider, btn) {
    if (busy) return;
    busy = true;
    clearAlert();

    var label = btn.querySelector('.onb-provider-label');
    lockButtons('.onb-provider', true);
    setPending(label, true, 'onb_pending');

    window.CW.getSupabase().then(function (client) {
      return client.auth.signInWithOAuth({
        provider: provider,
        options: {
          /* Built from the current origin — never hardcoded.
             The allowlist covers every origin this can produce. */
          redirectTo: window.location.origin + window.location.pathname
        }
      });
    }).then(function (res) {
      if (res && res.error) throw res.error;
      /* Success: the browser is navigating away. Leave the
         button pending so nothing looks clickable meanwhile. */
    }).catch(function () {
      busy = false;
      lockButtons('.onb-provider', false);
      setPending(label, false);
      showAlert('onb_err_signin');
    });
  }

  /* ----------------------------------------
     Save interests
     ---------------------------------------- */

  function saveInterests(dest, btn) {
    if (busy) return;
    var selected = collectSelected();
    if (!selected.length || !currentUser) return;

    busy = true;
    clearAlert();

    var label = btn.querySelector('span');
    lockButtons('.onb-btn', true);
    setPending(label, true, 'onb_saving');

    window.CW.supabase
      .from('users')
      .update({ interests: selected, onboarding_completed: true })
      .eq('id', currentUser.id)
      .select('id')
      .then(function (res) {
        /* .select('id') is what makes a zero-row update — missing
           row, RLS change, revoked grant — an error instead of a
           silent success that saves nothing. */
        if (res.error) throw res.error;
        if (!res.data || !res.data.length) throw new Error('zero_rows');

        clearDismissed();
        window.location.href = ROUTES[dest] || ROUTES.explore;
      })
      .catch(function () {
        busy = false;
        lockButtons('.onb-btn', false);
        setPending(label, false);
        updateSubmitState();
        showAlert('onb_err_save');
      });
  }

  /* ----------------------------------------
     The return leg
     ---------------------------------------- */

  function failToSignin() {
    renderAuth('signin');
    showAlert('onb_err_signin');
  }

  function checkOnboarding(user) {
    return window.CW.supabase
      .from('users')
      .select('onboarding_completed')
      .eq('id', user.id)
      .maybeSingle()
      .then(function (res) {
        /* Anything unresolved shows an error. It never falls
           through to the signup card — that path ends in
           duplicate accounts for existing paying users. */
        if (res.error || !res.data) {
          failToSignin();
          return;
        }
        if (res.data.onboarding_completed === true) {
          closeCard();
          return;
        }
        currentUser = user;
        renderInterests();
      });
  }

  function resolveSession(hasTokens) {
    renderLoading();

    return window.CW.getSupabase().then(function (client) {
      return client.auth.getSession();
    }).then(function (res) {
      if (res.error) throw res.error;

      var session = res.data && res.data.session;
      if (!session) {
        /* Tokens were in the URL but produced no session —
           that is a failure, not a new visitor. */
        if (hasTokens) failToSignin();
        else closeCard();
        return;
      }
      return checkOnboarding(session.user);
    }).catch(function () {
      failToSignin();
    });
  }

  function route() {
    /* Read the fragment before the SDK exists. detectSessionInUrl
       strips it during init, so this is the only safe moment. */
    var hash = window.location.hash ? window.location.hash.slice(1) : '';
    var params = new URLSearchParams(hash);
    var hasError = params.has('error') || params.has('error_code');
    var hasTokens = params.has('access_token');

    if (hasError) {
      /* Drop the fragment so a reload doesn't replay the error */
      history.replaceState(null, '', window.location.pathname + window.location.search);
      failToSignin();
      return;
    }

    if (hasTokens) {
      /* A fresh sign-in outranks an earlier dismissal */
      clearDismissed();
      resolveSession(true);
      return;
    }

    if (hasStoredSession() && !dismissed()) {
      resolveSession(false);
      return;
    }

    /* No session, no fragment — a normal visitor. Do nothing. */
  }

  /* ----------------------------------------
     Triggers
     ---------------------------------------- */

  function wireTriggers() {
    document.addEventListener('click', function (e) {
      var el = e.target && e.target.closest ? e.target.closest('[data-cw-auth]') : null;
      if (!el) return;
      e.preventDefault();
      lastTrigger = el;
      renderAuth(el.getAttribute('data-cw-auth') === 'signin' ? 'signin' : 'signup');
    });
  }

  /* --- Public API --- */
  window.CW = window.CW || {};
  window.CW.onboarding = {
    open: function (mode) {
      lastTrigger = document.activeElement;
      renderAuth(mode === 'signin' ? 'signin' : 'signup');
    },
    close: closeCard
  };

  /* --- Init --- */
  function init() {
    wireTriggers();

    /* Re-render imperative strings when the language changes */
    document.addEventListener('cw:lang', function () {
      if (overlay && overlay.classList.contains('is-open')) translateCard();
    });

    route();

    /* ?mode=signin makes the signin card linkable without a
       second page. Skipped if the return leg already took over. */
    if (!view) {
      var mode = new URLSearchParams(window.location.search).get('mode');
      if (mode === 'signin' || mode === 'signup') renderAuth(mode);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
