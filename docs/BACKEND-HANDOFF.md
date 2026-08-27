# Backend hand-off from the web phase-1 rebuild

Things the website rebuild depends on, or breaks, that live in another repo. Nothing here
was changed by phase 1 — the web repo has no migrations, no edge functions, and no
affiliate code. This is the list somebody else has to act on.

Written 27 August 2026, from the phase-1 build.

---

## 1 · `create-checkout-session` returns buyers to two pages that no longer exist

**Severity: latent. Nothing can hit it today. It becomes a 404 for a paying customer the
moment the Stripe rail is switched on.**

The deployed function hardcodes:

```
success_url  https://cyprusway.eu/premium-success.html
cancel_url   https://cyprusway.eu/premium.html
```

Both pages were deleted in the phase-1 rebuild (plan Q3, ruled 27 Aug). The web repo
301-redirects both legacy URLs to `/`, so a checkout return would land on the home page
rather than a hard 404 — but "your payment succeeded, here is the home page" is not a
success page, and the redirect is a courtesy, not a fix.

**Why deleting them was still right:** `stripeEnabled` is `false`, `js/stripe.js` carried a
placeholder publishable key, `purchases.web.ts` does not exist in the app, and the app's
rail is RevenueCat. There is no live caller. Carrying two dead pages built on a deleted
stylesheet to protect a disabled feature would have been the worse trade.

**What has to happen before the web purchase rail is enabled — in this order:**

1. Decide where a completed checkout should land in the new site. There is no premium
   surface in phase 1; this is a product decision, not a URL swap.
2. Change `success_url` and `cancel_url` in `create-checkout-session` to that route.
3. Add the route to the web repo's `ROUTE_META` in `src/routes/routes.ts` so it is
   prerendered, and remove `/premium-success.html` from `LEGACY_REDIRECTS`.
4. `premium-success.html` also overclaimed — "All 25 Virtual Tours" — which the scope doc
   already flagged. Whatever replaces it should not inherit that.

---

## 2 · `client_config` — what phase 1 hardcoded waiting for it

Every one of these carries a `TODO(contracts):` comment at its use site.

| What | Where in the web repo | What it needs |
|---|---|---|
| The eleven interest slugs | `src/contracts/interests.ts` | The fourth hand-maintained copy, after the app's `interestTags.ts`, `trip-generate`'s `VALID_INTEREST_TAGS` and migration 0019. The column CHECK catches a wrong value loudly on write and catches nothing about labels or icons |
| Published place count | `ui_hero_sub`, `src/i18n/strings/en.ts` | The Figma reads "87 hand-picked places"; 181 are published. The number is dropped rather than shipped wrong or hardcoded |
| Avatar | `src/lib/auth.ts`, `initialsFor()` | `users` has no avatar column (20 columns). The header shows initials where the design draws a photo. Needs a column or a storage convention |
| Search | Header, drawer and footer inputs, all `disabled` | Both vector RPCs are `service_role`-only since 0028. The only client-reachable option is a substring `ilike` on `places_sync`. Needs an endpoint, or an honest substring filter with copy to match |
| Ask Pete | Hero input, `disabled` | Needs the `mike` request/response contract, the three envelope shapes, the SSE parser's two recorded fragilities, and a ruling on the shared per-uid thread and daily cap |

---

## 3 · Where `onboarding_completed` flips — the divergence is now in two clients

The web writes `interests` **and** `onboarding_completed: true` in one PATCH at the
interests step, as specified. The app writes `interests` on `interests.tsx` and flips
`onboarding_completed` later, at entry-choice / traveller-type.

So a web-onboarded user reaches the app with the flag `true` and `traveler_type` NULL. The
app copes — My CyprusWay redirects to the picker — but the two state machines disagree, and
now they disagree in a second codebase rather than in a two-day-old branch.

This was already observed in `web-command-centre-scope.md` §5. Its fix is item 4 of the
contracts list there: a server-side `complete_onboarding(interests, traveler_type?)` RPC, so
neither client decides where the flag flips. Phase 1 does not attempt a client-side
reconciliation and does not add a guard; it writes what it was told to write and marks it.

---

## 4 · Awin is scrapped; the build spec still prescribes it

Not caused by this work, found while sweeping the website repo for Awin references.

`cyprusway-app/docs/BookWithPete_B1_B2_Build_Spec.md`, under a heading marked
**"CRITICAL — host allowlist"**:

- line 33 — *"Booking.com runs through CJ for European publishers; GetYourGuide runs
  through Awin."*
- line 37 — prescribes `www.awin1.com  (Awin — GetYourGuide)` as a required allowlist entry
- line 319 — *"GetYourGuide is on the existing Awin account"*

An implementer following that spec will allowlist a network that no longer exists and
produce dead affiliate routes.

`CyprusWay_Decision_Log_v3_0.md` line 1289 already contradicts it — *"Host allowlist basis
is void … GetYourGuide is now direct, not via Awin"*, marked **"Load-bearing before any
GetYourGuide route is authored."** So the spec was already stale before the CJ switch; it
is now stale for two reasons.

**One thing the CJ switch makes more urgent, unprompted:** that same entry records that CJ
rotates its redirect host across `anrdoezrs.net`, `dpbolvw.net`, `tkqlhce.com` and
`jdoqocy.com`, and only the first is allowlisted. If CJ is now the only network, that
allowlist is one rotation away from breaking every affiliate link.

Nothing in phase 1 touches this — the website repo has no affiliate code and
`affiliate_routes` is empty — but the spec should be corrected before anyone builds
against it.

---

## 5 · Nothing needed on the Supabase auth side

Recorded so it is not re-checked. The redirect allowlist already covers everything phase 1
produces:

```
https://cyprusway.eu/**
http://127.0.0.1:5500/**
https://cyprusway-website.almirante-danieljohn.workers.dev/**
https://*-cyprusway-website.almirante-danieljohn.workers.dev/**
```

`redirectTo` is built from `window.location.origin + window.location.pathname` at click
time, so production, the dev origin and every Workers **preview** deployment are covered
without a change. No auth-config change, no migration, no new redirect URL.

The one thing that is worth knowing: the web client uses `flowType: 'pkce'`, where the code
and any error arrive in the **query string**. The vanilla implementation used the implicit
flow and read the fragment. Nothing server-side changes, but anyone comparing the two
clients should not expect the same URL shape.
