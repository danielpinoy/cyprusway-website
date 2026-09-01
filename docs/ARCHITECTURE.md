# Architecture — cyprusway-website

The web client for CyprusWay, served at `https://cyprusway.eu`. Written for someone picking
this up cold: where things are, what talks to what, and what breaks quietly.

**Everything here was read from the code or measured against the live system on 1 September
2026.** Where a plan, a comment or `PARKED.md` disagreed with the code, the code won and the
disagreement is noted. Claims are tagged `[OBSERVED]` (read or measured this session) or
`[INFERRED]`.

---

## 1. The stack, and why

React 19 + Vite 8 + TypeScript, deployed to **Cloudflare Workers**. No Next, no Remix, no
meta-framework. `package.json:26-38` `[OBSERVED]`

Routing is `react-router` 7 in **declarative mode only** — `<Routes>`/`<Route>` in
`src/App.tsx:32-52`, no loaders, no actions, no data router. Every route component is
statically imported, deliberately: `App.tsx:22` records that a lazy import would render as a
suspense fallback during hydration of a prerendered page.

The framework's job — pre-rendering pages so a crawler and a first paint get real HTML — is
done by ~215 lines of `scripts/prerender.mjs` against a normal Vite SSR build. That is the
whole reason there is no framework. State is React context (`SessionProvider`, `I18nProvider`);
there is no Redux/Zustand/React Query.

**Deployment shape:** `wrangler.jsonc` binds `dist/` as static assets plus `src/worker.ts` for
what assets cannot answer. Three Workers exist in this account — the site, `cdn.cyprusway.eu`
(`infra/cdn-worker/`) and `api.cyprusway.eu` (`infra/api-worker/`) — each with its own
`wrangler.jsonc` so the deploys cannot touch each other.

## 2. Repo layout

```
src/
  App.tsx              route table (13 routes, all static imports)
  main.tsx             client entry; hydrates only if #root has children
  entry-server.tsx     SSR entry — renderToString, English only
  worker.ts            Cloudflare Worker: 301s, SPA shell, real 404
  routes/              one directory per surface
    home/ explore/ place/ ask-pete/ build-trip/ plan-trip/ trip/ trips/
    content/           About, FAQ, Privacy, Terms bodies
    routes.ts          ROUTE_META — the single route table (router + prerender + sitemap)
  components/
    shell/             Layout, Header, Footer, MobileMenu, LanguageSwitcher, navigation.ts
    auth/              AuthGate, InterestsScreen, TravellerScreen
    home/ ui/
  lib/                 all I/O and all shared logic (see §4)
  contracts/           client-side copies of server vocabularies (see §9.1)
  i18n/                dictionary, provider, strings/ + generated/
  styles/              tokens.css + global.css
scripts/               prerender, check-env, check-contrast, check-logical-css, port-i18n
infra/cdn-worker/      Worker in front of Directus assets   (cdn.cyprusway.eu)
infra/api-worker/      Worker in front of the booking resolver (api.cyprusway.eu)
docs/                  PARKED.md, phase plans, TRANSLATION-QUEUE.md, this file
```

**Surface → directory** is 1:1 and boring, with two exceptions worth knowing:

| Surface | Route | Lives in |
|---|---|---|
| Homepage | `/` | `routes/home/` (`Hero` + `HomeContent`, rails from `lib/rails.ts`) |
| Explore | `/explore` | `routes/explore/` (filters in the URL) |
| Place page | `/place/:slug` | `routes/place/` |
| Ask Pete | `/ask-pete` | `routes/ask-pete/` |
| Manual trip setup | `/build-trip` | `routes/build-trip/` |
| **Trip editor** | `/trip/:id` | `routes/trip/` — the editor, not `build-trip` |
| Trip list | `/trips` | `routes/trips/` |
| **AI Trip Planner** | `/plan-trip` | `routes/plan-trip/` — **reachable from no nav item** |

`/plan-trip` is entered only through `PlannerEntry`, a card rendered on `/build-trip` and
`/trips` (`routes/plan-trip/PlannerEntry.tsx:8-19`). `[OBSERVED]`

## 3. Rendering: what is prerendered, what hydrates

`npm run build` is six steps (`package.json:10-18`): `check-env` → client build → SSR build →
prerender → logical-CSS check → contrast check. Both quality gates run **after** `dist/` is
written, so a failed check leaves a complete-but-unshipped `dist/`. `[OBSERVED]`

`scripts/prerender.mjs` imports the built SSR bundle by file URL, renders each path with
`renderToString`, and substitutes four things into the client `index.html` template: title,
description, canonical, and `#root`'s markup. If nothing was substituted it throws
(`prerender.mjs:96-98`) — the template shape cannot drift silently.

**192 HTML files**: 11 static routes from `ROUTE_META` + 181 place pages fetched from the
catalogue at build time. `sitemap.xml` carries 190 (`/trips` and `/404` are `noIndex`).
`[OBSERVED — verified against the live site: `/explore`, `/ask-pete`, `/plan-trip` and
`/place/petra-tou-romiou` all return their own prerendered titles]`

Everything is written in **directory form** (`dist/privacy/index.html`), never
`privacy.html` — that is what keeps `/privacy.html` unmatched by the asset layer so the Worker
can own its 301 (`prerender.mjs:65-70`).

**An unknown `/place/<slug>` returns 200, not 404 — so a 200 is not proof a place exists.**
`src/worker.ts` serves the SPA shell for any `/place/*` (and `/trip/*`) the asset layer does
not match, so a place published since the last deploy still opens; the cost is a soft 404 for
a slug that was never real. The shell sets `noindex` and the page renders its own not-found
view, so nothing is indexed and no human is misled — but **anything testing slugs
programmatically must compare the `<title>`, not the status**: a prerendered page carries the
place's own title, the shell carries the site default. `[OBSERVED — `/place/kourion` returns
200 with the default title; `/place/petra-tou-romiou` returns 200 with its own]`

**Place pages carry a seed.** One row — the page's own — is embedded as
`<script id="cw-seed" type="application/json">` beside `#root` (`prerender.mjs:79-82`,
`:173-176`). `lib/prerenderSeed.ts` reads it into `useHomeData`'s initial state and then
**removes the element** so a client-side navigation to another place starts from `loading`
rather than resolving the previous slug. Static routes get no seed; `/explore` deliberately
gets none, because one file serves `/explore` and `/explore?region=paphos` alike and a seeded
grid would hydrate an unfiltered list against a filtered one (`prerenderSeed.ts:20-27`).

**Hydration invariants — three, and all three have already cost a defect:**

- `SessionStatus` starts `'idle'` on the server *and* on the first client render
  (`SessionProvider.tsx:96-99`). Anything else is a mismatch on every page.
- Explore does not apply its URL filters until the catalogue has loaded
  (`Explore.tsx:54-71`) — React keeps server-rendered attributes on mismatch, and a filtered
  grid under an "All Interests" chip shipped once already.
- CSS-module class names are pinned (`vite.config.ts:41-48`) so the client and SSR builds
  agree.

`main.tsx:29` hydrates only if `#root` has children; the Worker's SPA shell empties it for
exactly that reason.

## 4. Data flow

### 4.1 The catalogue — one fetch, plain `fetch`, not the SDK

`lib/catalogueQuery.ts` composes one PostgREST URL; `lib/places.ts:77-95` calls it. Every
browse surface (`Home`, `Explore`, `Place`) shares it through `useHomeData()`.

- `GET {VITE_SUPABASE_URL}/rest/v1/places_sync?status=eq.published&order=prominence.desc.nullslast,id.asc`
- 14 projected columns; **no `limit`** — the whole published set comes back.
- **`apikey` travels in the query string, not a header** (`catalogueQuery.ts:14-18`). That
  keeps it a "simple" CORS request and avoids an 82 ms preflight.
- Measured 181 rows, 89.7 KB raw / **13.8 KB gzipped** (`places.ts:5-15`).
- The compound sort key is load-bearing: six places tie at prominence 85.0 and Postgres would
  otherwise order ties differently between requests (`catalogueQuery.ts:50-53`).

`vite.config.ts:12-39` injects a `<link rel="preload" as="fetch" crossorigin>` for the
identical URL, built from the same function, into every prerendered page. **Chrome only
serves the preload if the URL and credentials mode match exactly** — that is why the tag and
the fetch share one builder rather than two string literals.

There is no application-level cache. `useHomeData` refetches on mount.

### 4.2 The Supabase client is dynamically imported

`lib/supabase.ts` — `getSupabase()` returns a lazily created, lazily *loaded* client; the SDK
arrives through `await import('@supabase/supabase-js')` in its own chunk. Before this it sat
in every page's main chunk at 203 KB raw / ~59 KB gzipped, on the critical path
(`supabase.ts:3-12`).

Consequences to respect:

- **The catalogue read must not touch this module** — it is plain `fetch` for that reason.
- **Nothing on the prerender path may call `getSupabase()`.** It runs in Node with no
  `window` and no `localStorage` and must never construct an auth client.
- The rejected promise is cached deliberately (`supabase.ts:37-42`): credentials are
  build-time constants, so a failure cannot succeed on retry.

Everything else — auth, profile, saved places, trips, Ask Pete — goes through it.

### 4.3 Where each write goes

| Data | Path |
|---|---|
| Profile (9 columns) | PostgREST `users` update, `lib/profile.ts` |
| Saved places | PostgREST `saved_places`, `lib/saved.ts` |
| Trip create / delete | PostgREST `itineraries`, `lib/trips.ts:271-316` |
| **Trip content edits** | **`trip-edit` edge function**, `lib/tripEdit.ts` — never PostgREST |
| Trip generation | `trip-generate`, `lib/tripGenerate.ts` |
| PDF | `trip-pdf`, `lib/tripPdf.ts` |
| Ask Pete turn | `mike` (SSE), `lib/askPete.ts` |
| Clear Pete thread | `rpc('clear_ai_conversation')`, `lib/askPete.ts:766` |

`lib/trips.ts:3-32` states the division: every *content* mutation goes through `trip-edit`;
the only direct writes are the row create and the row delete.

## 5. The backend this client talks to

**Supabase project `knvjmsnwzskbageetbam`** (eu-central-1). 13 tables in `public`; the ones
this client touches are `places_sync`, `users`, `saved_places`, `itineraries`, `ai_messages`,
`ai_conversations`. `[OBSERVED]`

**Eleven edge functions are deployed; this client calls four** `[OBSERVED — Management API,
1 Sep 2026]`:

| Function | v | `verify_jwt` | Used for |
|---|---|---|---|
| `mike` | 49 | true | Ask Pete, SSE stream |
| `trip-generate` | 56 | true | AI Trip Planner (premium) |
| `trip-edit` | 14 | true | every trip content edit — free and unlimited |
| `trip-pdf` | 23 | true | PDF export (premium) |

The other seven (`book-with-pete-route`, `create-checkout-session`, `promo-redeem`,
`stripe-webhook`, `revenuecat-webhook`, `sync-place`, `sync-affiliate-routes`) are not called
from `src/`.

**Directus** is the CMS. It is not on any client path: it syncs into `places_sync`, and this
client only ever reads the mirror. Its **assets** are reached through
`cdn.cyprusway.eu` — `infra/cdn-worker/`, a Worker with a `/assets/<uuid>` allowlist and a
Cache API layer. The swap happens at render time in `lib/directusImage.ts:61-68`
(`CDN_HOST`), not in the stored rows, so it reverts in one edit.

**`api.cyprusway.eu`** (`infra/api-worker/`) fronts `book-with-pete-route` with scoping,
caching and rate limiting. **It is deployed and the site does not call it yet** — no reference
to `api.cyprusway.eu` exists anywhere in `src/`. `[OBSERVED]` The Book with Pete card is
inert for its own reasons (§10).

## 6. Auth

**Google and Apple only.** No email/password, no magic link. `lib/auth.ts:5`, `:83-96`.

Sign-in and sign-up are the same call: `signInWithOAuth` creates the account if it does not
exist, which is why there is no separate sign-up screen (`auth.ts:81-82`).

**PKCE**, set in `supabase.ts:61`. The code and any error come back in the **query string**,
not the fragment — the vanilla site used the implicit flow and read `location.hash` only, so a
straight port would never have fired. `readAuthParams()` reads both, query first
(`auth.ts:13-39`).

**The return leg**, `SessionProvider.tsx:128-188`, in order:

1. `readAuthParams()` runs **before anything constructs the client** — `detectSessionInUrl`
   strips those parameters during initialisation, so this is the only safe moment.
2. `?error=…` → banner, `status: 'ready'`, never onboarding.
3. No code and no stored session → `idle`, and the Supabase chunk is never requested.
4. Otherwise `resolving` → `getSession()` → `fetchProfile()` → `ready`.

`hasStoredSession()` scans `localStorage` for `/^sb-.+-auth-token$/` rather than
reconstructing the key from the project ref (`auth.ts:65-79`).

**`onboarding_completed` decides whether onboarding runs** — see §9.2, which is the rule, not
this paragraph. `SessionProvider.tsx:176` sets `needsOnboarding` from it; `AuthGate` is the
only consumer.

## 7. i18n

**Five languages**, defined once in `src/i18n/languages.ts:25-31`: `en`, `pl`, `de`, `el`,
`sv`. The vocabulary is gated server-side by `users_preferred_language_check`, which admits
exactly those five `[OBSERVED — read from `pg_constraint`]`. Hebrew is absent from both.

**Two dictionaries, merged** (`i18n/dictionary.ts:12`):

| | `i18n/generated/*.ts` | `i18n/strings/*.ts` |
|---|---|---|
| What | the old vanilla site's dictionary, ported | strings the React rebuild added |
| Keys | **177, in all five languages** | **348 in `en`; 0 in `pl`/`de`/`el`/`sv`** |
| Hand-editable | No — generated by `scripts/port-i18n.mjs` | Yes |

`[OBSERVED — counted this session]`

`translate()` (`dictionary.ts:57-67`) resolves `dictionary[key] ?? en[key]`, so **a missing
translation renders English, never a blank or a raw key**. Since all four non-English
`strings/` files are empty objects, *every string the rebuild introduced currently renders in
English in all five languages.* That is deliberate — `strings/pl.ts:1-9`: "inventing
translations for them would be worse than falling back". The queue is
`docs/TRANSLATION-QUEUE.md`.

**To add a translation:** put the key in `src/i18n/strings/<lang>.ts`. It is type-checked
against the English shape, so a typo will not compile. Do not hand-edit `generated/`.

**To add a language:** a record in `languages.ts`, two files (`generated/<code>.ts`,
`strings/<code>.ts`), and a backend change to the CHECK constraint. Direction is data
(`languages.ts:1-12`) and every stylesheet uses logical properties (§8), so RTL is a language
file rather than a rewrite — with the caveat in §9.11.

English is statically imported (the prerender and first paint need it synchronously); the
other four are dynamic imports, so a visitor downloads one language.

**Language choice is stored in three places**, and the third surprises people: `localStorage`
(`cw_lang`), and for a signed-in visitor `users.preferred_language` — which `mike` reads to
decide what language Pete answers in, and which is **the same row the phone app reads**
(`lib/profile.ts:122-138`). The switcher says so.

## 8. The build gates

All three fail the build with a non-zero exit.

**`scripts/check-env.mjs`** (`predev` + `prebuild`). Validates that `VITE_SUPABASE_URL` matches
`^https://[a-z0-9-]+\.supabase\.co/?$` and that `VITE_SUPABASE_ANON_KEY` is a well-formed JWT:
**exactly 3 dot-separated segments and a literal `eyJ` prefix**. It checks *shape*, not
presence, because the failure it was written for was a key pasted twice — present, non-empty,
and rejected at request time as "Invalid API key" (`check-env.mjs:57-71`). It reads
`process.env` first so CI and the Cloudflare build environment pass on their own variables.

**`scripts/check-logical-css.mjs`.** Fails on a physical direction property —
`margin-left`, `padding-right`, `border-*-radius`, bare `left:`/`right:`, `text-align: left`,
`float`, `flex-direction: row-reverse` — plus `.scrollLeft` in TS outside `lib/dir.ts`. Escape
hatch: `rtl-ok` in a comment on the same line. Sizes (`width`/`height`) are declared but
deliberately **not** enforced (`:35-36`). The point is that adding Hebrew stays a language
file, and that guarantee rots one `margin-left` at a time in a language nobody on the team
reads.

**`scripts/check-contrast.mjs`.** Two jobs: re-derive every `contrast: <fg> on <bg> = <ratio>`
annotation in any `.css` under `src/` and fail if it is off by more than 0.05 or below
threshold (4.5, or 3.0 with a qualifier); and **refuse any gold-family colour in a text,
background, outline or border role that has no annotation in its own rule.** See §9.7 — this
one is not optional and has failed open twice. It carries nine inline fixtures that run against
the real checker before `src/` is touched; if the checker stops catching them it refuses to
print a coverage number at all.

## 9. Rules that are not obvious from the code

Every one of these has cost a defect, or is one edit away from causing one.

### 9.1 The interest vocabulary is duplicated five times, and only four copies are safe

**Eleven slugs**, and the live database enforces them:

```
beach_coast · ancient_ruins · local_food · wine_villages · nature_trails · nightlife
adventure · culture_art · kid_friendly · hidden_gems · churches_monasteries
```

`[OBSERVED — `users_interests_check` on the live project reads exactly this set]` and
`src/contracts/interests.ts:19-31` matches it exactly.

The list exists in five places: the app's `interestTags.ts`, `trip-generate`'s
`VALID_INTEREST_TAGS`, migration 0019's CHECK, this repo's `interests.ts` — **and
`src/contracts/interestCategories.ts`**, which is different in kind. The first four are kept
honest by the database: a wrong slug is a Postgres `23514` on the profile write and a 400 on
generation. Loud and immediate.

`interestCategories.ts` maps each interest to CMS category slugs so Top Recommendations can
re-rank. **Nothing validates it.** It is a judgement about what each interest *means*, nobody
else holds a copy, and so it can only disagree silently — the failure to watch for is the app
deciding Adventure contains something different, and a person seeing two different sets of
places with no error anywhere. `waterparks` is deliberately in both `adventure` and
`kid_friendly` today. If the two surfaces ever disagree, **the fix is to move the mapping to
the server and delete the file, never to hand-sync two client copies**
(`interestCategories.ts:3-45`).

`hidden_gems` maps to nothing, on purpose. `petes_picks` is a legal `trip-generate` tag and is
**illegal** in `users.interests` — one picker serving both hits 23514 on exactly that chip
(`PlanSteps.tsx:236-241`).

### 9.2 `onboarding_completed`, never `interests <> '{}'`

The measurement that settled it, `lib/profile.ts:13-17`:

> Measured on the live project: 11 users true, 13 false, and 4 of the 11 completed users have
> empty interests via the app's skip paths — so an interests-based check would re-run
> onboarding for a third of the people who finished it, and disagree with the app's guard in
> both directions.

**And the distinction that is easy to get wrong:** `onboarding_completed` decides whether the
*interests card is shown*. The homepage's personalisation reads `interests` — a signed-in user
with `interests = '{}'` is a completed user who gets the unpersonalised rail, and that is
correct, not a bug (`HomeContent.tsx:42-47`, `SessionProvider.tsx:58-60`). Two fields, two
questions; do not collapse them.

`traveler_type` is null on **25 of 25** accounts (measured 30 Aug 2026, `profile.ts:29-36`).
Null is normal, not an error.

### 9.3 Never fall through to "create account" when a session cannot be resolved

A failed profile read is a **shell error**, and a returned auth code that produced no session
is a **failure banner**. Neither may reach the sign-up card. `SessionProvider.tsx:43-45`:

> Nothing here can reach the sign-up card. It is only opened by an explicit trigger or
> `?mode=signup` — structurally, not by a guard — because that path is how an existing paying
> user ends up creating a duplicate account.

Restated at `profile.ts:19-21`. This is a structural rule: if you add a branch that decides
"treat as new", you have introduced the defect.

### 9.4 `quota_day` comes off the wire; the client never computes a Cyprus day

Both daily limiters moved to the Cyprus calendar day (backend migration 0047). The server
sends `daily_cap` and `quota_day` on Ask Pete's `meta` event *and* on the 429, and the client
computes neither. **Absence means unknown — never "today", never "five"**
(`lib/askPete.ts:32-40`).

Deriving "today in Cyprus" in the browser is the first item in that change's blast radius; it
also needs `Intl` timezone support the app cannot rely on. The same rule governs the trip
counter: `profile.ts:210-215` reads `trip_generations_today` "exactly as stored. NOT
interpreted here."

A count the server has not dated is shown as *uncertain* and **does not disable anything** —
locking someone whose day has rolled over strands them, while letting someone at the cap press
send costs a refusal that is free and carries the `quota_day` that settles it.

### 9.5 Dates: `en` resolves to `en-US`, and a frame's calendar is the designer's locale

`Intl` resolves a bare `en` to `en-US`, which puts the month first. Every trip card, day
heading and review line rendered "Sep 15, 2026" until 30 Aug 2026 — **while the comment above
`formatDate` claimed "10 Sep 2026"**. Fixed with a one-line map in `lib/tripDates.ts:91-106`:

```ts
function dateLocale(lang: string): string {
  return lang === 'en' ? 'en-GB' : lang;
}
```

Applied to `formatDayHeading`, `formatDate`, `formatDateLong` — and **deliberately not to
`formatTime`**, because `en-GB` would also flip the clock to 24-hour and the frames and the
app both draw "6:00 AM".

Two neighbours in the same file: every formatter passes `timeZone: 'UTC'`, because a stored
day dated 31 August displayed as "Sun, 30 August" to a reader west of Greenwich
(`tripDates.ts:108-119`); and a stop stored at `09:00` displayed as 11:00 AM in Cyprus until
the same fix (`:168-181`).

**The standing rule for design:** a frame's calendar or date order is a placeholder in the
designer's locale, not a specification. Every language this site ships is day-first with a
Monday week (`Intl.Locale('el-CY').weekInfo.firstDay === 1`); the mobile frames are drawn
Sunday-first and month-first for a Cyprus audience. Check before copying.

### 9.6 Replacing a place photo means uploading a new file

A Directus asset URL is a pure function of the file UUID — no version, no filename — and
three caches now hold what it returns: every visitor's browser for 30 days, Directus's own
derivative objects, and the Cloudflare edge at `cdn.cyprusway.eu`. **The Files module's
replace-in-place keeps the UUID, so every layer keeps serving the old bytes**, and a free-plan
purge is exact-URL-only — roughly 16–20 URLs per asset for this site's slot matrix alone.

**The rule: upload a new file, re-point the place row, delete the old one.** New UUID → new
URL → nothing can be stale. (`docs/PARKED.md:1626-1649`)

Two companions in `lib/directusImage.ts`, which is **the only place a transform query string
is composed**: an unrecognised parameter is silently ignored and Directus returns the
full-size original with a 200 — so `?w=160` "works" and ships a 400 KB JPEG that looks right
and is just slow (`:8-11`). And **do not add `crossorigin` to any `<img>` rendering these
URLs** (`:32-39`): they are fetched no-cors, and against the direct Railway origin the browser
would reject them, silently, in whichever environment bypasses the Worker.

### 9.7 Gold on a light background has failed ten times; the contrast checker is not optional

Across four phases this project found **ten** WCAG contrast failures and every one was the
same shape: light text on gold, or gold text on something light. `--cw-gold` is `#c49a10`:

```
#c49a10 on --cw-sand  = 2.32   (gold cannot be a link colour on a light ground)
#ffffff on #c49a10    = 2.63   (rejected)
#f5f0e8 on #c49a10    = 2.32   (rejected)
--cw-black-1 on gold  = 6.46   (the ruling: copy on gold is black)
```

`--cw-gold-link` (the same hue at 65%) exists for the light-ground case and sat **unused** for
three phases while the failures accumulated — the fix was already in the codebase; what was
missing was anything that noticed (`check-contrast.mjs:1-13`, `styles/tokens.css:40-62`).

So: any gold in a `color`/`background`/`outline`/`border-color` role **must** carry a
`contrast:` annotation in its own rule, and every annotation anywhere is re-derived on every
build. `outline` and `border-color` were added after a focus ring shipped in unmeasured gold.
The checker has failed open twice (CRLF hiding a blank line; a byte-0 fallback) and now
refuses to print a coverage number if its own fixtures stop failing.

### 9.8 `trip-edit` takes POIs by id only — no times

The request is `{ itinerary_id, expected_updated_at, days[], name?, trip_start? }` where a day
is `{ source_day_number, pois: [{ place_id }] }` and **nothing else**. The deployed function
refuses more, by name (`lib/tripEdit.ts:20-31`):

```
400 unknown keys in days[0].pois[0]: start_time
    (stops are sent by place_id only; times, legs and lunch are server-derived)
```

**Never send `trip_end`** — the server derives it from `trip_start` plus the day count, and
sending it is a 400 naming the key.

That is also the answer to the frame's per-day time chip: it is not built, and the UI says in
one line what happens instead — a stop starts when the one before it ends, plus travel. The
response is canonical and **replaces local state wholesale**. `trip-edit` makes no model call
and never touches `consume_trip_generation`: it is free and unlimited, which is load-bearing
for any future sibling that inherits its skeleton.

### 9.9 `rpc('clear_ai_conversation', anything)` is a 404

The function takes no arguments, and **PostgREST resolves overloads by argument name** — so
passing any object finds no overload and returns 404, not a message naming the problem.
`rpc(name)` sends `{}` and is correct. `[OBSERVED — measured 31 Aug 2026 against the deployed
function]`

It matters because this client's rule is "any non-2xx is a failure": a 404 from a stray
argument is indistinguishable from an outage and would be reported as "that couldn't be
cleared" forever. The guard is the comment on `clearConversation` (`lib/askPete.ts:761-764`).

The RPC returns two success shapes — `{cleared: true, messages_deleted: n}` and
`{cleared: false, messages_deleted: 0}` — and **any 2xx is success**. `messages_deleted` is
informational and may skew by up to 2 against a concurrent turn; it must never reach a
sentence a user reads.

### 9.10 `.env` is gitignored, `.env.example` carries the working key, and neither may be deleted

`.gitignore` ignores `.env` and `.env.*` then re-includes `!.env.example`. **`.env.example` is
tracked and contains a real, working anon JWT** (role `anon`, project ref matching
`VITE_SUPABASE_URL`, valid to 2036) and is byte-identical to `.env`. `[OBSERVED — verified
structurally this session without printing the value]`

The anon key is public by design — it identifies the project, is constrained by RLS, and Vite
inlines it into every built bundle. It lives in a file so it is configured per environment.

Both the README and the `setup:env` message used to say the example's key was blank and had
to be filled in; **corrected 1 Sep 2026** — it never was. The safety rule survives the stale
reasoning, for a narrower reason than the one it was given: **never `cp` over an existing
`.env`, and never delete one to "clean up"**. The two files are byte-identical today so a copy
costs nothing today; the rule is about the day `.env` points at a different project, when the
copy silently replaces it and the failure looks like a data outage rather than a config
problem. `setup:env` refuses to overwrite.

Both variables must **also** be set in the Cloudflare build environment. Vite reads them at
build time, so a deployment built without them ships `undefined` credentials.

### 9.11 Two smaller ones worth knowing before you touch them

**Chrome does not re-map logical border radii when `dir` changes at runtime.** A rule parsed
while the document was LTR keeps its mapping; a rule parsed after the flip is correct. So a
page *loaded* in an RTL language is fine and only a runtime switch is affected. The likely fix
when Hebrew lands is to reload on a *direction* change (`docs/PARKED.md:665-695`).

**`pace_preference` and `morning_preference` are not `trip-generate` request fields.** Sending
either is a 400 naming the key; the server reads them off `public.users`, so the only way to
make the choice take effect is to store it — which is why the planner's step 1 writes to the
profile on Continue, and why abandoning the wizard at step 2 has already changed the phone
app's stored preferences (`lib/profile.ts:275-293`).

**`users` UPDATE is granted per column.** The table grant is SELECT only; exactly **nine**
columns are updatable by `authenticated` — `considerations`, `display_name`, `interests`,
`is_first_time_visitor`, `morning_preference`, `onboarding_completed`, `pace_preference`,
`preferred_language`, `traveler_type`. `[OBSERVED — read from `pg_attribute.attacl`]` A tenth
profile column needs a grant, not just a policy: without one the write fails `42501` even
though RLS permits the row.

## 10. Known gaps

**`docs/PARKED.md` is the register** — every deliberate omission with the trigger that
unparks it. It is long and current; do not duplicate it here, and read it before assuming
something was forgotten. The short orientation:

- **No search.** Both vector RPCs are `service_role`-only since migration 0028. The header,
  footer and drawer boxes render **disabled** with a "coming soon" label rather than accepting
  text and doing nothing. The trip stop-picker's box is a different thing wearing the same
  word — an in-memory substring filter over already-loaded places.
- **No map.** The place page has no map section at all; the trip page ships a placeholder
  panel (its day tabs and stop rail are real); Explore ships List with no toggle. Blocked on a
  web mapping provider and a key.
- **No 360° tours.** `virtual_tour` is null on **all 182 rows** `[OBSERVED]`. The rail and
  card are built and gated on `tours.length > 0`, so they appear the day a row lands.
- **Premium is not purchasable here.** `stripeEnabled` is false and
  `create-checkout-session` still returns buyers to two pages phase 1 deleted. The planner's
  gate renders an honest explanation with **no call to action**, deliberately.
- **108 of 181 published places have no photograph** `[OBSERVED]`, and none has a gallery
  without a hero, so the card and gallery fallbacks cannot disagree `[OBSERVED — measured to
  close an open question in the code]`. Unphotographed cards carry the place's
  `short_description` instead of a picture.
- **The Book with Pete card is inert**, and note *why*: the fourth of its four stated reasons
  — that `affiliate_routes` is empty — **expired on 31 Aug 2026**. The table now holds **42
  rows, 38 active and territory-approved** `[OBSERVED]` and the live resolver returns `ready`
  with a real URL. Three reasons still stand and are what keeps Continue disabled: the card
  collects one of five required fields, its chips are not the region vocabulary, and it says
  "choose as many as apply" where the API takes exactly one. The expired reason is struck
  rather than deleted in both the card and `PARKED.md`, because the tempting move on finding
  it stale is to switch the card on. What actually unparks it is a design decision about
  where the missing four inputs live.

## 11. Where the two repos disagree, and which wins

`cyprusway-directus` holds the migrations, the edge functions and the Decision Log;
`cyprusway-website` holds this client. **The database and the deployed function are
authoritative for every contract**; anything in `src/contracts/` is a copy that exists only
until a `client_config` RPC replaces it.

Concretely, and all three verified this session:

| Claim | Where it was stale | Authority | Status |
|---|---|---|---|
| "`affiliate_routes` holds zero rows" | `PARKED.md`, `BookWithPeteCard.tsx` | the table — 42 rows, 38 live | struck in both, 1 Sep |
| "The example's key is blank" | `README.md`, `setup:env` | the file — a working key | corrected, 1 Sep |
| "219 English-only strings" | `PARKED.md`; the queue said 346/325 | the files — **348**, 0 translated | reconciled, 1 Sep |
| "170 ported keys" | `scripts/port-i18n.mjs` | the blob — **177**, no gaps | corrected, 1 Sep |

A pattern worth naming rather than listing: **this repo's comments assert intentions as
facts**, and the assertion outlives the intention. Six were found and fixed on 1 Sep 2026 —
the four above plus `saved.ts` headed "read only" above its own write, `HomeContent` claiming
`saved_places` "has never held a row" after the save button shipped, `worker.ts` saying it
serves the shell for `/place/*` "and only" while also serving `/trip/*`, `RankInspector`
labelling its pool "scored AND hero-bearing" after the hero requirement was dropped, and
`PlannerEntry` claiming to say "Premium in plain words" in three strings that never contained
the word. None changed behaviour; each would have misled the next reader. When a comment and
the code disagree here, **the code is the subject** — and the comment is a defect, not a
footnote.

Use the Decision Log in **`cyprusway-directus/docs/reference/curated/`** and take the highest
version number (v3.4 today). The copy inside `cyprusway-app` is v3.0, stops at entry 49, and
reading it has produced wrong work three times.

## 12. What I could not verify

- **Whether a client-side navigation reuses the catalogue response.** There is no
  application-level cache; it depends on PostgREST's HTTP cache headers, which nothing in this
  repo asserts. `[INFERRED]`
- **The Ask Pete streaming path end to end.** `lib/askPete.ts:15-18` still records it as
  unverified against a live signed-in stream; the transport and every auth-failure shape are
  confirmed. I did not drive a signed-in stream this session.
- ~~**`?dir=rtl` in production.**~~ **Fixed 1 Sep 2026.** The React-side override was stripped
  by a `DEV` guard and `index.html`'s inline script was not, so the flag flipped the live
  document's direction while the dictionary stayed put. `import.meta.env.DEV` does not reach a
  plain inline script, so the fix is a build-only Vite plugin (`cw-strip-dev-only`) that
  removes the two lines marked `/* cw:dev-only */` and **throws if it removes none** — a
  silent no-op would restore the bug exactly. `npm run dev` is unchanged.
- **Anything about the mobile app's current state.** This document is about the web client;
  app claims here come from cross-repo comments, not from reading that repo this session.
