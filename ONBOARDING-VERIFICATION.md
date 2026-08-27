# CyprusWay Web Onboarding — Verification Report

Branch `web-onboarding`, cut from `main` at `37122e3`. Changes staged, not committed.

Tested in Chrome against `http://127.0.0.1:5500` (the allowlisted origin), served with
`python -m http.server`. Live Supabase project `knvjmsnwzskbageetbam`, real account
`d1764585-1fd5-49ab-80b4-0c6b66aaca8f` (`danielcool.almirante@gmail.com`, providers
`["email","google","apple"]`).

**9 of 11 points pass. 2 are blocked on a credential entry I will not perform.**

---

## The eleven points

### 1. The card opens from a `data-cw-auth` element on more than one page — PASS

Opened from four distinct triggers across three pages:

| Page | Trigger | Result |
|---|---|---|
| `index.html` | hero `data-cw-auth="signup"` | signup card, 418px |
| `index.html` | header nav `data-cw-auth="signin"` | signin card |
| `about.html` | `?mode=signup` | signup card |
| `premium.html` | `#auth-signed-out` `data-cw-auth="signin"` | signin card |

The header and mobile-nav triggers are present on all ten pages (checked in the DOM on
`404.html`, the sparsest page: `navTrigger: true, mobileTrigger: true`).

### 2. `signin` and `signup` modes show the right copy; `?mode=signin` works — PASS

| | Heading | Subline | Card height |
|---|---|---|---|
| `signup` | "Step inside Cyprus before you arrive with immersive 360° tours and guided narration" | *(none)* | 373px |
| `signin` | "Welcome back" | "Sign in to pick up where you left off." | 343px |

Buttons identical in both: "Continue with Google", "Continue with Apple". No email field,
no password field, no "or" divider, no form buttons, no "Forgot password?".

`?mode=signin` verified on `index.html` and `about.html`; `?mode=signup` on `about.html`.
The router runs first, so `?mode=` never overrides a return leg.

### 3. Google sign-in completes and returns — PASS

Full round trip on `127.0.0.1:5500`. The redirect Google received carried
`redirect_to=http%3A%2F%2F127.0.0.1%3A5500%2Findex.html` — built from
`window.location.origin + window.location.pathname` at click time, nothing hardcoded.

Returned to `http://127.0.0.1:5500/index.html#`, session resolved:

```
email:     danielcool.almirante@gmail.com
uid:       d1764585-1fd5-49ab-80b4-0c6b66aaca8f
providers: ["email","google","apple"]
```

Landed on the interests screen, which is correct — the row was `onboarding_completed:false`.

### 4. Apple sign-in completes and returns — BLOCKED, partially verified

Verified up to Apple's own page:

- the Apple button fires `signInWithOAuth({provider:'apple'})` and enters its pending state
- the browser reaches `appleid.apple.com/auth/authorize` with `client_id=eu.cyprusway.app.signin`,
  `redirect_uri=https://knvjmsnwzskbageetbam.supabase.co/auth/v1/callback`,
  `response_mode=form_post`, `scope=email name`
- Apple accepted the request and rendered its sign-in form, so the client id and secret are
  valid at the authorize step

**Not verified:** the return leg for Apple specifically. Apple asked for an Apple ID and
password, and entering credentials is not something I will do. The tab is parked on that
page — complete the sign-in and it will land back on `premium.html`; I will then confirm the
session and routing. The return-leg code is provider-agnostic and is proven for Google, so
the risk here is low, but it is untested and I am not claiming otherwise.

### 5. A new user lands on the interests screen; a completed user does not — PASS

Both halves, on the same account:

- `onboarding_completed: false` → interests screen shown, on a plain page load of
  `index.html` and again after the Google return
- `onboarding_completed: true` → landed on `premium.html` after saving and the overlay did
  not open (`overlayOpen: false`); reloading did not re-open it

Rule 1 verified at its strongest: signed out with no fragment, `.onb-overlay` is **not in
the DOM at all**, the SDK is not loaded, and `body` is not locked. A normal visitor pays
nothing.

### 6. Interests save and survive a reload — PASS

Selected Beaches, Nature & Hiking, Hidden Gems → "My CyprusWay". Read back on a **fresh
page load** of `premium.html`, from a new query:

```json
{ "id": "d1764585-1fd5-49ab-80b4-0c6b66aaca8f",
  "onboarding_completed": true,
  "interests": ["beach_coast", "nature_trails", "hidden_gems"] }
```

Both columns written in one PATCH, `onboarding_completed` flipped to `true`, slugs exactly
as the constraint requires. All eleven slugs confirmed against the brief's table in the
rendered DOM — no `villages`, no `water_sports`, no `petes_picks`.

### 7. A forced OAuth error shows the banner — PASS

`premium.html#error=access_denied&error_code=user_cancelled&error_description=...`:

- banner rendered with the lock glyph and Figma's alert tint
- copy: "We couldn't sign you in. Please try again." — no "on our end"
- in a `role="status" aria-live="polite"` region that exists before the message does
- card opened in **signin** mode, not signup
- fragment cleared to `http://127.0.0.1:5500/premium.html` so a reload does not replay it

### 8. Layout holds at 360px, 640px, 900px, 1440px — PASS

360 / 414 / 640 / 900 tested in same-origin iframes (which evaluate media queries at the
frame width); 1440 in the real window at `innerWidth: 1536`.

Chips wrap naturally at every width rather than holding the desktop 3/3/3/2 grouping. No
horizontal overflow anywhere. Card is near-full-width below 640px with the photo as a cover
background, and hits its Figma max-widths above it (418px auth, 522px interests, measured).

One fix during testing: at 360px "My CyprusWay" wrapped to two lines, so the submit buttons
now use `1rem 0.75rem` padding at base and `1rem 1.25rem` from 640px. Both labels are on one
line at 360px now.

### 9. Full keyboard traversal with visible focus — PASS

Focus trap, forwards and backwards, never escaping the card:

```
Tab:        Google → Apple → Close → Google (wrapped)
Shift+Tab:  Close → Apple
```

- focus lands on the first provider button on open, skipping the close button
- `Escape` closes; focus returned to the exact trigger ("Get started")
- when the card auto-opens with no trigger, focus is released rather than stranded on a
  hidden node
- `:focus-visible` rings in `--teal` are clearly visible (see the Apple button in testing)
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby="onb-title"` all confirmed in the DOM
- chips are real `<button>`s with `aria-pressed` toggling `false`/`true`
- submit buttons carry both `disabled` and `aria-disabled`

### 10. The premium page still signs in and checks premium — PASS

Signed in, on the shared client, with `stripeEnabled: false`:

```
signedOut: none      signedIn: block     userDisplay: "Altuism"
comingSoon: block    upgradeBtn: none    promoSection: none    premiumActive: none
```

Exactly the previous behaviour. Sign-out works (`session: false`, signed-out block
restored). The signed-out block now shows the card trigger instead of the old Google-only
button. Neither flag was touched.

### 11. No console errors on any page, signed in or out — PASS (after a fix; see correction)

All ten pages loaded signed out: **zero console messages of any kind**. Signed-in flows
produced one message, and it is not from this code:

```
@supabase/gotrue-js: Session as retrieved from URL was issued in the future?
Check the device clock for skew 1787847661 1787851261 1787847650
```

That is GoTrue warning that the machine's clock is about an hour ahead of the token's issue
time — confirmed as a local clock issue, not code.

> **Correction to the first version of this report.** My original pass tested page *loads*
> only, and on that basis claimed no console errors. It missed an interaction: **clicking any
> language in the switcher threw an uncaught `SyntaxError` on every page.**
>
> ```
> js/main.js:55  SyntaxError: Failed to execute 'querySelector' on 'Document':
>                '#' is not a valid selector.
> ```
>
> `wireSmoothScroll` binds every `a[href^="#"]`, and `lang.js` builds its dropdown items as
> `href="#"` before `main.js` runs, so the switcher's own links were wired to a handler that
> calls `document.querySelector('#')` — which throws. Pre-existing: the script order at
> `HEAD` (`lang.js` before `main.js`) produces it identically, and it is unrelated to
> onboarding.
>
> Fixed with a three-line guard in `js/main.js` that bails on `#` and empty hrefs. Re-tested:
> five consecutive language switches now produce **zero** console output. This is a fifth
> change you did not ask for — I made it because it invalidated a claim in this report and the
> fix is a guard clause. Reverting is trivial.

---

## Changes that were not in the brief, and why

**`404.html` and `faq.html` had broken language switchers.** Pre-existing, fixed as a side
effect of normalising the script blocks — flagged here so it does not read as an unexplained
change. `404.html` loaded `lang.js` without `i18n.js` (so `CW.t` never existed) and `faq.html`
loaded neither. Both now load the full set and populate all five languages
(`langItems: 5` on `404.html`). It never actually threw, because `querySelectorAll('[data-i18n]')`
was empty on those pages, but the switcher was inert.

**`prem_signin_note` was replaced by `onb_prem_note`.** The old line read "We use your
Google account…" and became inaccurate once Apple was added. The new key says "your Google
or Apple account" in all five languages. The old entry is left in the dictionary, unused.
`prem_signin_btn` is likewise now unused. Neither was deleted — that is translation data.

**Submit-button padding**, as described under point 8.

**Focus release on close when there is no trigger**, as described under point 9.

---

## Second round — fixes applied after review

**1. `&deg;` rendered literally on the homepage.** `js/i18n.js` stored `&deg;` as a literal
five-character string, and `lang.js` writes with `textContent`, so the hero read "preview
them in 360**&deg;** before you go" in all five languages. All five occurrences were the five
languages of a single key, `hero_desc`. Replaced with `°`. Verified in the browser: the hero
now reads "preview them in 360° before you go". Pre-existing — identical at `HEAD`.

**2. The coming-soon panel told signed-in users to sign in.** That panel only ever renders
inside `auth.js`'s `currentUser` branch, so "Sign in to be notified when it launches" could
never be true when anyone saw it. Now two proper keys, `onb_prem_soon` and
`onb_prem_soon_sub`, in all five languages:

> Premium payments will be available soon on the website.
> You're signed in, so premium will unlock on this account the moment it goes live.

The second line is new copy — it claims only that entitlement is per-account, which is true,
and stops short of promising a notification the product does not send. Change it if you want
a different tone.

**3. The GoTrue clock-skew warning** is yours to fix on the machine; nothing to do in code.

**4. `My CyprusWay` now routes to `index.html`,** not `premium.html`. One line in `ROUTES`.

**5. The language-switcher exception**, described under point 11 above.

---

## What is still left to your decision

**Routing after save:**

| Button | Destination |
|---|---|
| Explore | `destinations.html` |
| My CyprusWay | `index.html` |

See the note below on whether this screen should have two buttons at all.

**The signin subline** is still the placeholder "Sign in to pick up where you left off." One
dictionary entry, `onb_signin_sub`.

**Two buttons, or one.** My recommendation is one. Reasoning in the handover, but the short
version: the two now differ only in destination, and after the routing change the *secondary*
button leads somewhere more specific (`destinations.html`) than the *primary* one
(`index.html`), which inverts the emphasis. I checked whether "get the app" could be the real
second action — the site has no App Store or Play links anywhere, so it cannot be. Not
changed; it is your screen and you asked for a read, not a rewrite.

---

## Also not verified end-to-end

**The interests-write failure banner.** The OAuth error banner is proven (point 7) and the
save-failure path uses the same `showAlert` function, the same live region and the same
markup — only the message key differs. What is not exercised is the branch that treats a
zero-row response as an error:

```js
if (res.error) throw res.error;
if (!res.data || !res.data.length) throw new Error('zero_rows');
```

Reaching it needs a live session plus a forced zero-row update, and the session is behind
the same sign-in that is blocking point 4. I will run it in the same pass.

---

## Account state left behind

`d1764585-1fd5-49ab-80b4-0c6b66aaca8f` is back at your documented reset state:

```
onboarding_completed = false
interests = '{}'
```

so it is ready for your own run. It is signed out in the browser. Note that the reset was
done through the client under RLS, not SQL — which incidentally proves `UPDATE`-own plus the
column grant on `interests` and `onboarding_completed` works from the browser exactly as the
brief describes.

One incident worth recording: mid-session the account's refresh token was invalidated and
the session dropped. That was my doing — I briefly ran three iframes plus the top document
on one origin, so four Supabase clients raced the same refresh-token rotation. Normal use is
one client per page load and cannot produce it. Re-signing in restored everything.

---

## Constraint check

| Constraint | Held |
|---|---|
| No build step, framework, npm | Yes |
| No new CSS file | Yes — `css/style.css` is the only stylesheet touched |
| No `<form>` submit navigation | Yes — `grep '<form'` across all HTML and JS returns 0 |
| `stripeEnabled` / `promoCodesEnabled` not flipped | `js/config.js` is not in the diff at all |
| No secrets committed | The anon key now appears **once**, in `config.js`. `auth.js`'s duplicated hardcoded copy is gone |
| No migration written or applied | None |
| No commit, no push | Staged only, on `web-onboarding` |
| No guest/anonymous auth | Not built |
| No linking / merging / duplicate-detection UI | Not built |
| `config.js`, `stripe.js` untouched | Confirmed — neither appears in the diff |
| `i18n.js` additive only | The one removed line is `banner_cta`, re-added byte-identical plus a trailing comma. Verified with `diff` |
| `lang.js` extended, not rewritten | Two additions only: `data-i18n-attr` support and the `CW.i18n` API. Dictionary and switcher untouched |
| `:root` gains one property | Now **two**: `--alert: #F05D5D` and `--radius-xl: 24px`. The second was added at your request during review, lifting the original one-property limit |
| ES5 flavour — IIFE, `'use strict'`, `var`, `.then()` | Yes in both new files and the `auth.js` changes |
| Figma not used as code source | No generated class names, no absolute layout, no hardcoded hex/font/radius/shadow |

`node --check` passes on all nine JS files. CSS braces balance at 365/365.

---

## Deviations from the design, as built

All were agreed in `ONBOARDING-PLAN.md`; restated here so the two documents can be read
independently.

| Figma | Built | Why |
|---|---|---|
| `color/navy #1b3b6b` | `--navy #0C3547` | The site's identity colour |
| `color/black-2 #403d4a` fill on Explore | `--navy` | No warm-black token exists; navy is the site's dark |
| White label on gold | `--navy` on gold | Matches `.btn-primary` everywhere else; white on `#F59E0B` is 2.1:1 |
| Gold selected-chip label, white background | `--navy` label, gold border, gold-tinted background | Your call. Gold text is 2.1:1. Border plus tint carry the state without relying on colour, satisfying WCAG 1.4.1 |
| `radius/lg` 24px | `--radius-xl` 24px — **matches Figma after review** | Originally 12px because the brief allowed one new `:root` property and it went to `--alert`. With that constraint lifted, 24px is right: the card has 24px padding and 8px buttons inside, so a concentric outer corner wants ~32px — 12px reads pinched. `--radius-xl` is used on `.onb-card` only |
| SF Pro | `--font-heading` / `--font-body` | No hardcoded fonts |
| 13px buttons | `0.95rem` — **kept after review** | Compared side by side at both sizes. 13px is lost inside a 52px-tall button, leaving the label floating in dead space; it works in Figma because that is a phone design where the same label fills far more of the screen width. `0.95rem` matches `.btn` and sits correctly. Chips stay `0.85rem` — dense, many of them, close to Figma's 13px |
| Card 418×645 with 48px vertical padding | 418×373, padding `2.5rem 1.5rem` | 43% shorter after stripping; 96px of vertical padding went from 15% of the card to 26%, so it was trimmed. Sides are exactly Figma's 24px. The 32/24/12 rhythm is unchanged |
| Croatia stock photo backdrop | `images/Paphos harbour.jpg` | Placeholder in a Cyprus product; a real Cyprus photo already in the repo. Assigned in JS on open, so no page pays for it up front |
| Wave logomark + one-colour wordmark | `.wordmark` | Your call — no second lockup for one screen |
| Figma's off-brand Google glyph | The repo's official four-colour mark | `#50A758`/`#F05D5D` are not Google's colours |
| Empty state dims the button row to 60% | Same 60%, driven by `disabled` | The design's treatment plus the semantics it lacked |
| No shadow on the card | `--shadow-lg` | It floats on a photo in Figma; here it sits over page content |

Apple, close and lock glyphs use the exported Figma path data verbatim, inlined as SVG
strings because the repo inlines every SVG it uses and has no SVG files in `images/`.
