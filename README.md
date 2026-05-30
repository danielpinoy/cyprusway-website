# CyprusWay Website — Deployment Checklist

## 1. Domain Registration
- [ ] Register `cyprusway.com` (or `.app` / `.travel`) at any registrar (Cloudflare Registrar recommended — lowest price, integrates with Cloudflare Pages)

## 2. Set Up Email
- [ ] Create `hello@cyprusway.com` mailbox or forwarder on the domain
- [ ] Verify the address receives mail before submitting to Awin

## 3. Deploy to Cloudflare Pages
- [ ] Create a GitHub repository
- [ ] Push all files from this folder to the repo
- [ ] In Cloudflare Pages dashboard: Create new project → Connect to GitHub repo
- [ ] Build command: (leave empty)
- [ ] Output directory: (leave as `/`)
- [ ] Deploy
- [ ] In Cloudflare Pages → Custom Domains: add your domain
- [ ] Wait for DNS to propagate (~5 minutes). SSL is automatic.

## 4. Activate Stripe (Premium Checkout)
- [ ] Create a Stripe account at dashboard.stripe.com
- [ ] Get your **Publishable Key** (pk_live_...) from Dashboard → Developers → API keys
- [ ] Open `js/stripe.js` — replace `STRIPE_PUBLISHABLE_KEY` with your key
- [ ] In `js/config.js` — set `stripeEnabled: true`
- [ ] In `premium.html` — uncomment `<script src="https://js.stripe.com/v3/"></script>` (last line)
- [ ] Deploy the `create-checkout-session` Supabase Edge Function
- [ ] Deploy the `stripe-webhook` Supabase Edge Function
- [ ] Create a Stripe product: "CyprusWay Premium" — €4.99 one-time
- [ ] Set up webhook endpoint in Stripe dashboard → point to your Supabase function URL

## 5. Activate Promo Codes
- [ ] In `js/config.js` — set `promoCodesEnabled: true`
- [ ] Deploy the `promo-redeem` Supabase Edge Function
- [ ] The UI (input field + redeem button) is already on `premium.html` — appears automatically when the flag is on

## 6. How Feature Flags Work
All premium purchase paths (Stripe checkout, promo codes) are gated behind boolean flags in `js/config.js`. When you're ready for a feature:
1. Deploy the relevant Supabase Edge Function
2. Flip the flag in `config.js` from `false` to `true`
3. The UI automatically switches — no code to uncomment, no `alert()` workarounds to remove

When `stripeEnabled` is `false`, signed-in users see a styled "coming soon" panel instead of a purchase button. When `promoCodesEnabled` is `false`, the promo input section is hidden entirely. Both degrade gracefully.

## 7. Apply to Awin
- [ ] Go to awin.com → Publishers → Join
- [ ] Submit the application with `cyprusway.com` as your promotional property
- [ ] During review, they will check: site content, privacy policy, terms, contact email, affiliate disclosure — all present on this site
- [ ] After approval, apply for Booking.com program within Awin

## 8. Post-Approval
- [ ] Once Booking.com approves, add affiliate tracking ID to the Book with Pete wizard (app-side)
- [ ] RevenueCat setup for iOS/Android in-app purchases (separate from website)

## File Inventory
├── index.html
├── features.html
├── destinations.html
├── about.html
├── premium.html
├── premium-success.html
├── faq.html
├── privacy.html
├── terms.html
├── 404.html
├── robots.txt
├── sitemap.xml
├── favicon.svg
├── css/
│   └── style.css
├── js/
│   ├── config.js          — feature flags (single place to enable Stripe, promos)
│   ├── main.js            — scroll reveals, animations
│   ├── i18n.js            — 5-language translation dictionary
│   ├── lang.js            — language switcher
│   ├── auth.js            — Supabase Google sign-in (premium page)
│   ├── stripe.js          — Stripe checkout (gated behind config flag)
│   └── cookie-consent.js  — GDPR cookie banner
└── images/
    └── (7 stock photos)
