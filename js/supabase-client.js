/* ========================================
   CyprusWay — Shared Supabase Client
   One client for the whole site, built from
   CW.config. The SDK is fetched on demand so
   marketing pages don't ship ~120KB they
   never use. Pages that need it at load time
   (premium.html) keep their own <script> tag
   and this resolves instantly.
   ======================================== */

(function () {
  'use strict';

  var SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

  window.CW = window.CW || {};

  var clientPromise = null;

  /* --- Build the one client --- */
  function buildClient() {
    var config = window.CW.config;
    if (!config) throw new Error('CW.config missing');

    var client = window.supabase.createClient(
      config.supabaseUrl,
      config.supabaseAnonKey
    );

    /* Published so auth.js and onboarding.js share one instance —
       two clients would mean two token refresh loops. */
    window.CW.supabase = client;
    return client;
  }

  /* --- Fetch the SDK once --- */
  function loadSdk() {
    return new Promise(function (resolve, reject) {
      var tag = document.querySelector('script[data-cw-sdk]');
      if (tag) {
        tag.addEventListener('load', function () { resolve(); });
        tag.addEventListener('error', function () { reject(new Error('sdk_load_failed')); });
        return;
      }
      tag = document.createElement('script');
      tag.src = SDK_URL;
      tag.setAttribute('data-cw-sdk', '');
      tag.onload = function () { resolve(); };
      tag.onerror = function () {
        clientPromise = null; /* let a later attempt retry */
        reject(new Error('sdk_load_failed'));
      };
      document.head.appendChild(tag);
    });
  }

  /* --- Public: resolves with the shared client --- */
  function getSupabase() {
    if (clientPromise) return clientPromise;

    if (window.supabase) {
      clientPromise = Promise.resolve(buildClient());
    } else {
      clientPromise = loadSdk().then(buildClient);
    }
    return clientPromise;
  }

  window.CW.getSupabase = getSupabase;

  /* Eager path: premium.html loads the SDK in the page, so the
     client exists from first paint exactly as it did before. */
  if (window.supabase && window.CW.config) getSupabase();

})();
