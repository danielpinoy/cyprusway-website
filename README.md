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
│   ├── lang.js            — language switcher (+ data-i18n-attr, CW.i18n API)
│   ├── supabase-client.js — the one shared Supabase client; loads the SDK on demand
│   ├── onboarding.js      — sign-in card, interests screen, OAuth return leg
│   ├── auth.js            — session + premium status (premium page)
│   ├── stripe.js          — Stripe checkout (gated behind config flag)
│   └── cookie-consent.js  — GDPR cookie banner
└── images/
    ├── (7 stock photos)
    └── interests/         — 11 chip thumbnails for the interests screen

## 9. Onboarding Card

Google and Apple sign-in only — no email, no password, no guest. The card is built in
JavaScript and injected on demand, so it is not pasted into any HTML file. Open it from
any element carrying `data-cw-auth`:

```html
<button type="button" data-cw-auth="signin">Sign in</button>
<button type="button" data-cw-auth="signup">Get started</button>
```

`?mode=signin` on any page opens it in sign-in mode on load, so the flow is linkable
without a second page.

`js/onboarding.js` also owns the OAuth return leg. After a provider sends someone back it
decides where they land, keyed on `users.onboarding_completed`:

| State | Result |
|---|---|
| No session, no URL fragment | nothing — a normal visitor |
| Session, `onboarding_completed = false` | the interests screen |
| Session, `onboarding_completed = true` | signed in, no onboarding |
| `#error=` in the fragment, or an unresolvable session | the error banner |

It never falls through to the sign-up card when a session cannot be resolved.

The Supabase SDK (~120KB) is fetched only when it is actually needed: on a `data-cw-auth`
click, or on load when an auth fragment or a stored session is present. `premium.html`
keeps its own `<script>` tag because that page needs the client at first paint.

Adding the card to a new page needs `config.js`, `i18n.js`, `lang.js`,
`supabase-client.js` and `onboarding.js` in the script block — see any existing page.
