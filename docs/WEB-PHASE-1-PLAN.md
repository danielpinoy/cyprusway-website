# CyprusWay Web — Phase 1 Plan

Phase 0 output. **Nothing below is implemented.** Awaiting approval.

**What was read before writing this.** Every file at `main`: ten HTML pages, `css/style.css`
(1,432 lines), all seven `js/*.js`, `README.md`, `robots.txt`, `sitemap.xml`, `favicon.svg`.
The `web-onboarding` branch in full: `git log`, `ONBOARDING-PLAN.md`,
`ONBOARDING-VERIFICATION.md`, `js/onboarding.js` (593 lines), `js/supabase-client.js`, the
`i18n.js` and `style.css` diffs. `cyprusway-app/docs/web-command-centre-scope.md` (§§3–10).
`cyprusway-app/package.json`. All ten Figma nodes: variable definitions on six of them,
metadata on `3370-7099`, rendered screenshots of home-guest, home-user, header, footer,
menu, loading, error, RTL, auth card, interests-selected. Live headers on `https://cyprusway.eu`.

Two corrections to the brief's premises are in **§12**, and everything I disagree with is in
**§13**. The direct answer to the one open question is **§2**.

---

## 1 · Summary of what phase 1 builds

A Vite + React + TypeScript SPA replacing the repo contents, deployed to Cloudflare Workers
at `cyprusway.eu`, containing:

- the site shell from Figma — header, right-anchored overlay menu, footer
- design tokens taken from the Figma variable collection
- five languages ported mechanically from `js/i18n.js` + the `web-onboarding` additions
- RTL structural groundwork (no Hebrew)
- the auth card (Google + Apple, two copy states) and the interests screen
- loading and error states for the command centre shell
- a prerender pass so `/`, `/about`, `/faq`, `/privacy`, `/terms` ship as real HTML

The command centre's *content* is not built. The hero renders with a disabled Ask Pete input
and the rails below it do not exist yet.

---

## 2 · The open question — legal and marketing pages

**My answer: React routes, prerendered at build time. Same conclusion as yours, but for a
different primary reason, and the cost is higher than "a plugin and a config file."**

### What I found that changes the trade

**`privacy.html`, `terms.html` and `faq.html` contain zero `data-i18n` attributes.** Only
`about.html` is translated (37 keys). So three of the four pages are English-only today, and
the "duplicate the header and footer" cost under the static option is not just markup — it is
duplicating the language switcher into pages that have never had one, or freezing them in
English permanently. That is drift with a deadline on it.

**Search value is not where the framing put it.** Nobody searches for a privacy policy. What
privacy and terms need is to be *reachable and parseable by non-browser agents*: the **CJ**
publisher review (the current README names privacy, terms and contact as what reviewers check —
it names Awin as the network, which is stale; see §18), the Google and Apple OAuth consent
configurations that require a privacy-policy URL, and app-store listings. Those are exactly the
readers most likely not to execute JavaScript. `faq.html` and
`about.html` are the two with real search value — FAQ content is what long-tail and answer-engine
traffic lands on.

**The stronger argument for prerendering is not the legal pages at all — it's the home page.**
`cyprusway.eu/` is a fully-rendered marketing page today. Turning it into an empty `<div id="root">`
is an SEO regression on the one URL where ranking actually matters. The guest hero's
above-the-fold content — the H1, the sub-copy, the two option cards — is static copy, not user
data, so it prerenders cleanly. Once a prerender step exists for the home page, adding four
content routes to its route list is one array entry each.

**Point of disagreement, stated openly.** `web-command-centre-scope.md`'s "Do not do" list says
*"Do not move the marketing/legal pages into the bundle."* I am recommending the opposite. That
line was written for the one-client Expo/`react-native-web` architecture, where "the bundle" meant
prose rendered through React Native `<Text>` primitives inside a JS-only app with no prerender
story. Neither condition holds for a React DOM app with a static-generation pass. The reasoning
does not transfer; the recommendation shouldn't either. Flagging it so the two documents don't
silently contradict each other.

### What prerendering actually costs — you asked, so precisely

Not a plugin and a config line. It is:

| Item | Detail |
|---|---|
| `src/entry-server.tsx` | ~15 lines — `renderToString` inside `<StaticRouter>` |
| `scripts/prerender.mjs` | ~70 lines — loop the route list, inject into `dist/index.html`, write `dist/<route>/index.html` |
| A second build pass | `vite build` then `vite build --ssr`, then the script. Adds ~4–6s to CI |
| `src/main.tsx` branch | `hydrateRoot` when `#root` has children, `createRoot` when it doesn't |
| A discipline | Prerendered components must not touch `window`/`localStorage` at module scope or during first render. Enforced by the build failing, which is the right kind of enforcement |
| **New dependencies** | **Zero.** `react-dom/server` and Vite's `--ssr` flag are already there |

The alternative — `vite-react-ssg` — is one dependency and ~40 fewer lines, but it takes ownership
of the router entry point, which constrains how the phase-2 command-centre routes get written. I
would rather spend 70 lines than accept that constraint this early. If you'd prefer the dependency,
it's a same-day swap.

### URL shape, and the thing to decide now rather than later

Routes become `/privacy`, `/terms`, `/faq`, `/about`. Every existing inbound link and all nine
`sitemap.xml` entries use `.html`, so each legacy URL 301s to its clean path — one canonical URL
per page, link equity preserved.

**Implemented in the Worker, not in `public/_redirects`.** Q4 ruled for a Worker to return real
404s, and once that Worker exists, putting the redirects in it too means one source of truth and
no dependency on a static-assets feature I cannot verify from here. `_redirects` is not used.

**Multilingual URLs — decide now, cheap; decide later, expensive.** Today's five languages are
*already invisible to search engines*: one URL per page, text swapped by JS, no `hreflang`, no
per-language URL. Prerendering English only is therefore **parity, not a regression**. But if you
ever want the Polish or German pages indexed, the URL structure (`/de/privacy` vs `?lang=de` vs a
subdomain) has to be chosen before the router is written. My recommendation for phase 1: **stay at
parity — English prerendered, other languages client-swapped** — and treat per-language URLs as a
separate, deliberate piece of work. This is **Q1** below.

### What I am *not* recommending

Keeping them as static files. One header, one footer, one language switcher is worth more than the
difference between prerendered HTML and static HTML — which, after the prerender pass, is zero.

---

## 3 · Project structure

```
cyprusway-website/
├── .env.example                  committed — URL + placeholder key
├── .env                          gitignored
├── .gitignore
├── index.html                    Vite entry, <div id="root">
├── package.json
├── tsconfig.json
├── vite.config.ts
├── wrangler.jsonc                Workers static assets + the Worker entry
├── docs/
│   ├── WEB-PHASE-1-PLAN.md       this file
│   └── TRANSLATION-QUEUE.md      written during implementation (§6)
├── scripts/
│   ├── port-i18n.mjs             one-off, committed: js/i18n.js → src/i18n/generated/*.ts
│   ├── prerender.mjs             build step
│   └── check-logical-css.mjs     fails the build on a physical CSS property (§7.2)
├── public/
│   ├── favicon.svg
│   ├── robots.txt
│   └── images/
│       └── interests/*.png       11 files, kept from web-onboarding
└── src/
    ├── main.tsx                  client entry — hydrate or mount
    ├── entry-server.tsx          prerender entry
    ├── App.tsx                   route table
    ├── assets/                   logomark.svg, cyprus-relief, provider marks (Figma exports)
    ├── styles/
    │   ├── tokens.css            §5 — the only place a raw hex appears
    │   ├── reset.css
    │   └── global.css            element defaults, focus-visible ring, reduced-motion
    ├── i18n/
    │   ├── I18nProvider.tsx      context, useT(), dir + lang on <html>
    │   ├── languages.ts          the five records, each with a `dir` field
    │   ├── locales/{en,pl,de,el,sv}.ts
    │   └── types.ts              TranslationKey union — typo in a key is a compile error
    ├── lib/
    │   ├── supabase.ts           one client, flowType: 'pkce'
    │   ├── auth.ts               signInWithOAuth, session, the return-leg router
    │   ├── profile.ts            onboarding_completed read, interests write
    │   └── dir.ts                direction helpers + the mirrored-glyph allowlist
    ├── contracts/
    │   └── interests.ts          the 11 slugs — TODO(contracts)
    ├── components/
    │   ├── shell/                Header · MobileMenu · Footer · LanguageSwitcher · CookieBanner
    │   ├── auth/                 AuthCard · ProviderButton · ErrorBanner · InterestsScreen · InterestChip
    │   └── ui/                   Button · Modal (focus trap) · Skeleton · Icon · VisuallyHidden
    └── routes/
        ├── Home.tsx              command centre shell: loading / error / guest / signed-in
        ├── About.tsx  Faq.tsx  Privacy.tsx  Terms.tsx  NotFound.tsx
        └── content/              the legal + about prose, ported from the .html bodies
```

Component styles are co-located CSS Modules (`Header.module.css`). `tokens.css` is the only file
containing a literal colour.

---

## 4 · Dependencies

### Runtime

| Package | Why |
|---|---|
| `react`, `react-dom` `19.2.3` | Pinned to the version `cyprusway-app` runs, so a future shared component has no React-version question to answer. |
| `react-router` `^7` | Routing plus the `StaticRouter` the prerender pass needs; v6's `react-router-dom` split is gone in v7. |
| `@supabase/supabase-js` `^2.107.0` | Auth and the interests write. Matched to the app's version so session and OAuth behaviour is identical across the two clients. |
| `lucide-react` | The app uses `lucide-react-native`; the same glyph vocabulary on web keeps the two surfaces from drifting on icon meaning. Figma-specific marks (wave logomark, Apple, store badges) are exported SVGs instead — see §5. |

### Build / dev

| Package | Why |
|---|---|
| `vite`, `@vitejs/plugin-react` | The build, as specified. |
| `typescript`, `@types/react`, `@types/react-dom` | As specified; `strict: true`. |
| `@fontsource-variable/inter` | Self-hosted Inter Variable. Two reasons: Figma specifies SF Pro weights 510 and 590, which only a variable font can render, and hotlinking Google Fonts from an EU-facing site is a live GDPR question (the 2022 Munich ruling) on a site that already ships a cookie banner. One dependency removes a third-party request and the argument. |
| `wrangler` | Deploy and local preview of the Workers static-assets config. |

### Deliberately not included

- **No CSS framework.** CSS Modules are built into Vite. Tailwind would add a dependency, a config
  and a plugin, and its logical-property utilities (`ms-`/`me-`) are no more automatic than writing
  `margin-inline-start` — while the design is dense, hover-driven and desktop-first, which is what
  hand-written CSS is good at. This is the reason the brief gives for choosing React over Expo web;
  adding Tailwind would partly undo it.
- **No `i18next` / `react-i18next`.** The existing dictionary is 168 flat string keys with no
  plurals and no interpolation. A ~90-line typed provider gives compile-time key checking (which
  i18next needs codegen for), synchronous access during the prerender pass (which i18next needs
  configuring for), and per-locale code splitting for free. If the command centre later needs
  plurals or date/number formatting, `Intl.PluralRules` and `Intl.DateTimeFormat` cover it with no
  dependency. **This is a deviation from the obvious choice — see Q7 if you disagree.**
- **No ESLint config in phase 1.** `tsc --noEmit` in CI is the check. Adding a lint ruleset is a
  separate decision about house style, not foundation work.
- **No test runner in phase 1.** Nothing in scope has logic worth unit-testing that isn't better
  verified against the live Supabase project. Phase 2 changes that.

---

## 5 · Design tokens, from Figma

Pulled with `get_variable_defs` across six nodes; the union is complete (each node exposes a subset).
Prefix `--cw-` throughout.

### Colour

| Token | Figma name | Value | Used for |
|---|---|---|---|
| `--cw-navy` | `color/navy` | `#1b3b6b` | Header band, footer, hero, primary dark button |
| `--cw-gold` | `color/gold` | `#c49a10` | Sign In button, selected chip border, links on dark |
| `--cw-sand` | `color/sand` | `#f5f0e8` | Page background below the hero, card surfaces |
| `--cw-white` | `color/white` | `#ffffff` | Cards, chips, provider buttons |
| `--cw-grey-1` | `color/grey-1` | `#d9e4f6` | Muted text on navy, dividers on navy |
| `--cw-grey-2` | `color/grey-2` | `#afbacb` | Decorative dividers only — see the contrast note |
| `--cw-grey-3` | `color/grey-3` | `#5a6370` | Body copy on sand/white; interactive borders |
| `--cw-black-1` | `color/black-1` | `#1b1c21` | Label on gold surfaces — see the contrast note |
| `--cw-black-2` | `color/black-2` | `#403d4a` | Headings inside the auth/interests cards |
| `--cw-alert` | `color/alert` | `#f05d5d` | Error banner text + icon; 20 % tint as its fill |
| `--cw-success` | `color/success` | `#50a758` | Present in the collection; unused in phase 1 |
| `--cw-secondary-2` | `color/secondary-2` | `#65462e` | Present in the collection; unused in phase 1 |
| `--cw-icon` | `Icons Color` | `#292929` | Icon default where no other colour applies |

**Two measured contrast findings that change how these get used.** Both are consequences of Figma's
gold being darker than the old site's `#F59E0B`, which the "Figma wins" rule pulls in.

1. **Nothing white goes on `--cw-gold`.** White on `#c49a10` is **2.63:1** — a clear AA failure, and
   the Figma header's "Sign In" button is drawn exactly that way. Navy on gold is **4.23:1**, which
   also misses 4.5:1 for the button's 13 px semibold label. `--cw-black-1` on gold is **6.46:1**.
   → Gold surfaces get a `--cw-black-1` label. Deviation from the frame, measured, flagged as **Q8**.
2. **`--cw-grey-2` cannot be the border of an interactive control.** `#afbacb` on white is **1.96:1**,
   below the 3:1 that WCAG 1.4.11 requires for the boundary of a component — which is what an
   unselected interest chip and a search input are. `--cw-grey-3` on white is 6.08:1.
   → `--cw-grey-3` for interactive borders, `--cw-grey-2` for decorative rules. No invented hex.

For reference, the pairs that pass unchanged: `--cw-grey-3` on `--cw-sand` = 5.36:1; gold on navy
= 4.23:1 (fine for the ≥18 px bold headings and icons it is used on, not for 13 px body).

### Radius

`--cw-radius-sm: 8px` · `--cw-radius-md: 12px` · `--cw-radius-lg: 24px` · `--cw-radius-pill: 100px`

The carried-forward "card radius 24px" decision is satisfied by `radius/lg` natively — it is no
longer an override of a smaller token, as it was on the vanilla branch.

### Spacing

Figma exposes only four as variables: `space/8`, `space/12`, `space/24`, `space/32`. The frames also
use 16, 40, 48 and 64 as raw numbers. The scale is `--cw-space-{4,8,12,16,24,32,40,48,64}`; the four
Figma-backed values are marked as such in a comment so a future variable sync knows which are
authoritative.

### Type

Figma specifies **SF Pro**, which cannot be served on the web. Inter Variable is its standard
metric-near substitute and supports the exact weights the design uses.

`--cw-font: 'Inter Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`

**Playfair Display is dropped.** The old site used it for every heading; nothing in the new design is
a serif. That removes a font family, a network request, and a Figma-versus-repo conflict.

| Token | Figma | Size / line-height / weight / tracking |
|---|---|---|
| `--cw-text-h1` | H1 | 36 / 40 / 700 / 0 |
| `--cw-text-h2` | H2 | 24 / 1.2 / 700 / 0 |
| `--cw-text-h3` | H3 | 20 / 24 / 700 / 0 |
| `--cw-text-h4` | H4 | 18 / 1.3 / 700 / 0 |
| `--cw-text-h5` | H5 | 16 / 1.5 / 510 / 0 |
| `--cw-text-h6` | H6 | 12 / 1.6 / 700 / 0.25 |
| `--cw-text-subtitle` | Subtitle | 14 / 1.8 / 510 / 0.15 |
| `--cw-text-body` | Body | 13 / 20 / 510 / 0 |
| `--cw-text-button` | Button | 13 / 16 / 590 / 0 |
| `--cw-text-button-sm` | Button Small | 12 / 14 / 590 / 0 |
| `--cw-text-small` | Small Text | 12 / 16 / 400 / 0.1 |
| `--cw-text-input` | Input Text | 14 / 24 / 400 / 0.15 |

Weights 510 and 590 are SF Pro's variable axis values and are rendered literally by Inter Variable
rather than rounded to 500/600.

### Layout

Frame is 1440 wide with 120 px margins → `--cw-content: 1200px`, gutter
`clamp(1rem, 4vw, 1.5rem)`. Breakpoints: `640px`, `900px`, `1200px`. **There are no mobile frames in
the file** — every layout below 1200 px is derived, the same gap the vanilla branch hit.

### Assets to export from Figma (not hand-drawn)

`logomark.svg` (the wave mark — new; the repo has never had one), the Cyprus relief image on the
error frame, the Apple mark, the App Store and Google Play badges, the menu's row icons if Lucide
has no equivalent glyph. The four-colour Google G is reused from `premium.html`, which already
carries the brand-correct version; Figma's export uses off-brand greens and reds.

### Wordmark — the one place Figma does not win

The brief says the wordmark is established: "Cyprus" navy + "Way" gold. Figma draws it as a single
flat colour beside the logomark — white on the navy header, navy on the sand error page. Navy-on-navy
is not available, so the established two-tone has to adapt rather than transfer:

- on navy surfaces — "Cyprus" in `--cw-white`, "Way" in `--cw-gold`
- on sand/white surfaces — "Cyprus" in `--cw-navy`, "Way" in `--cw-gold` (exactly as today)

That preserves the identity and stays legible on both grounds. **Q9** if you want the Figma's flat
single-colour treatment instead.

---

## 6 · The five languages

### Porting, not retyping

A committed one-off script, `scripts/port-i18n.mjs`, reads `js/i18n.js` from `main` **and** the
`onb_*` block from `web-onboarding`, and emits `src/i18n/locales/{en,pl,de,el,sv}.ts`. Nothing is
transcribed by hand and the transform is auditable in the diff.

- `main` — **136 keys × 5 languages**
- `web-onboarding` — **32 more**, including all eleven interest labels, both card headings, both
  error messages and the pending states
- **168 keys total.** Every one is carried, including keys belonging to pages that may not survive
  §8. Deleting translations to save ~3 KB gzipped per locale is the wrong trade.

Two data fixes the port applies, both already found and fixed on the vanilla branch:
`hero_desc` stores a literal `&deg;` that renders as five characters under `textContent`; and
`prem_signin_note` says "your Google account" in a world that now has Apple.

### The gap the new design creates

The Figma introduces roughly **40 strings that have no translation** — header nav labels, the five
footer column headings and their contents, the loading and error copy, the menu rows, the search
placeholders. I will not invent translations. Each new key ships with `en` filled; the other four
fall back to `en` (the mechanism the current switcher already uses), and
**`docs/TRANSLATION-QUEUE.md`** lists exactly which keys need real work, in what context.

Reuse is higher than it looks, and I map before I add:

| Figma string | Existing key |
|---|---|
| Hero H1, "Step inside Cyprus before you arrive…" | `onb_signup_title` — already in five languages |
| Header "Ask Pete" | `nav_ap` |
| Footer CATEGORIES — all eleven | `onb_i_*` |
| Footer LOCATIONS — five of six | `nav_paphos`, `nav_limassol`, `nav_larnaca`, `nav_ayia`, `nav_troodos` (Nicosia is new) |
| Footer tagline | `footer_tagline` is close but not identical; the Figma line is the H1 restated |
| Privacy Notice / Terms of Service | `footer_privacy`, `footer_terms` |

### Mechanics

`I18nProvider` holds `{ lang, dir, t }`, persists to `localStorage` under the existing `cw_lang` key
(so anyone with a stored preference keeps it across the rebuild), and sets `lang` and `dir` on
`<html>`. Locale modules load by dynamic `import()`, so a visitor downloads one language. `en` is
statically imported so the prerender pass and the first paint need no await.

`t()` is typed against a `TranslationKey` union generated by the same port script — a mistyped key
is a compile error, which the `data-i18n` attribute scheme could never give.

---

## 7 · RTL — what it requires structurally

Frame `3558-20716` is a full mirror: logo and nav flip to the right, the heart/search/avatar cluster
to the left, hero copy right-aligns, the banner card crosses to the left half, every "View All"
chevron and carousel arrow reverses, the footer columns mirror, and the store badges swap order. So
the requirement is a genuine mirror, not a text-alignment change.

Building so that Hebrew is later "a language file and a `dir` attribute":

1. **`dir` is data, not code.** `languages.ts` carries `{ code, label, dir }` for all five, every one
   `'ltr'` today. Adding `he` is a sixth record plus a locale file.
2. **Logical properties only.** `margin-inline-*`, `padding-inline-*`, `inset-inline-*`,
   `border-start-start-radius`, `text-align: start | end`, `float: inline-start`. **No
   `margin-left`, `left:`, `right:` anywhere in layout.** CI-checkable with a grep; I'll add it to
   the build script so a physical property fails the build rather than a review.
3. **No `row-reverse` for layout.** `flex-direction: row` already follows `dir`; `row-reverse` breaks
   under it. Grid uses `grid-auto-flow: column` and logical placement.
4. **The overlay menu anchors `inset-inline-end: 0`,** so it opens from the right in LTR and the left
   in RTL, matching the frame. Its slide-in transform is `translateX(100%)` under a
   `[dir="rtl"]` override to `-100%`, or `translate: 100% 0` with a logical sign helper — decided at
   implementation, whichever reads better.
5. **Direction-aware icons, from an explicit allowlist.** `src/lib/dir.ts` holds the set that
   mirrors — chevron-left/right, arrow-right, the recommendation card's ↗ badge, the "back" affordance
   — and an `<Icon mirror>` prop applies `transform: scaleX(-1)` under `[dir="rtl"]`. Everything else
   (search, heart, play, clock, map-pin, brand marks, the logomark) explicitly does not mirror.
   The allowlist is the artefact; without one, someone eventually mirrors a magnifying glass.
6. **Horizontal scrollers.** `element.scrollLeft` is signed inconsistently across engines under RTL.
   Every rail uses `scrollBy({ left, behavior })`, which is direction-aware, and never reads
   `scrollLeft` arithmetic. Phase 2 inherits this rule rather than discovering it.
7. **Testable without Hebrew.** A dev-only `?dir=rtl` query override forces `dir` on `<html>`
   independent of language, so the RTL layout can be reviewed in English against frame `3558-20716`
   in phase 1. Stripped from production builds by `import.meta.env.DEV`.

No Hebrew strings, no sixth language record, no `he` anywhere.

---

## 8 · What goes, what stays

### Deleted

| Path | Note |
|---|---|
| `css/style.css` | 1,432 lines. Tokens come from Figma; the palette was built for the placeholder. |
| `js/main.js`, `js/lang.js`, `js/auth.js`, `js/config.js`, `js/stripe.js` | Reimplemented or out of scope. |
| `js/cookie-consent.js` | Deleted as a file, **rebuilt as a React component** — see §13.4. |
| `js/i18n.js` | Deleted only after `scripts/port-i18n.mjs` has emitted the locale files from it. |
| `index.html` (old), `features.html`, `destinations.html`, `premium.html`, `premium-success.html`, `404.html` | **Subject to Q2 and Q3 — I am not deleting these without a ruling.** |
| `images/*.jpg` (7 files, 17 MB) | Only used by the old marketing pages. `Cyprus beach aerial.jpg` alone is 3.4 MB and is the hero on eight pages. Whichever of them a surviving page still needs gets re-exported at a web-sane size; the rest go. |

### Kept

| Path | Note |
|---|---|
| `js/i18n.js` content | 136 keys × 5 languages, ported (§6). |
| `web-onboarding`'s `onb_*` keys | 32 more × 5 languages. Real translation work; the branch is pushed, but it must be carried into the new tree or it is stranded. |
| `images/interests/*.png` | 11 files, ~60 KB total, already sized for the 24 px chip circles. |
| `favicon.svg` | Kept as-is for now. It is a "C/W" monogram and the new identity has a wave logomark — replacing it is a one-file change once the logomark is exported. **Q10.** |
| `robots.txt` | Rewritten for the new URL shape. |
| `sitemap.xml` | Regenerated by the prerender script from the same route list, so it cannot drift from what exists. |
| `privacy.html`, `terms.html`, `faq.html`, `about.html` — the **prose** | Ported into `src/routes/content/`. The markup around it is discarded; the text is not. |
| `README.md` | Rewritten. It is currently a Cloudflare Pages + Stripe + Awin checklist that describes a repo that will no longer exist, and Awin is scrapped in favour of CJ (§18). |

---

## 9 · Routing

| Path | Render | Prerendered |
|---|---|---|
| `/` | Command centre shell — guest or signed-in, with loading and error states | yes (guest shell + hero copy) |
| `/about` | Content | yes |
| `/faq` | Content | yes |
| `/privacy` | Content | yes |
| `/terms` | Content | yes |
| `*` | 404, real HTTP 404 status | yes |
| `/privacy.html` etc. | 301 → clean path, from the Worker | n/a |

The auth card is **not a route.** It is a modal over the current page, which is how Figma draws it,
opened by the header's Sign In button, by `?mode=signin` / `?mode=signup` for linkability, and by the
return-leg router. A route would need its own prerendered page for a surface that must never be
indexed.

**Soft-404 — resolved by the Worker (Q4).** `not_found_handling: "single-page-application"` would
return HTTP 200 for the SPA fallback, making `/nonsense` a soft 404; the live site returns a real 404
today. Instead `not_found_handling` is `"none"` and `src/worker.ts` handles what the asset layer does
not match: legacy `.html` paths 301 to their clean equivalent, everything else serves the prerendered
`404.html` **with a 404 status**. Every phase-1 route is prerendered, so there are no client-only
paths that need an SPA fallback.

---

## 10 · Auth

Everything in the brief's "already proven" list is taken as fact. No client-side row creation, no
upsert, no linking or duplicate-detection UI, no defensive code around the trigger or RLS.

### Client

```ts
createClient(url, anonKey, {
  auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
})
```

`redirectTo: window.location.origin + window.location.pathname`, built at click time. Never
hardcoded. The allowlist already covers `https://cyprusway.eu/**`, `http://127.0.0.1:5500/**` and
both Workers origins including the `*-cyprusway-website…` preview wildcard, so **preview deploys can
complete a real sign-in with no allowlist change.**

### The return leg

The four states exactly as specified: no session and no auth params → do nothing; session with
`onboarding_completed` false → interests; session with it true → signed in, no onboarding; auth error
→ error banner. **Nothing falls through to the signup card.** The signup card is only ever opened by
an explicit trigger or `?mode=signup`, never by the router — structurally, not by a guard.

`onboarding_completed` is the only signal read. `interests` is never consulted for routing.

### The correction PKCE forces — see §12.1

Under the implicit flow the return parameters arrive in the **fragment**, and the vanilla
implementation snapshots `window.location.hash` before the SDK strips it. Under PKCE they arrive in
the **query string** (`?code=…`, and `?error=…&error_code=…&error_description=…`). A hash-only reader
would never fire. The new router reads `location.search` first and `location.hash` as a fallback, so
both flows are handled, and it reads before awaiting anything.

One ordering question I will verify rather than assume: with `detectSessionInUrl: true`, the code
exchange happens inside the client's initialisation, and `getSession()` is gated on that promise —
so awaiting `getSession()` should be sufficient without an `onAuthStateChange` race. The previous
verification was done under the implicit flow, so it does not carry. I will confirm it against the
live project, not reason about it.

### The card

One component, two modes.

| | `signup` | `signin` |
|---|---|---|
| Heading | Step inside Cyprus before you arrive with immersive 360° tours and guided narration | Welcome back |
| Subline | — | *placeholder* — "Sign in to pick up where you left off." **Copy owed.** |
| Buttons | Continue with Google · Continue with Apple | identical |

No email, no password, no "or" divider, no form buttons, no "Forgot password?" — the frame's
remaining fields are ignored per the brief. Card radius `--cw-radius-lg` (24 px). `role="dialog"`,
`aria-modal="true"`, `aria-labelledby`, focus trap, `Escape` closes, focus returns to the trigger,
visible `:focus-visible` rings. Error banner is `role="status" aria-live="polite"` rendered into a
region that exists before the message does. Neutral copy: "We couldn't sign you in. Please try
again." — never "on our end", because Apple rate-limits repeat sign-ins and returns its own failure.

**Backdrop deviation.** The Figma card floats on a stock photo of Split, Croatia — a placeholder, and
a photo of the wrong country. The card now opens over the command centre, which has its own imagery,
so the modal uses a navy scrim over the live page rather than a photo. One less 1 MB asset and no
second background competing with the hero.

### Interests

Eleven chips, the exact eleven slugs, stored once in `src/contracts/interests.ts` and marked
`TODO(contracts): replaced by client_config RPC`. Labels come from the dictionary keyed by slug, so a
label rewording cannot desynchronise from the CHECK constraint.

Chips are real `<button type="button">` with `aria-pressed`. Selected state: 2 px gold border + gold
tint, **label in `--cw-black-2`, not gold** — the carried-forward decision, and Figma's own gold is
2.63:1 on white, worse than the 2.1:1 the original ruling was made against. One chip minimum; the
single primary button stays `disabled` and `aria-disabled` until then.

One button, not two. "My CyprusWay" names a surface the web does not have.

```ts
supabase.from('users')
  .update({ interests: selected, onboarding_completed: true })
  .eq('id', user.id)
  .select('id')
```

Zero rows is an error, not a success. On failure the screen stays open with the selection intact.

**Where the button goes is now an open question.** On the vanilla branch it went to
`destinations.html`. In phase 1 that page may not exist and the command centre has no content. The
honest destination is: close the modal and return to `/`, now signed in. **Q5.**

### Known drift, recorded not fixed

The web writes `onboarding_completed = true` at the interests step; the app flips it later, at
entry-choice / traveller-type. A web-onboarded user therefore reaches the app with the flag true and
`traveler_type` NULL. This is already observed (`web-command-centre-scope.md` §5) and its fix is item
4 of the contracts work — a server-side `complete_onboarding` RPC. I follow the brief's specified
write and mark it `TODO(contracts):`. I am not inventing a client-side reconciliation.

---

## 11 · The command centre shell — loading, error, and what renders

### Loading (`3562-24665`)

The chrome renders live — real header, real nav dots, real carousel arrows — and only the content
skeletons: navy-on-navy blocks in the hero band, sand/greige blocks below. A `<Skeleton>` primitive
with `aria-hidden`, the region carrying `aria-busy="true"` and a visually-hidden "Loading" status so
the state is announced once rather than as eleven empty boxes. The shimmer is disabled under
`prefers-reduced-motion`.

### Error (`3558-21474`)

A full-page takeover, not a banner: sand ground, centred logomark + wordmark in navy, the Cyprus
relief image, H2 "Cyprus is still there", body "We just couldn't load it right now. Check your
connection and we'll bring the island back.", a navy `Reload` button, then "Keep happening? *Report
the problem*" as a gold underlined link. **No header nav and no footer** — worth noting, because it
means the error state cannot reuse the shell layout.

The copy is already neutral and consistent with the carried-forward rule.

### What actually triggers these in phase 1

There is no command-centre data yet, so wiring these to nothing would make them decorative. They are
wired to the one real async dependency that exists: the session and profile bootstrap. Bootstrap
pending → loading. Bootstrap fails (`getSession()` throws, or the `users` row read errors) → the
error page. That is honest, and it is the same code path phase 2 hangs the feed off. A dev-only
`?state=loading|error` override makes both reviewable against the frames.

### The hero

Renders per `3370-7099`: H1, sub-copy, the Ask Pete input, the two option cards, and the banner
carousel. In phase 1:

- **Ask Pete input** — rendered `disabled` + `aria-disabled`, placeholder from the frame,
  `TODO(contracts): Ask Pete on web needs the mike function contract + the shared-thread ruling`.
- **The banner carousel** — `virtual_tour` is null on 181/181 published places; there is nothing to
  put in it. Hidden in phase 1 rather than filled with a placeholder.
- **The two option cards** ("Explore Now", "My CyprusWay") — both point at surfaces that do not
  exist. See **Q6**.

---

## 12 · Two corrections to the brief

**12.1 — "The old vanilla implementation used the implicit flow; PKCE puts the code in the query
string."** Correct, and the consequence is larger than a config change: the shipped return-leg router
on `web-onboarding` reads `window.location.hash` only. Ported as-is under PKCE it would silently
never fire — no error banner, no interests screen, just a signed-in user dropped on the page with the
router having done nothing. Handled in §10; noting it because "carry the branch's logic forward"
would otherwise reproduce the bug.

**12.2 — "87 hand-picked places" in the hero sub-copy is wrong.** `web-command-centre-scope.md`
measured **181 published places**. Rather than ship a number that is wrong or hardcode a number the
contracts work will supply, phase 1 renders the sentence without the count and carries
`TODO(contracts): place count comes from the client_config RPC`. The count-free line is listed as
copy owed.

---

## 13 · Where I disagree, or the brief is silent

**13.1 — The shell as drawn is mostly dead links, and shipping it that way is worse than not shipping
it.** The Figma footer has five columns totalling ~35 links plus two store badges. Counted against
what exists: DISCOVER (5) are all phase-2 surfaces; ABOUT (Our Mission, How we work, Partners,
Careers, Customer Service) is **five pages that do not exist and are not planned**; LOCATIONS (6) and
SEGMENTS (4) and CATEGORIES (11) are taxonomy links into browse surfaces that do not exist; both
store URLs were **measured as 404** on 27 August. Only Privacy Notice and Terms of Service resolve —
and About and FAQ, the two pages that *do* exist, are not in the Figma footer at all.

What I propose to build: DISCOVER rendered but inert with a phase-2 `TODO`; ABOUT replaced by the
pages that exist (`/about`, `/faq`, contact) rather than five invented ones; LOCATIONS, SEGMENTS and
CATEGORIES omitted until there is somewhere to go; store badges omitted until a listing exists. Same
question applies to the header's five nav items. **Q6** carries the ruling.

**13.2 — There is no language switcher anywhere in the Figma.** Not in the header, not in the footer,
not in the overlay menu — in a product with five languages and a switcher in the header of every page
today. Building the design as drawn silently removes it. Proposal: a globe control in the header
beside the search icon, which is where it lives today, plus the language list in the footer. **Q11.**

**13.3 — The copyright line conflicts.** Figma says "Copyright © 2026 CyprusWay. All rights
reserved."; the live site says "© 2026 Almisource LTD. All rights reserved." in five languages
(`footer_copyright`), and Almisource LTD is the legal entity named in `about.html` and the terms. A
copyright notice should name the entity. I will keep the existing translated line unless told
otherwise, and flag it.

**13.4 — Cookie consent is missing from the scope and is live today.** `js/cookie-consent.js` puts a
GDPR banner on every page, storing a 365-day decision, with copy that explicitly mentions affiliate
tracking. Dropping it in the rebuild is a compliance regression on an EU-facing site that earns
affiliate commission. I plan to rebuild it as a shell component with the same storage key
(`cw_cookie_consent`), so existing visitors are not re-prompted. It is ~90 lines. Say the word and I
will leave it out, but not silently.

Worth noting while I'm there: the current banner is decorative — it gates nothing, because no script
is conditionally loaded on the decision. Making it actually gate something is a separate piece of
work and I am not doing it in phase 1.

**13.5 — Deleting `premium.html` and `premium-success.html` breaks a cross-repo coupling.** The
deployed `create-checkout-session` edge function **hardcodes** `https://cyprusway.eu/premium-success.html`
and `https://cyprusway.eu/premium.html` as its success and cancel URLs. Nothing can hit that today —
`stripeEnabled` is `false`, no web caller exists, and the app's rail is RevenueCat — so deleting them
breaks nothing now. But the next backend deploy that turns the Stripe rail on returns buyers to a
404. My recommendation is to delete them and record the dependency as a hand-off to the backend repo
rather than carry two dead pages. **Q3.**

**13.6 — `features.html` and `destinations.html` are unaddressed.** The brief names privacy, terms,
faq and about as content that must keep working, and says everything else "goes". These two are 184
and 229 lines of real, five-language-translated marketing content (41 and 55 `data-i18n` keys), they
are in the sitemap, they are linked from every header and footer, and the vanilla interests flow used
`destinations.html` as its post-onboarding destination. Deleting them is defensible — the command
centre replaces the browse story — but it is not something I will do on inference. **Q2.**

**13.7 — The header differs between guest and signed-in, and one of the differences has no
backend.** Guest gets search + a gold "Sign In"; signed-in gets heart + search + **an avatar photo**.
`users` has no avatar column (20 columns, measured). Phase 1 renders initials from the session's
name or email, with `TODO(contracts): avatar needs a column or a storage convention`.

**13.8 — Search appears three times in the design and has no endpoint.** Header icon, menu search
field, footer search field. Both vector RPCs are `service_role`-only as of migration 0028; the only
client-reachable option is a substring `ilike` on `places_sync`. All three render **disabled** in
phase 1 with a `TODO(contracts)`, rather than shipping an input that does nothing when typed into.

---

## 14 · Copy owed — flagged, not invented

| # | String | Status |
|---|---|---|
| 1 | Signin subline | Placeholder "Sign in to pick up where you left off." The site's voice is warmer than this. |
| 2 | Hero sub-copy | Needs a count-free rewrite; "87 hand-picked places" is wrong (181 published). §12.2 |
| 3 | Error page — "Report the problem" | Needs a destination. The only address on the site is `partners@cyprusway.eu`, which is the wrong inbox for a bug report. A support address is owed. |
| 4 | Footer ABOUT column | Our Mission / How we work / Partners / Careers / Customer Service — five pages that do not exist. §13.1 |
| 5 | Header nav labels | Explore Now / My CyprusWay / Ask Pete / 360° Tours / Build My Trip — five surfaces that do not exist in phase 1. §13.1 |
| 6 | Menu rows | My Trips, Saved Places, Settings, Log out, Give feedback, Report a problem — destinations owed for all six. |
| 7 | "PRO" badge on Book with Pete in the menu | The 14 August audit recorded this as inverted — `book-with-pete-route` is guest-reachable. Not carried without a ruling. |
| 8 | Search placeholders | "Search anything in Cyprus" / "Find places and experiences in Cyprus" — rendered on disabled inputs. §13.8 |
| 9 | Copyright line | Figma "CyprusWay" vs the established "Almisource LTD". §13.3 |
| 10 | ~40 new UI strings | English only; the other four languages fall back. `docs/TRANSLATION-QUEUE.md` will enumerate them. §6 |

Not carried: the "Sing In" typo in the Figma auth-card heading.

---

## 15 · Deployment

`wrangler.jsonc`, worker name `cyprusway-website` to match the already-allowlisted origins:

```jsonc
{
  "name": "cyprusway-website",
  "compatibility_date": "2026-08-27",
  "assets": { "directory": "./dist", "not_found_handling": "single-page-application" }
}
```

Prerendered files win over the SPA fallback because static assets are matched first, so
`/privacy` serves `dist/privacy/index.html` and only genuinely unmatched paths fall through. See the
soft-404 caveat in §9.

**Three things outside this repo have to change, and I cannot do them:**

1. **The Cloudflare build settings.** The project is currently configured with no build command and
   output `/`. It needs `npm ci && npm run build` and output `dist`. Dashboard action.
2. **Build-time environment variables.** Vite inlines `VITE_*` at build time, so
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` must exist **in the Cloudflare build
   environment**, not just in a local `.env`. Without them the deployed bundle gets `undefined`
   credentials and every auth call fails. Dashboard action.
3. **Nothing on the Supabase side.** The allowlist already covers production, the dev origin and the
   preview wildcard. No redirect-URL change, no auth-config change, no migration.

`.env.example` is committed with `VITE_SUPABASE_URL` filled and `VITE_SUPABASE_ANON_KEY` as a
placeholder plus a comment noting the key is public by design and where to obtain it. `.env` is
gitignored. Nothing else goes in either file. Note for the record: because Vite inlines it, the anon
key is in the built bundle regardless — which is correct and expected for an anon key, and is already
true of `js/config.js` today.

Delivery: a new branch off `main`, changes staged, **no commit and no push**, per the constraint.

---

## 16 · Open questions — **all answered 27 Aug; rulings below**

> **Rulings.** Q1 parity · Q2 delete `features.html` + `destinations.html` · Q3 delete the premium
> pages, dependency written to `docs/BACKEND-HANDOFF.md` · Q4 add the Worker, real 404s ·
> Q5 close the modal, return to `/` signed in · Q6 header inert, footer keeps only what resolves ·
> Q7 hand-rolled i18n · Q8 `--cw-black-1` on gold · Q9 two-tone wordmark · Q10 regenerate the
> favicon from the logomark · Q11 globe in the header + footer list · Q12 rebuild the cookie
> banner (still gates nothing; left for later) · Q13 `mailto:partners@cyprusway.eu` for now,
> stays on the copy-owed list.
>
> Also ruled: §13.3 keep Almisource LTD · §13.7 initials · §13.8 disabled inputs · §12.1 and
> §12.2 accepted · prerender hand-rolled, not `vite-react-ssg`.

The original table, kept for the reasoning behind each recommendation.

| # | Question | My recommendation |
|---|---|---|
| **Q1** | Multilingual URLs — do the five languages ever need to be indexed separately? Cheap to decide now, expensive later. | Stay at today's parity: English prerendered, other languages client-swapped. Revisit as its own piece of work. |
| **Q2** | `features.html` and `destinations.html` — delete, or port as content routes? | Delete. The command centre replaces the browse story, and porting them means maintaining marketing pages the design has abandoned. But this is a product call. §13.6 |
| **Q3** | `premium.html` / `premium-success.html` — delete despite the hardcoded return URLs in `create-checkout-session`? | Delete, and record the dependency as a backend hand-off. §13.5 |
| **Q4** | Soft-404: accept HTTP 200 on unmatched paths, or add a ~15-line Worker to return a real 404? | Add the Worker. It preserves current behaviour and is the same file the `_redirects` fallback would need. |
| **Q5** | After the interests save, where does the button go, given no browse surface exists? | Close the modal and return to `/`, signed in. |
| **Q6** | The header's five nav items and the footer's ~35 links point at surfaces that do not exist. Render inert, or omit? | Header: render inert with reduced emphasis and `aria-disabled`, so the shell's real proportions are visible. Footer: keep only what resolves, omit LOCATIONS / SEGMENTS / CATEGORIES and the store badges. §13.1 |
| **Q7** | i18n — hand-rolled typed provider, or `react-i18next`? | Hand-rolled. Reasoning in §4. |
| **Q8** | Gold surfaces: white label as drawn (2.63:1, fails AA), or `--cw-black-1` (6.46:1)? | `--cw-black-1`. Same class of ruling as the chip label already carried forward. §5 |
| **Q9** | Wordmark on navy: two-tone white + gold, or Figma's flat single colour? | Two-tone, preserving the established identity. §5 |
| **Q10** | Favicon — keep the "C/W" monogram, or regenerate from the new wave logomark? | Regenerate once the logomark is exported; it is one file. |
| **Q11** | Where does the language switcher go, given the design has none? | Globe control in the header beside search, plus the list in the footer. §13.2 |
| **Q12** | Cookie banner — rebuild it, as I plan to, or deliberately drop it? | Rebuild. §13.4 |
| **Q13** | Is there a support address for the error page's "Report the problem", or should it be a `mailto:partners@cyprusway.eu` for now? | Needs an answer; I will not invent an address. |

---

## 17 · Constraint check

| Constraint | Held |
|---|---|
| Vite + React + TypeScript, replacing the repo contents | Yes — §3 |
| Design tokens from Figma, not `css/style.css` | Yes — §5. Two deviations, both measured contrast failures, both flagged |
| Routing with the legal pages resolved | Yes — §2, §9 |
| Five languages ported, not retyped | Yes — §6, by committed script |
| RTL structural groundwork, no Hebrew | Yes — §7. No sixth language, no `he` string |
| Shell — header, mobile menu, footer | Yes — §11, §13.1 |
| Auth — sign-in card and interests, in React | Yes — §10 |
| Loading and error states | Yes — §11 |
| Cloudflare Workers at `cyprusway.eu` | Yes — §15, with three dashboard actions named |
| No command-centre content built | Yes — hero renders, rails do not exist |
| Ask Pete disabled with a `TODO(contracts)` | Yes — §11 |
| Nothing touching Stripe or premium purchase | Yes — the only mention is §13.5, which is about *not* breaking it |
| No Hebrew content | Yes |
| No secrets committed | Yes — §15. Anon key placeholder in `.env.example`, real value in a gitignored `.env` |
| No database migration written or applied | Yes — none |
| No guest or anonymous auth | Yes — Google and Apple only |
| No hardcoded value without a `TODO(contracts):` | Yes — interests list, place count, avatar, search, Ask Pete all carry one |
| No `git commit`, no `git push` | Yes — staged on a new branch |
| Questions in this file, not the chat | Yes — §16 |
| Deviations written down with reasons | Yes — §5, §10 (backdrop), §13, and the token deviations in §5 |

---

## 18 · Awin → CJ: where the stale references are

Awin is scrapped in favour of CJ. Swept the website repo and the app's `docs/`. **I have not
edited anything outside this repo** — the sibling-repo items below are flagged for their owners.

### In this repo — handled

| File | Occurrences | Action |
|---|---|---|
| `README.md` | 4 — "submitting to Awin", "Apply to Awin", "awin.com → Publishers → Join", "apply for Booking.com program within Awin" | The file is rewritten wholesale in phase 1 (§8). The affiliate section goes with it; the new README does not name a network at all, because the network is not a website-repo concern. |
| `docs/WEB-PHASE-1-PLAN.md` §2 | 1 | Updated to CJ. |

### In `cyprusway-app/docs` — stale, not mine to edit

**`BookWithPete_B1_B2_Build_Spec.md` is the load-bearing one.** It states the affiliate
architecture as fact in a section headed **"CRITICAL — host allowlist"**:

- line 33 — *"Booking.com runs through **CJ** for European publishers; GetYourGuide runs through
  **Awin**."*
- line 37 — prescribes `www.awin1.com  (Awin — GetYourGuide)` as a required allowlist entry
- line 319 — *"GetYourGuide is on the existing Awin account"*, listed under known-open items

A spec that instructs an implementer to allowlist `www.awin1.com` will produce dead affiliate
routes now that the network is gone.

**The Decision Log already contradicts it, which is worth knowing.**
`CyprusWay_Decision_Log_v3_0.md` line 1289 records *"**Host allowlist basis is void** … `HOST_ALLOWLIST`
= `{www.anrdoezrs.net, www.awin1.com}` and **GetYourGuide is now direct, not via Awin**"*, and flags
it **"Load-bearing before any GetYourGuide route is authored."** So the app repo had already
retired Awin for GetYourGuide; the build spec was never updated to match, and now both are stale
for a second reason.

That entry also raises something the CJ switch makes more urgent, unprompted by this work: **CJ
rotates its redirect host** across `anrdoezrs.net`, `dpbolvw.net`, `tkqlhce.com` and `jdoqocy.com`,
and only the first is allowlisted. If CJ is now the only network, that allowlist is one rotation
away from breaking every affiliate link.

None of this touches phase 1 — the website repo has no affiliate code and `affiliate_routes` is
empty — but the build spec should be corrected before anyone implements against it.

---

## 19 · Implementation record — what changed against this plan

Built 27 August on branch `web-react-phase-1`, staged, not committed. Everything below is a
deviation from the plan above, with the reason. Nothing was changed silently.

### Four more measured contrast failures in the Figma palette

§5 found two. Implementation found two more, both from the same root cause — Figma's gold
and alert red are darker and more saturated than the palette they replace, so colours that
worked as accents fail as text. All four are documented at the token, in `src/styles/tokens.css`.

| Where | Figma | Measured | Built |
|---|---|---|---|
| Label on gold *(planned, Q8)* | white | **2.63:1** | `--cw-black-1`, 6.46:1 |
| Interactive border *(planned)* | `grey-2` | **1.96:1** | `--cw-grey-3`, 6.08:1 |
| **Error banner label and icon** | `alert` on its own 20% tint | **2.34:1** | `--cw-alert-text`, the same hue at 62%, 5.11:1 |
| **"Report the problem" link on sand** | `gold` | **2.32:1** | `--cw-gold-link`, the same hue at 65%, 4.96:1 |

The error-banner one is worth noting because the vanilla branch shipped it: `#f05d5d` text on
a 20% tint of `#f05d5d` is close to unreadable, and it is the copy someone reads at the exact
moment something has gone wrong.

**The focus ring changed for the same reason.** A single gold ring measures 2.32:1 on sand,
under the 3:1 a focus indicator needs. It is now two adjacent rings — white inside navy — so
at least one contrasts strongly with every ground the site uses: 11.1:1 against each other,
navy 9.8:1 on sand, white 11.1:1 on navy.

### Cloudflare intercepted the redirects — two config changes

The plan said `not_found_handling: "none"` plus a Worker. That was not sufficient. Measured
against `wrangler dev` on the real build:

- `/privacy` returned **307 → `/privacy/`**. With directory-form files and
  `html_handling: "auto-trailing-slash"`, Cloudflare adds the trailing slash, so the canonical
  URL had two forms. Fixed with `html_handling: "drop-trailing-slash"`.
- `/privacy.html` returned **307 → `/privacy/`** *from the asset layer*, never reaching the
  Worker. A permanent URL change wants a 301, and four of the legacy paths point at deleted
  pages the asset layer knows nothing about. Fixed with `run_worker_first: ["/*.html"]`.

Verified after the change: all six routes 200, all ten legacy `.html` paths 301 to their clean
equivalent (including uppercase), `/privacy/` 307s to `/privacy`, unknown paths return a real
404 with the prerendered body.

### One bug, found by keyboard testing

`?mode=signin` reopened the card the instant it was closed. `closeAuth()` sets `authMode` to
null, which is a dependency of the effect that reads `?mode=`, so the effect re-ran and
reopened it — Escape and the close button appeared to do nothing. Fixed with a
consumed-once ref. Caught only because the focus-trap test drove Escape rather than clicking.

### The hero is one column, not two

The frame's right column is a carousel of 360° tours. `virtual_tour` is null on 181 of 181
published places. A placeholder card would claim content that does not exist and an empty
right column reads as broken, so the hero column is centred at 720px. The carousel returns in
phase 2 with the rows behind it.

**The loading skeleton follows the same rule.** Frame `3562-24665` also skeletons the rails
below the hero — recommendations, tours, food picks — none of which phase 1 renders. A
skeleton for content that never arrives is a worse loading state than a shorter one, so only
the hero is skeletonised.

### The header sheds controls below 640px

Measured at 360px: the actions row alone was 241px wide in a 345px viewport, and the page
scrolled sideways. Below 640px the search control and the language switcher are dropped from
the header — both are in the drawer, so nothing is lost — and below 480px the wordmark drops
to the logomark alone, with the name kept in the link's accessible name. Verified: no
horizontal overflow at 320, 360, 430, 640, 768 or 1440.

There are no mobile frames in the file, so all of this is derived rather than drawn.

### Additions the plan did not list

- **`?card=signin|signup|interests`**, dev-only. Visual review of the interests screen
  otherwise needs a completed OAuth round trip, which is exactly what blocked verification on
  the vanilla branch. The preview renders against a stub user, so saving fails into the error
  banner — real behaviour, not a mock.
- **`scripts/check-logical-css.mjs`**, run by `npm run build`. Fails on `margin-left`,
  `inset: left`, `text-align: right`, `row-reverse` and `.scrollLeft`, with an `rtl-ok` escape
  hatch. The RTL guarantee rots one physical property at a time in a language nobody on the
  team reads; a review cannot catch that reliably and a build can.
- **`scripts/port-content.mjs`**. The plan said the legal prose would be "ported"; it did not
  say how. Transcribing legal text by hand is the wrong risk, so it is mechanical, from git,
  and verified by element count: `<h2>` 10/10, 9/9, 9/9 and `<p>` 16/16, 15/15, 10/10 against
  the originals.
- **`--cw-prose-size` 16px** and a 720px measure for the content pages. The 13px Body token is
  a dense-UI size and unreadable at length; the Figma has no long-form page to copy.

### What was verified, and how

In Chrome against the dev server, and again against `wrangler dev` on the production build.

| | Result |
|---|---|
| Prerendered HTML has real content | 910–4,782 characters of rendered text per route, before any JS |
| Hydration | No console output of any kind on the built site; a button click opens the modal; client-side routing updates the URL, `<title>` and `<h1>` |
| Auth card, both modes | `role="dialog"`, `aria-modal`, `aria-labelledby`; signup shows the long heading and no subline, signin shows "Welcome back" and the placeholder subline; Google and Apple only |
| Focus | Lands on "Continue with Google", skipping Close. Tab wraps forward from the last, Shift+Tab wraps back from the first, both `preventDefault`ed. Escape closes, scroll lock releases, focus is released when there was no trigger |
| Interests | Eleven chips with their thumbnails, `aria-pressed`, gold border and tint with a near-black label when selected, primary disabled until one is picked, a failed save leaves the selection intact and shows the banner |
| Five languages | Polish loads the ported dictionary — page, nav and all eleven chips — with the new `ui_*` keys falling back to English, visibly |
| RTL | `?dir=rtl` mirrors the header, hero, option cards, footer and cookie banner, and the drawer opens from the left |
| Responsive | No horizontal overflow at 320/360/430/640/768/1440 |
| Worker | All routes 200, all ten legacy paths 301, unknown paths a real 404 |

**Not verified, and I am not claiming it:** a real Google or Apple sign-in, and therefore the
PKCE return leg end to end. That needs credentials I will not enter. The code path is exercised
up to `signInWithOAuth`; everything after the provider redirect is untested. This is the same
gap the vanilla branch had, and it is the first thing to run before phase 1 is called done.
