# CyprusWay — web

The web client for CyprusWay, served at [cyprusway.eu](https://cyprusway.eu). React + Vite +
TypeScript, deployed to Cloudflare Workers.

This is **phase 1**: the foundation and the auth flow. The command centre's content —
recommendations, saved places, trip continuation, tours, categories, Ask Pete — is not built,
because most of the data behind it does not exist yet. See `docs/WEB-PHASE-1-PLAN.md` for what
was decided and why, and `docs/BACKEND-HANDOFF.md` for what another repo has to do next.

---

## Quick start

```bash
npm install
cp .env.example .env      # then fill in VITE_SUPABASE_ANON_KEY
npm run dev               # http://localhost:5173
```

The anon key is public by design — it identifies the project and is constrained by RLS, not by
secrecy — but it lives in an env file so it is configured per environment rather than compiled
in. Get it from the Supabase dashboard: Project Settings → API → anon public.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Client build, SSR build, prerender, then the logical-property check |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run preview` | `wrangler dev` against `dist/` — the only way to exercise the Worker's redirects and 404 |
| `npm run deploy` | Build, then `wrangler deploy` |
| `npm run port-i18n` | Regenerate `src/i18n/generated/` from the vanilla dictionary in git. One-off; committed for auditability |

## Dev-only URL flags

Stripped from production builds. They exist so the states that are otherwise hard to reach can
be reviewed against Figma without breaking the network or completing a real OAuth round trip.

| Flag | Effect |
|---|---|
| `?state=loading` | The command centre's skeletons (Figma `3562-24665`) |
| `?state=error` | The full-page error takeover (`3558-21474`) |
| `?card=signin` · `?card=signup` · `?card=interests` | The auth card in either mode, or the interests screen. Saving from the interests preview fails into the error banner, because there is no session to write with — that is real behaviour, not a mock |
| `?dir=rtl` | Forces right-to-left without adding a sixth language, for checking against `3558-20716` |

`?mode=signin` and `?mode=signup` are **not** dev-only — they make the auth card linkable.

---

## How it is put together

```
src/
├── main.tsx            client entry — hydrates a prerendered page, mounts a fresh one otherwise
├── entry-server.tsx    prerender entry
├── worker.ts           Cloudflare Worker: legacy 301s and real 404s
├── styles/tokens.css   the design tokens — the only file with a literal colour
├── i18n/               generated/ is ported and not hand-edited; strings/ is new phase-1 copy
├── lib/                supabase client, auth, profile writes, session state, RTL helpers
├── contracts/          values the client_config RPC will eventually own
├── components/         ui/ primitives · shell/ header, drawer, footer · auth/ the two cards
└── routes/             home/ plus the content pages, and the shared route table
```

### Prerendering

Every route is rendered to real HTML at build time — `npm run build` runs a client build, an
SSR build, then `scripts/prerender.mjs`. No plugin and no extra dependency; `react-dom/server`
and Vite's `--ssr` flag are already there.

It exists because a plain SPA serves an empty `<div id="root">` to anything that does not run
JavaScript. For `/` that is an SEO regression against the static site this replaces. For
`/privacy` and `/terms` the readers that matter — the CJ publisher review, the Google and Apple
OAuth consent configurations, app-store listings — are exactly the ones least likely to execute
a bundle.

English only. The five languages are already invisible to search engines today (one URL per
page, text swapped by JS), so this is parity. Per-language URLs are a separate decision.

**If you add a route,** add it to `ROUTE_META` in `src/routes/routes.ts`. The router, the
prerender pass and `sitemap.xml` all read that one table, so they cannot disagree.

**Prerendered components must not touch `window` or `localStorage`** at module scope or during
the first render. Read them in an effect; otherwise the build fails, or worse, hydration
silently diverges.

### Right-to-left

Hebrew is not built. Adding it later is meant to be a language file and a `dir` attribute, not
a rewrite, and three things keep that true:

1. **Direction is data.** `src/i18n/languages.ts` carries `dir` per language. Nothing branches
   on a language code to decide layout.
2. **Logical properties only.** `npm run build` fails on `margin-left`, `inset: left`,
   `text-align: right`, `row-reverse` and friends — `scripts/check-logical-css.mjs`. Put
   `rtl-ok` in a comment on the line if a physical direction is genuinely what you mean.
   The same check bans `.scrollLeft`, which is signed inconsistently under RTL; use
   `scrollByInline()` from `src/lib/dir.ts`.
3. **Mirrored glyphs are an explicit allowlist,** in `src/lib/dir.ts`. A glyph mirrors if it
   means "forward or back in reading order"; a magnifying glass, a heart and a map pin do not.

### i18n

`src/i18n/generated/` is 177 keys × 5 languages, ported mechanically from `js/i18n.js` on the
`web-onboarding` branch by `scripts/port-i18n.mjs`. **Do not hand-edit it.**

`src/i18n/strings/` is copy the React build added. English is complete; the other four are
empty and fall back to English, which is the same fallback the vanilla switcher used. The list
of what needs translating, with context, is `docs/TRANSLATION-QUEUE.md`.

`t()` is typed against the English shape, so a mistyped key is a compile error.

### Auth

Google and Apple only. Sign-in and sign-up are the same action — `signInWithOAuth` creates the
account if it does not exist — so there is no separate sign-up screen, only two copy states of
one card.

`flowType: 'pkce'`. Under PKCE the auth code and any failure arrive in the **query string**,
not the fragment the implicit flow used. `readAuthParams()` in `src/lib/auth.ts` reads both,
query first.

The profile row creates itself — the `on_auth_user_created` trigger fires inside GoTrue's
insert transaction — so there is deliberately no client-side row creation and no upsert
anywhere. `onboarding_completed` is the only signal that decides whether onboarding runs;
`interests <> '{}'` is never consulted. The interests write requires its `.select('id')`, and
a zero-row result is treated as an error, not a silent success.

Nothing can fall through to the sign-up card. It is only ever opened by an explicit trigger or
`?mode=signup` — structurally, not by a guard.

### Deployment

`wrangler.jsonc` serves `dist/` as static assets with a Worker in front. The Worker does two
things: 301s the vanilla site's `.html` URLs to their clean equivalents, and returns a real 404
for anything unmatched. `not_found_handling` is deliberately **not**
`"single-page-application"` — that answers 200 for every unknown path, which is a soft 404 and
a regression on what the site does today.

`npm run preview` is the only way to test either; the Vite dev server does not run the Worker.

**Three things live outside this repo and are not set by a deploy:**

1. The Cloudflare build settings still say "no build command, output `/`". They need
   `npm ci && npm run build` and output `dist`.
2. `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` must exist in the **Cloudflare build
   environment**. Vite inlines them at build time, so a deployment built without them ships a
   bundle with `undefined` credentials and every auth call fails at runtime.
3. Nothing on the Supabase side. The redirect allowlist already covers production, the dev
   origin and the Workers preview wildcard.
