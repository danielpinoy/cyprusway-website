# CyprusWay Web Onboarding — Implementation Plan

Phase 0 output. Nothing below has been implemented. Awaiting approval.

Read before writing this: `css/style.css` (all 1432 lines), `js/auth.js`, `js/config.js`,
`js/i18n.js`, `js/lang.js`, `js/main.js`, `js/stripe.js`, `js/cookie-consent.js`,
`premium.html`, `index.html`, the script blocks of all ten HTML files, `README.md`.
Figma nodes `3558-19485`, `3558-19760`, `3558-19556`, `3558-19871` pulled via
`get_design_context` + `get_metadata` (exact geometry, not eyeballed). `3491-23798` and
`3558-19681` not opened.

---

## 0. Branch — the instruction cannot be followed as written

**`payments-ledger-0043-0046` and commit `2f55e81` do not exist in this repository.**

```
$ git cat-file -t 2f55e81   →  fatal: Not a valid object name 2f55e81
$ git branch -a             →  main, remotes/origin/main   (nothing else)
```

This is the website repo — `danielpinoy/cyprusway-website`. It has no `supabase/`
directory, no migrations, no edge-function sources, and never has had: the initial commit
is a static site. Migrations 0043–0046 and the deployed function bundles live in the
backend repo, which is not on this machine (checked the parent folder — only docs).

**Why this is not blocking.** The brief supplies every backend fact this work depends on
as *measured, treat as fact, do not re-derive*: the trigger, the RLS grants, the redirect
allowlist, the `onboarding_completed` semantics with live counts, the interest slug list,
the `.select('id')` rule. None of the web work reads a migration or a function source.
The premium path calls `create-checkout-session` / `promo-redeem` by URL only, and
`stripeEnabled` stays `false`.

**What I will do instead:** branch from current `main` (`37122e3`) as `web-onboarding`.
If a backend checkout is expected to be present, say so and I will re-base onto it before
implementing.

**Delivery:** changes staged with `git add`, no commit, no push, per the constraint.

---

## 1. File-by-file change list

### New

| File | Why |
|---|---|
| `js/supabase-client.js` | Single owner of client creation. Lazily injects the SDK, memoises one client, exposes it. Removes the duplicated credentials currently hardcoded as a fallback inside `auth.js`. |
| `js/onboarding.js` | The whole feature: the card, both modes, the interests screen, the return-leg router, the error banner. |
| `images/interests/*.png` (11 files) | The chip thumbnails from Screen 2. Exported from Figma at 48×48 (2× for the 24px display size), ~5 KB each, ~55 KB total. Raster photos — they cannot be inlined as SVG. |
| `ONBOARDING-VERIFICATION.md` | The eleven-point report, written at the end. |

### Modified

| File | Change |
|---|---|
| `css/style.css` | One appended section, `/* --- Onboarding --- */` under a `====` banner, matching the file's existing comment style. One property added to `:root` (`--alert`). Four selectors added to the existing `prefers-reduced-motion: reduce` block. Nothing existing edited. |
| `js/i18n.js` | Appended `/* === onboarding === */` block, 28 `onb_*` keys × 5 languages, before the closing `};`. Nothing existing touched. |
| `js/lang.js` | Two additions (detail in §4). No rewrite — the translation data and switcher logic are untouched. |
| `js/auth.js` | Consumes `CW.getSupabase()` instead of creating its own client; drops the duplicated credential fallback; its `signIn()` is replaced by opening the card. Premium/promo/sign-out DOM wiring kept working, tidied. |
| all 10 `*.html` | Script block normalised (detail below) so the card works on every page. |
| `index.html` | Hero gains a `data-cw-auth="signup"` CTA. |
| `premium.html` | `#auth-sign-in-btn` becomes `data-cw-auth="signin"` and gains the Apple path for free. Eager SDK `<script>` kept. |
| all 10 `*.html` (header + mobile nav) | A `data-cw-auth="signin"` item — **see Question 1, this one is a product call, easy to strike.** |
| `README.md` | File inventory + a note that the onboarding card is script-injected. |

### Deleted

Nothing. I looked for placeholder pages worth removing and did not find a case: `faq.html`,
`404.html`, `privacy.html`, `terms.html` are all real content, and `sitemap.xml` references them.

### Script block, normalised

Today the ten pages load five different combinations. `404.html` loads `lang.js` without
`i18n.js`; `faq.html` loads `config.js` but neither; `privacy.html`/`terms.html` skip
`config.js`. It does not currently throw (`querySelectorAll('[data-i18n]')` is empty on
those pages, so the callback never runs) but the card cannot work under it. Every page gets:

```html
<script defer src="js/config.js"></script>
<script defer src="js/cookie-consent.js"></script>
<script defer src="js/i18n.js"></script>
<script defer src="js/lang.js"></script>
<script defer src="js/supabase-client.js"></script>
<script defer src="js/onboarding.js"></script>
<script defer src="js/main.js"></script>
```

`premium.html` keeps its eager `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2">`
plus `auth.js` and `stripe.js`. That page always needs the client on load (session +
premium check), so lazy-loading it there would only add a request waterfall.
`supabase-client.js` detects the already-present `window.supabase` and creates the client
synchronously, so `window.CW.supabase` exists at the same moment it does today.

A side benefit of this normalisation: `faq.html` and `404.html` get a working language
switcher, which they do not have now.

---

## 2. SDK loading

~120 KB on nine marketing pages that mostly do not need it. The approach:

**`supabase-client.js` exposes `window.CW.getSupabase()` → `Promise<client>`.**

1. If `window.supabase` already exists (premium.html), create the client immediately, set
   `window.CW.supabase`, return a resolved promise.
2. Otherwise, on first call, append `<script src="…supabase-js@2">` to `<head>`, resolve on
   `onload`, create the client, set `window.CW.supabase`, memoise the promise. Concurrent
   callers share it. `onerror` rejects once, and the caller shows the error banner.

**It is called from exactly two places:**

- a `data-cw-auth` click (the person has asked for it, ~200 ms of latency is invisible
  behind the card's own open animation);
- page load **only** when the return leg needs it — the URL fragment contains
  `access_token=` or `error=`, **or** a Supabase session is in `localStorage`.

The session probe is a key scan for `/^sb-.*-auth-token$/`, not a hardcoded key, so a
project-ref change cannot break it. If the key format ever changed, the worst case is that
an already-signed-in user's interests modal does not auto-open — the explicit triggers and
premium.html still work.

**This also fixes a real ordering hazard.** `detectSessionInUrl` is on by default and the
SDK clears the fragment as it initialises. Because `onboarding.js` runs *before* the SDK
exists, it snapshots `window.location.hash` first, so `#error=` and `#error_description=`
are readable no matter what the SDK does to the URL afterwards.

The flow stays **implicit** — supabase-js v2's default, which is what produces the fragment
the brief describes. No `flowType` option is passed, matching `auth.js` today.

---

## 3. The return leg

Runs on every page, at `DOMContentLoaded`, before anything else touches auth.

```
snapshot hash  →  hasTokens = /access_token=/ , hasError = /error=/
                  (read before the SDK can strip it)

if hasError                       → banner, mode = signin. STOP.
if !hasTokens && no stored session→ do nothing. STOP.       (rule 1)

show the loading state (full-page-load, so it is visible)
getSupabase() → getSession()
  ├ rejects / throws              → banner. never onboarding.
  ├ no session                    → if hasTokens: banner   (tokens that would not resolve)
  │                                 else: dismiss, do nothing
  └ session
      select onboarding_completed from users where id = uid  (maybeSingle)
        ├ error, or row is null   → banner. never onboarding.
        ├ true                    → dismiss. signed in, nothing shown.   (rule 3)
        └ false                   → interests screen.                     (rule 2)
```

Every failure edge lands on the banner. There is no path from an unresolved session to the
signup card — the incident the brief describes cannot occur, because the signup card is
only ever opened by an explicit `data-cw-auth="signup"` click or `?mode=signup`, never by
the router.

`onboarding_completed` is the only completion signal read or written. `interests` is never
consulted for routing. `is_first_time_visitor` is never touched.

**One addition I am flagging rather than sneaking in:** rule 2 fires on *every* page load
for a user with `onboarding_completed = false`, so navigating the site would re-pop the
modal on each page. If they close it, I set a `sessionStorage` flag that suppresses the
auto-open for the rest of that tab session. Explicit triggers still open it. The Figma
interests frame has a close button, so the screen is dismissible by design — this just
makes dismissal mean something. Say the word and I will drop it.

`redirectTo` is `window.location.origin + window.location.pathname`, computed at click
time. Never hardcoded, no query string carried across, and every allowlist entry covers
`/**` so any page can be the landing page.

---

## 4. `js/lang.js` — it does not handle attributes, so I am extending it

`applyTranslations` handles `textContent`, `<input>`/`<textarea>` placeholders, and
`innerHTML` when `data-i18n-html="true"`. It has no attribute path. Two additions:

1. **`data-i18n-attr`** — `<button data-i18n="onb_close" data-i18n-attr="aria-label">`
   sets the named attribute instead of the text. Needed for the close button's accessible
   name and the chips' `aria-label`.
2. **`window.CW.i18n = { apply, t, lang }`** and a `cw:lang` `CustomEvent` on `document`
   when the language changes. The card is injected after `lang.js` has already run, so it
   needs to translate itself on inject; and a language switch while the card is open needs
   to reach it. `setLang` already calls `applyTranslations(document)` — with the card in
   the DOM that covers it, and the event covers the strings `onboarding.js` sets
   imperatively (pending labels, error text).

Neither touches the dictionary or the switcher. Translation data is untouched.

---

## 5. CSS — class names and the properties each uses

Appended to `css/style.css`, mobile-first, `640px` / `900px`, flexbox, no absolute
positioning for layout. Every class below is new; I grepped for `onb`, `modal`, `overlay`
and found no collisions.

| Class | Custom properties used |
|---|---|
| `.onb-overlay` | — (fixed, `z-index: 10000`; above the cookie banner's 9999) |
| `.onb-overlay::before` | scrim, `linear-gradient` over `--navy` — same technique as `.hero-editorial::before` |
| `.onb-overlay.is-open` | — |
| `.onb-card` | `--sand`, `--radius-lg`, `--shadow-lg`, `--font-body` |
| `.onb-card--auth` | max-width 418px |
| `.onb-card--interests` | max-width 522px |
| `.onb-close` | `--text-muted`, `--radius` |
| `.onb-head` | — |
| `.onb-title` | `--font-heading`, `--navy` |
| `.onb-subtitle` | `--font-body`, `--text-muted` |
| `.onb-actions` | — |
| `.onb-provider` | `--white`, `--border`, `--radius`, `--navy`, `--font-body`, `--shadow-sm` |
| `.onb-provider:hover` | `--navy` |
| `.onb-provider:focus-visible` | `--teal` |
| `.onb-provider[disabled]` | — (opacity + `cursor: not-allowed`) |
| `.onb-provider-icon` | — (20×20 box) |
| `.onb-alert` | `--alert` **(new)**, `--radius` |
| `.onb-alert-icon` | `--alert` |
| `.onb-alert-text` | `--alert`, `--font-body` |
| `.onb-chips` | — |
| `.onb-chip` | `--white`, `--border`, `--text`, `--font-body` |
| `.onb-chip:focus-visible` | `--teal` |
| `.onb-chip[aria-pressed="true"]` | `--gold`, `--navy` |
| `.onb-chip-img` | — (24px circle) |
| `.onb-submit-row` | — |
| `.onb-btn` | `--radius`, `--font-body` |
| `.onb-btn--secondary` | `--navy`, `--white` |
| `.onb-btn--primary` | `--gold`, `--navy` |
| `.onb-btn[disabled]` | — |
| `.onb-btn:focus-visible` | `--teal` |
| `.onb-loading` | `--text-muted` |
| `.onb-spinner` | `--border-light`, `--teal` |
| `@keyframes onbSpin` | — |
| `body.onb-lock` | — (scroll lock while open) |

Existing `.wordmark` and `.sr-only` are reused rather than reimplemented.

### The one new `:root` property

```css
--alert: #F05D5D;   /* error banner — Figma color/alert */
```

Figma's alert red has no repo equivalent. What exists today is two unrelated ad-hoc reds —
`#c0392b` in `.auth-error` and `#c53030` in `.promo-error` — neither of which is this
colour and neither of which is a token. Naming follows the block's convention (bare colour
name, no prefix), sitting with `--terracotta` / `--olive`.

The banner's fill is Figma's `rgba(240,93,93,0.2)`, i.e. the same colour at 20%. Rather
than add a second token or hardcode the rgba, the tint is
`color-mix(in srgb, var(--alert) 20%, transparent)` — one token, exact match. `color-mix`
is Baseline 2023 (Chrome 111 / Safari 16.2 / Firefox 113). If you would rather not depend
on it, the alternative is a second `--alert-tint` property; tell me and I will switch.

---

## 6. Figma vs. this repo — every conflict and its resolution

### Colour

| Figma | Value | Repo | Resolution |
|---|---|---|---|
| `color/sand` | `#f5f0e8` | `--sand` `#F5F0E8` | Exact match. Card background. |
| `color/white` | `#ffffff` | `--white` | Exact match. |
| `color/navy` | `#1b3b6b` | `--navy` `#0C3547` | Repo `--navy`. Different blue; the site's is the identity. |
| `color/black-2` | `#403d4a` | `--text` `#1f2d33` | Repo `--text` for body copy; `--navy` for the "Explore" button fill (see below). |
| `color/grey-3` | `#5a6370` | `--text-muted` `#6b7679` | Repo `--text-muted`. Sublines, close icon. |
| `color/grey-2` | `#afbacb` | `--border` `#e0dbd0` | Repo `--border`. Chip and provider-button borders. |
| `color/gold` | `#c49a10` | `--gold` `#F59E0B` | Repo `--gold`. Selected chip, primary button. |
| `color/alert` | `#f05d5d` | *none* | **New `--alert`** (§5). |

**Explore button fill.** Figma paints it `color/black-2` `#403d4a`, a warm grey-black that
does not exist here. `--navy` is the site's dark and the closest in role. Using `--text`
would put near-black body-copy colour into a large fill, which the repo never does.

**Gold buttons: white text in Figma, navy text here.** `.btn-primary` is
`background: var(--gold); color: var(--navy)`, and it is that way on every page. White on
`#F59E0B` measures 2.1:1; navy measures 7.5:1. Following the repo convention is both
consistent and legible. → repo wins.

**Selected chip label — the one place I am deviating on purpose, and it needs your call.**
The brief says "gold border, gold text, tinted background." Figma (`3558-19871`) shows a
2px gold border, gold label, and a background that stays **white**, not tinted.

The problem is the label. `--gold` `#F59E0B` on white is **2.1:1**. Figma's own darker
`#c49a10` is 3.6:1. Both fail AA for 13px text (4.5:1 needed), and the site ships to the EU
where the Accessibility Act applies from June 2025.

What I will build unless you say otherwise:

- 2px `--gold` border — the primary signal, kept exactly
- gold-tinted background, `color-mix(in srgb, var(--gold) 10%, var(--white))` — **adds** the
  tint the brief asks for and Figma omits
- label in `--navy` at weight 600 — 7.5:1

The chip still reads unmistakably as gold-selected; only the four words inside it are
navy instead. Reverting to a literal gold label is a one-line change if you prefer the
design as drawn. **See Question 2.**

### Radius, type, spacing

| | Figma | Repo | Resolution |
|---|---|---|---|
| Card radius | `radius/lg` 24px | `--radius-lg` 12px | `--radius-lg`. No hardcoded radii. Card reads slightly less rounded than the frame. |
| Button/chip radius | `radius/sm` 8px | `--radius` 8px | Exact match. Chips keep `999px` (a pill, not a token value — same as `border-radius: 50%` on `.premium-check`). |
| Headings | SF Pro Bold 20/24px | `--font-heading` (Playfair Display) | `--font-heading`. Every heading on the site is Playfair; a sans heading only inside the modal would look imported. |
| Body / buttons / chips | SF Pro 13px | `--font-body` (Inter) | `--font-body`. |
| Button text size | 13px | `.btn` is `0.95rem`/700 | `0.95rem` for provider and submit buttons — they should feel like the site's buttons. Chips stay `0.85rem`, close to Figma's 13px. |
| Shadows | none on the card | `--shadow-lg` | `--shadow-lg`. The Figma card floats on a photo with no shadow; on a real page over content it needs one. |

### Structure

**The card is ~43% shorter than the frame, and that changes the padding.** Measured from
`get_metadata`: the frame's card is 418×645 — 48px top/bottom padding, 24px sides, a 32px
gap between the header stack and the form, 24px inside the header, 12px between form rows.
Stripping the email field, password field, "or" divider, and both form buttons removes
276px of the 392px form. What is left:

```
48  top padding
125 header      (logo 29 · gap 24 · heading 72 = 3 lines at 24px)
32  gap
116 actions     (Google 52 · gap 12 · Apple 52)
48  bottom padding
—— 
369  vs 645
```

There is no dead space to remove, because the card is a flex column with `height: auto` —
nothing holds the old height open. The imbalance is the **padding ratio**: 96px of vertical
padding was 15% of a 645px card and is 26% of a 369px one, which reads as top-and-tailed.
Resolution:

- `.onb-card--auth`: `2.5rem 1.5rem` (40/24) at ≥640px — sides exactly as Figma, vertical
  trimmed 8px
- `.onb-card--interests`: `3rem` (48) at ≥640px — exactly as Figma, which is already
  balanced for its 445px height
- both: `1.75rem 1.25rem` below 640px
- the 32 / 24 / 12 rhythm inside is kept unchanged at every width

In signin mode the header is 101px (logo · gap · one-line heading · 4px · subline), giving
a 345px card. Same rules, no special-casing.

**The close button** sits at 16/16 from the top-right in both frames, absolutely positioned
against the card. That is legitimate absolute positioning — a corner affordance, not
layout — and matches how `.dest-strip-card-label` is done. Kept.

**Backdrop photo.** The frames sit on *High Angle View Split Croatia* — a stock photo of
Split, Croatia, in a Cyprus product. Placeholder. The overlay will use
`images/Paphos harbour.jpg`, the lightest of the seven real Cyprus photos already in the
repo (1.2 MB), under a navy gradient scrim built the same way as `.hero-editorial::before`.
`background-image` is assigned in JS when the card opens, so no page pays for it up front,
and it is a CSS background so it is decorative with no `alt` to get wrong.

**Logo lockup.** Figma pairs a wave logomark with an all-navy "CyprusWay". This repo has no
logomark in use anywhere — the header on all ten pages is `.wordmark`, Cyprus in `--navy` +
Way in `--gold`. The card reuses `.wordmark`. I can commit the Figma logomark as
`images/logomark.svg` recoloured to `--navy` and use the full lockup instead; **see
Question 3.**

**Google icon.** Figma's export uses off-brand greens and reds (`#50A758`, `#F05D5D`
instead of `#34A853`, `#EA4335`). `premium.html` already contains the correct four-colour
Google G. Reusing the repo's is both brand-correct and the skill's own "reuse what the
project has" rule. **Apple**, **close**, and **lock** glyphs come from the Figma exports,
path data verbatim, inlined as SVG strings in `onboarding.js` — the repo inlines every SVG
it uses (`.lang-globe`, `.cat-icon`, the Google G) and has no SVG files in `images/`, so
inlining matches convention and avoids three extra requests. The vector data is the
exported data; nothing is hand-drawn.

**Error banner icon** is a padlock (`Lock-6-Streamline`). Semantically odd for "we couldn't
sign you in", but the brief says take the banner's icon, so it is taken as-is.

**Banner position.** In `3558-19760` it sits at the bottom of the form stack, directly
above the submit button — immediately before the action. After stripping, the action *is*
the two provider buttons, so the banner goes at the top of the actions stack, directly
above "Continue with Google". Same relationship, same styling, same 370px full width.

**Disabled primary — the brief is slightly wrong here, in your favour.** The brief says the
Figma empty state shows no disabled styling. It does: the button row in `3558-19556`
carries `opacity: 0.6`, and the row in the selected state `3558-19871` does not. So the
design *does* specify the treatment. I will use it, and add what it genuinely lacks — the
real `disabled` attribute, `aria-disabled`, and `cursor: not-allowed`, so it is disabled to
a keyboard and a screen reader and not only to the eye. That is the deviation.

**Interests screen chips** are 40px pills: 8px padding, 24px circular photo, 10px gap,
13px label, 8px grid gap, `flex-wrap` + `justify-center`. Figma's 1440px frame happens to
group them 3/3/3/2; that grouping is an artefact of a 426px row, not a rule. They wrap
naturally at every width, as instructed.

### Responsive, derived

No mobile frames exist. Mobile-first, using the repo's `640px` and `900px` and no new
breakpoints:

- **base (< 640px)** — overlay `padding: 1rem`; card `width: 100%`, `max-width: none`,
  padding `1.75rem 1.25rem`; backdrop `background-size: cover`; submit row keeps
  `flex-wrap: wrap` with `min-width: 140px` per button, so at 360px the two buttons stack
  by themselves rather than at an arbitrary breakpoint; button horizontal padding drops
  from 2.5rem to 1.25rem
- **≥ 640px** — card `max-width` 418 / 522, padding to the Figma values above, submit row a
  fixed two-up
- **≥ 900px** — no change; the card is already at its design size

Card height is capped at `max-height: calc(100dvh - 2rem)` with a `100vh` fallback and
`overflow-y: auto`, so the interests card scrolls inside itself on a 360×640 screen rather
than pushing the page.

Reduced motion: the four onboarding selectors that animate get added to the existing
`@media (prefers-reduced-motion: reduce)` block, matching how the rest of the file handles it.

---

## 7. Accessibility

- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing at `.onb-title`
- focus moves to the card on open; focus trap over the card's tabbables; `Escape` closes;
  focus returns to the triggering element (stored on open, re-focused on close)
- background inert while open: `body.onb-lock` for scroll, and the overlay covers at 10000
- error banner is `role="status" aria-live="polite"` — it is rendered into a region that
  exists before the message does, so the announcement actually fires
- chips are real `<button type="button">` with `aria-pressed`, toggled on click and on
  Space/Enter for free
- `:focus-visible` rings in `--teal` on every interactive element. Worth noting: the repo
  has exactly one focus style today (`.promo-input:focus`) and no rings on any button, so
  this is the first visible keyboard affordance on the site
- the backdrop photo is a CSS background — decorative, unreachable, no `alt`
- both provider buttons disable and show a pending label while a request is in flight;
  a module-level `busy` flag makes a double-tap a no-op even before paint

---

## 8. i18n

28 new `onb_*` keys, 5 languages each, appended to `js/i18n.js`. Every user-visible string
in the feature has one — headings, sublines, both button labels, all eleven chip labels,
both submit labels, both error messages, the pending and loading states, and the close
button's `aria-label` (via the new `data-i18n-attr`).

```
onb_signup_title  onb_signin_title  onb_signin_sub  onb_google  onb_apple
onb_close  onb_loading  onb_pending  onb_saving
onb_err_signin  onb_err_save
onb_interests_title  onb_interests_sub  onb_explore  onb_mycw
onb_signin_trigger  onb_signup_trigger
onb_i_beach_coast  onb_i_ancient_ruins  onb_i_local_food  onb_i_wine_villages
onb_i_nature_trails  onb_i_nightlife  onb_i_adventure  onb_i_culture_art
onb_i_kid_friendly  onb_i_hidden_gems  onb_i_churches_monasteries
```

Key names carry the **slug**, not the label, so the mapping to the database is readable at
a glance and a label rewording never desynchronises from the CHECK constraint. The slug
list is stored once in `onboarding.js` and the labels come from the dictionary; the two
cannot drift.

---

## 9. Interests write

Exactly as specified, one PATCH, both columns, `.select('id')` required:

```js
client.from('users')
  .update({ interests: selected, onboarding_completed: true })
  .eq('id', user.id)
  .select('id')
```

Treated as failure: `res.error` non-empty, **or** `res.data` empty/zero-length. Both show
the banner and leave the screen open with the selection intact so it can be retried.
No client-side row creation, no upsert, no `interests <> '{}'` check anywhere.

Slugs sent are exactly the eleven from the brief. No `villages`, no `water_sports`, no
`petes_picks`.

---

## 10. Error copy

Neutral, no self-blame, per the Apple rate-limiting note:

- OAuth failure — **"We couldn't sign you in. Please try again."**
- interests write failure — **"We couldn't save your interests. Please try again."**

Nothing says "on our end". Both are `onb_err_*` keys in all five languages.

---

## 11. Copy owed — flagged, not invented

1. **Signin subline** — using the placeholder **"Sign in to pick up where you left off."**
   It is flatter than the site's voice ("Your companion for discovering Cyprus"). Needs a
   real line. Changing it later is one dictionary entry.
2. **"Explore" vs "My CyprusWay"** — the design does not say what differs. Both save
   identically, then:
   - **Explore → `destinations.html`** — the browse surface, and "Explore all destinations"
     is already the CTA wording on `index.html`
   - **My CyprusWay → `premium.html`** — chosen because it is the only page on the site
     that renders a signed-in state at all. It is the weaker of the two: routing someone
     who has just signed up to a page about paying is not obviously right, and there is no
     personal area on the web to send them to instead. **Please correct this one.**
3. **"Sing In" typo** in the Figma heading — out of scope, not carried anywhere.

---

## 12. Questions

**Q1 — A "Sign in" item in the site header?** The card opens from anything with
`data-cw-auth`. Placement is a product decision, not a design one. `index.html` (hero,
signup) and `premium.html` (signin) satisfy the requirement on their own — but a signed-out
visitor on `about.html` or `features.html` then has no way in. My recommendation is a
`data-cw-auth="signin"` item in the desktop nav and the mobile nav on all ten pages. It is
planned, and it is a clean strike if you would rather the site stayed marketing-only.

**Q2 — Selected chip label: navy (accessible) or gold (as drawn)?** §6. My default is navy
at 7.5:1 with the gold border and tint carrying the state. Gold is 2.1:1.

**Q3 — Logomark in the card?** Reusing `.wordmark` by default. I can commit the Figma
logomark as `images/logomark.svg`, recoloured to `--navy`, and use the full lockup — but
it would then be the only place on the site that shows it.

**Q4 — `color-mix()`, or a second `--alert-tint` token?** §5. Default is `color-mix`,
one token, exact.

**Q5 — Does a backend checkout exist that I should have branched from?** §0. Not blocking;
asked so the record is straight.

**Q6 — Verification points 3, 4, 5, 6 and 10 need a real sign-in.** They require completing
Google and Apple OAuth with an actual account, and 5/6 need a user with
`onboarding_completed = false` plus a row read-back afterwards. I can serve the site on
`http://127.0.0.1:5500` and drive Chrome, but I cannot authenticate as you. Either:
(a) you run those four points and I report your result, or (b) if you are already signed
into Google in Chrome, I drive it and you approve the consent screen when it appears.
Points 1, 2, 7, 8, 9, 11 I can verify end-to-end on my own. Worth settling before I start,
so the environment is ready.

---

## 13. Constraint check

| Constraint | Held |
|---|---|
| No build step, framework, npm | Yes — one appended CSS section, two new plain-JS files |
| No new CSS file | Yes — appended to `css/style.css` |
| No `<form>` submit navigation | Yes — every control is `type="button"` with a click handler; no `<form>` element in the feature |
| Don't flip `stripeEnabled` / `promoCodesEnabled` | Untouched |
| No secrets committed | Nothing added; the anon key stays where it is. The *duplicated* copy of it inside `auth.js`'s fallback is removed, leaving `config.js` as the only place it appears |
| No migration written or applied | None |
| No commit, no push | Staged only |
| No guest/anonymous auth | Not built |
| No email, password, or "Forgot password?" | Not built |
| No linking / merging / duplicate-detection UI | Not built — the Hide My Email split is left as the accepted risk |
| `js/config.js`, `js/i18n.js`, `js/lang.js`, `:root`, `js/stripe.js` preserved | `config.js` and `stripe.js` untouched; `i18n.js` appended to; `lang.js` extended per the brief's own instruction; `:root` gains one property as permitted |
| ES5 flavour — IIFE, `'use strict'`, `var`, `.then()`, no arrows | Yes, in both new files and in the `auth.js` changes |
| Figma output not used as code | Yes — geometry and states taken from it, CSS written in this repo's idiom, no generated class names, no absolute layout, no hardcoded hex/font/radius/shadow |
