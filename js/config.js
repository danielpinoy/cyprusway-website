/* ========================================
   CyprusWay — Feature Flags & Config
   Single source of truth for gated features.
   When a feature is ready, flip the flag here
   — no code changes needed elsewhere.
   ======================================== */

(function () {
  'use strict';

  window.CW = window.CW || {};

  window.CW.config = {

    /* Premium payment — Stripe Checkout
       When ready:
       1. Set stripeEnabled to true
       2. Uncomment the Stripe.js <script> tag in premium.html
       3. Replace STRIPE_PUBLISHABLE_KEY in js/stripe.js
       4. Deploy create-checkout-session + stripe-webhook edge functions */
    stripeEnabled: false,

    /* Promo codes — /api/promo/redeem
       When ready:
       1. Set promoCodesEnabled to true
       2. Deploy the promo redeem edge function
       3. The UI is already in place on premium.html */
    promoCodesEnabled: false,

    /* Supabase connection (shared across all JS files) */
    supabaseUrl: 'https://knvjmsnwzskbageetbam.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtudmptc253enNrYmFnZWV0YmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NTE0MzIsImV4cCI6MjA5NDUyNzQzMn0.jaZ91wRrCyb2Ud5KpNQOaPgCPGd0fXyoW68Kp16HfK0'

  };

})();
