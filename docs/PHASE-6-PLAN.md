# Phase 6 — the AI Trip Planner

Branch `web-phase-6`, from `web-phase-5`.

Frames: the brief's list is corrected in §1. The ones that exist and matter are the web
frame `3791-27422`, the mobile steps `3791-27032` / `3791-27227` (preferences),
`3603-17674` (dates), `3603-16677` (base + interests), `3777-33275` (party),
`3603-16826` (loading), and the paywall `3603-17982`.

The brief said the code wins. I read the code and probed the deployment. **The scoping
report holds on every load-bearing claim** — the gate, the field list, the 31-day bound,
the quota order, the response shape. Three things in the brief itself do not hold, and one
frame the brief did not know about changes an answer; those are §1 and §13.

---

## 0 · What I verified against the deployment

`trip-generate` validates the request body **before** it authenticates (`index.ts:1376-1525`
runs ahead of `authenticateUser` at `:1528`), so the whole request contract is probeable
with the project anon key as the bearer. No probe reaches the premium gate, the quota RPC,
the embedding or the model, and none can create a row. Run 30 Aug 2026:

| Sent | Got |
|---|---|
| `OPTIONS` | **204** |
| `…, "pace": "relaxed"` | **400** `unknown request keys: pace` |
| `…, "trip_priority": "nearby"` | **400** `unknown request keys: trip_priority` |
| 1 Oct → 1 Nov (32 inclusive days) | **400** `maximum trip length is 31 days` |
| 1 Oct → 31 Oct (31 inclusive days) | **401** `unauthorized` — validation passed |
| `trip_start` = today UTC | **400** `same-day trips are not supported; trip_start must be tomorrow or later` |
| six `interest_tags` | **400** `interest_tags must be an array of 1–5 slugs` |
| `interest_tags: ["petes_picks"]` | **401** — accepted by validation |
| `trip_party: {type:"family", child_age_range:"under_5"}` | **401** — accepted |
| `trip_party: {type:"friends", group_size:4}` | **401** — accepted |
| `base_location: "ayia_napa"` | **400** `base_location must be one of: paphos, limassol, larnaka, famagusta, troodos, nicosia` |

The second row is the one that settles the disputed step: **the field the fifth control
would send is refused by name.** That is the ruling from the server's own mouth, not from a
decision-log citation.

Also read at HEAD, and matching the report's line references: the order of checks
(`:1366-1623`), the gate (`:1555-1557`), the quota consume (`:1567`), the four `422`
`generation_failed` details, the `502 upstream/openai` on both OpenAI paths, the persist
(`:993-1126`) and the response (`:2318-2333`). And migration `0047`'s
`consume_trip_generation`: the day is `(now() AT TIME ZONE 'Asia/Nicosia')::date`, it is
returned as `quota_day` on **all three** branches, an over-cap call **does not increment**
(so a 429 costs nothing), and the function is `service_role` only — a client cannot call it
to read a count, it must read the columns.

`scripts/check-contrast.mjs` re-run before planning any gold: *contrast check passed — 9
guard fixture(s) still caught, 138 annotation(s) re-derived, 44 gold declaration(s) all
measured.* The brief asked whether the fail-open fix had landed. **It has** — 28 Aug, with
the nine fixtures that make a regression unable to report a pass. Nothing here has to wait
on it.

---

## 1 · The frames — what each node actually contains

The brief warned the node list was duplicated in places. It is worse than that: **two of
the seven labels are wrong, one frame is missing entirely, and the paywall the brief quotes
is not in the list.** Pulled and read, every one:

| Node | Brief's label | What it actually contains |
|---|---|---|
| `3791-27422` | web, `01-region` | **The web frame, 1440×1550.** Shell header and footer as shipped; centred "AI Trip Planner / Your Cyprus Travel Companion"; heading "Where are you going? / Choose as many as apply" over **Pace preference** (Relaxed · Balanced · Packed), **Morning preference** (Early riser · Normal · Late starter), **"What matters more for this trip?"** (Convenient & Nearby · Popular Highlights); a disabled full-width Continue; a **five-dot numbered step indicator**, "1" ringed gold |
| `3791-27032` | "the paywall" | **Not the paywall.** iPhone, the preferences step with nothing selected. Five-segment progress bar, first segment gold. Skip + Continue. Pace and Morning only — **no "What matters more"** |
| `3791-27227` | preferences, selected | Correct. Same frame with Balanced and Normal selected — gold fill, white label |
| `3603-16677` | "dates, base destinations, interests" | **No dates.** `04-region/interest`: "Select Base Destinations" (six chips with 24px photo discs, Paphos ringed) and "What do you want to do?" (eleven interest chips with discs). Three of five segments |
| `3777-33275` | party, with descriptions | Body correct, **heading wrong**: it reads "What do you want to book? / Choose as many as apply" over Solo · Couple · Family · Friends with one-line descriptions. Four of five segments. No child-age control anywhere on it |
| `3603-16826` | loading | Correct. `06-loading-results`: Pete reading a map, "Building your Cyprus route…", three dots. No tab bar, no time estimate, no cancel |
| `3603-17182` | "the result" | **The phase-5 editor, already built.** Day headings, stops with time, Get Directions, drive/walk legs, Add to Trip / Add Day. It draws **no notes** — see §7 |
| `3605-18809` | "Edit trip using AI" | Correct. A sheet over the editor: "Tell Pete anything specific, e.g. travelling with a toddler, need wheelchair access, celebrating…", `+`, send. No endpoint exists |

**The two frames the list is missing** were found by following the app's own source
comments — each planner screen names the frame it was built from:

| Node | What it is |
|---|---|
| `3603-17674` | **`03-time` — the dates step.** "Trip Date", a month grid (September 2026) with month arrows and a **contiguous range selected, 14–17**, start underlined. Sunday-first week. Two of five segments |
| `3603-17982` | **`01-premium` — the paywall.** Gold sheet, crown, "Let CyprusWay plan your days" / "Your dates, your base, a complete day-by-day plan **in about ten seconds**"; three benefit rows; "CyprusWay Premium **€4.99 / month**" over "**One Time Payment**"; a Continue button |

`3603:16697` (`02-profile`) and `3603:16796` (`05-input`) are named in the app's source and
**no longer exist in the file** — the MCP returns node-not-found for both. They were
replaced by the `3791` and `3777` frames. That matters twice:

1. **The morning question has been answered.** The app built two morning cards because the
   old frame drew two for a three-value column, and flagged it: *"neither selected means
   'normal' … Inferred, not drawn — flagged for the designer."* The replacement frames draw
   **three** — Early riser, Normal, Late starter — in both the mobile and the web frame. The
   web builds a three-option radio group and the inference disappears.
2. **The party step lost its unbuildable half.** `05-input` drew booking chips and a
   free-text box, neither of which `trip-generate` accepts; the app documented refusing
   most of that frame. `3777-33275` is the same step reduced to the four values the request
   actually has. Only its heading survives from the old one, which is why it says "book".

### The step count does not change

The brief says the five-dot indicator's *"count changes once the dropped step goes."* **It
does not.** "What matters more" is the third *group on step 1*, not a step of its own — the
web frame shows all three groups under a single ringed "1". The five positions are five
screens, and the mobile progress bars confirm the numbering: preferences = 1 of 5, dates =
2, base + interests = 3, party = 4. Position 5 is the screen the app calls `generate` and
draws outside its own progress chrome.

So the honest wizard is **still five steps**, and the fifth is the one the money requires
anyway (§3.5).

---

## 2 · The contract I am coding against

`POST {SUPABASE_URL}/functions/v1/trip-generate`, `Authorization: Bearer <user JWT>` +
`apikey`. Five accepted top-level keys and no others; any sixth is a 400 that names it.

```jsonc
{
  "trip_start": "2026-09-14",          // YYYY-MM-DD, strictly after today in UTC
  "trip_end":   "2026-09-17",          // >= trip_start, span <= 31 inclusive days
  "base_location": "paphos",           // exactly one of six slugs, case-sensitive
  "interest_tags": ["beach_coast"],    // 1-5 of the eleven (+ petes_picks, not offered)
  "trip_party": { "type": "family", "child_age_range": "under_5" }   // optional
}
```

**Everything else generation uses is read server-side from `public.users`** — `pace_preference`,
`morning_preference`, `interests`, `considerations`, `traveler_type`, `preferred_language`,
`is_premium`. That is why step 1 is a profile write and not a request field.

**Response 200** — `{ itinerary_id, name, trip_start, trip_end, base_location, type,
days_requested, days[] }`. The row is INSERTed by the function before the response, so
`itinerary_id` is a real row id: **route to `/trip/{itinerary_id}`** and the phase-5 editor
takes it from there.

**The order that decides the loading screen** (`handleRequest`): premium gate `:1555` →
**quota consumed `:1567`** → embed `:1663` → retrieval → hydrate → matrix → LLM `:1834`
(twice, normally) → assemble/validate → persist `:2288` → respond `:2318`. Everything after
`:1567` has already spent one of the day's three.

**Rejections, and what each means to this client:**

| status | `error` | what the client does |
|---|---|---|
| 400 | `invalid_request` | a bug on this side — every rule is pre-validated in the wizard. Logged, generic copy |
| 401 | `unauthorized` | session gone; re-auth |
| 403 | `premium_required` | §4. **Nothing consumed** — the gate precedes the counter |
| 403 | `account_required` | anonymous session. Unreachable on the web (no `signInAnonymously` anywhere in `src/`); handled defensively |
| 429 | `rate_limited` (+ `remaining`, `daily_cap`, `quota_day`) | nothing consumed. Show the day from the wire |
| 422 | `generation_failed` | **counted.** Retry is legitimate. §5.2 |
| 500/502 | `upstream` | **counted** if it landed after `:1567`. Re-query before offering anything. §5.3 |

---

## 3 · The steps that survive, in order

Five steps at `/plan-trip`, step held in `?step=n` so the browser Back button works and a
reload does not silently jump. A `?step=` beyond what the draft supports redirects to the
first incomplete step.

### 3.1 Step 1 — Pace and Morning · **writes the profile**

Two radio groups, three options each: Relaxed · **Balanced** · Packed, and Early riser ·
**Normal** · Late starter. "Balanced" is the frame's word for the column's `moderate`; the
label is the frame's and the value is the column's.

Continue does one `UPDATE public.users SET pace_preference, morning_preference … .select('id')`
— the zero-row guard `saveInterests` and the app's `writeTripProfile` both use, because a
zero-row update reports success without it. A write failure blocks Continue with a retryable
message; it must not proceed, because the server would then plan at the *stored* pace while
the screen says otherwise. Skip advances and leaves the stored values alone, which is
exactly what the server falls back to.

Prefilled from the one `users` read the flow makes at entry (§3.6), so a second run starts
from what is stored rather than from a default.

**Consequence worth stating:** this writes on Continue, so a wizard abandoned at step 2 has
still changed the account's stored preferences — including in the app, same row. The app
does this too. → **Q5.**

> **Flag for whoever runs the first signed-in test.** The tester is the dev account
> (`6f379bc1-…`), the one premium account, and its stored `pace_preference` /
> `morning_preference` are **`moderate` / `late_riser`**. Step 1 will overwrite them on the
> first Continue — with `moderate` / `normal` if the wizard is walked through without
> touching the tiles, because `normal` is the default the screen starts from and
> `late_riser` is what the row holds. **Every measurement report to date has checked that
> pair as "unchanged since the predecessors" before spending a generation**, so any later
> corpus comparison must re-read the profile rather than assume it. Set the tiles
> deliberately on the first run, or re-set the column afterwards, and note which was done.

### 3.2 Step 2 — Dates · `trip_start`, `trip_end`

Two native `<input type="date">`, From and To — phase 5's ruling for `/build-trip`, and it
is the right one again here: the browser control is keyboard-accessible, localised, RTL-safe
and honours `min`/`max` for free, where the frame's hand-drawn month grid is none of those
and is why the app had to write one.

- `min` on From is `minTripStart()` — already in `src/lib/tripDates.ts`: strictly after
  today on **both** the local and the UTC clock, so the UTC same-day gate can never fire and
  the picker never offers a day the user would call today.
- `max` on To is From + 30, so the 31-day bound is enforced by the control, not by an error.
  The constant is `MAX_TRIP_DAYS` from `src/lib/trips.ts`, which is already 31 from the
  `trip-edit` contract. **No new constant, and nothing inherits the app's `MAX_DURATION_DAYS = 32`**
  — that value produces a request the server refuses (probed, §0).
- A live "{count} days" line, as `/build-trip` has.

The frame's model is a range on one calendar; two date inputs express the same range and are
the shipped web pattern. The frame's duration chips (1–16 plus "17 day+") are not built —
duration is derivable from the range and the chips are the app's workaround for a month-only
picker.

### 3.3 Step 3 — Base destination and Interests · `base_location`, `interest_tags`

One screen, as the frame draws it.

**Base destination** — single-select radio group, styled as the frame's chips. The options
come from the catalogue via `regionOptions()` intersected with the six slugs — the pattern
`/build-trip` already uses — so labels are translated and `famagusta` reads "Ayia Napa &
Protaras" rather than a slug. **Text only, no photo discs:** `destination.hero_image` is null
on all six, a standing departure made twice already (Explore's chips, phase 3; `/build-trip`,
phase 5).

**Interests** — 1 to 5, from `src/contracts/interests.ts`, with the 24px discs that already
exist at `public/images/interests/*.png` and the translated `onb_i_*` labels. Continue is
disabled at zero; at five the unselected chips are disabled with the count stated in text,
not only by dimming. `petes_picks` is a valid request tag and is **not offered** — no chip
is drawn for it anywhere, and it cannot be written to `users.interests` (23514), so offering
it here would be the only place in either client that knows about it.

Not prefilled from the profile's stored interests. They can hold up to eleven and the request
takes five, so prefilling would either overflow or silently truncate someone's stated
interests into a per-trip choice they did not make.

### 3.4 Step 4 — Travel party · `trip_party`, optional

Four options with the frame's descriptions, single-select radio group:

- **Solo** — Flexible ideas, easy-to-visit places and experiences that work well on your own.
- **Couple** — Scenic escapes, shared experiences and places that feel special together.
- **Family** — Family-friendly places, simple days out and experiences for different ages.
- **Friends** — Lively places, group activities and memorable experiences to enjoy together.

When Family is chosen, a second group appears: Under 5 · Ages 5–12 · Teenagers. It is drawn
in no frame; it is in the contract, only `under_5` has an effect (it adds the `young_children`
consideration), and the app collects it the same way. Skippable: `trip_party` is optional and
Skip clears it.

`group_size` is accepted, stored and **never used in generation** (`:1629`). Not collected —
presenting a control that changes nothing is the same error as the fifth tile.

The heading is written from the body, not from the frame: **"Who is travelling?"**. "What do
you want to book?" belongs to the deleted `05-input` and to Book with Pete.

### 3.5 Step 5 — Review, and the one button that spends money

Not in any frame as a numbered step; it is the app's `generate` screen and it is the fifth
position the indicator already reserves. It exists because the spend must be **an explicit
click on a screen that says what it costs**, never a side effect of pressing Continue.

- A summary: where, when, how many days, interests, who is travelling.
- The remaining count, derived honestly (§5.4).
- **Create my trip** — the only gold button in the flow.
- "Usually 20 to 30 seconds. Sometimes longer." — measured (§5.1), not the frame's *"about
  ten seconds"* and not the app's *"about 15 seconds"*, both of which are below the median.

### 3.6 One `users` read, at entry

`is_premium, pace_preference, morning_preference, trip_generations_today,
trip_generations_reset_at` — one row, under the existing own-row policy, the same shape as
the app's `loadPlannerUser`. It answers the gate, prefills step 1 and drives the count. Not
`fetchIsPremium()`: that function returns `false` on a read failure, which is right for
hiding the PDF button and wrong here, because it would tell a paying account it is not
premium. This read returns **`premium | free | unknown`**, and `unknown` falls through to
the wizard and lets the server decide — the 403 is free and consumes nothing, so an
optimistic pass costs nothing while a false refusal costs a paying user the feature.

### 3.7 The step that does not survive

**"What matters more for this trip?" is dropped.** Decision Log entry 54 (20 Aug, migrations
0033–0039) declined exactly this as a `trip_priority` enum — *"the enum arbitrates a
trade-off that does not exist … No screens, no enum, nothing for the designer"* — because
candidate selection is embedding distance plus the region package, the model is given only
`place_id, name, lat, lng, duration_min`, and R9 measures scatter afterwards and is advisory.
The gap it was aimed at was real and was closed in **retrieval**, not in a control.

And the deployment says the same thing without being asked: `"trip_priority"` in the body is
**400 `unknown request keys: trip_priority`** (§0). It appears in no mobile frame and neither
client collects anything like it.

---

## 4 · The 403 — what most visitors will see

25 accounts, one premium. **This is the common path, and it is a page, not an error state.**

Two entry points: the profile read at §3.6 says `free`, or a `403 premium_required` comes
back from the wire. Both land on the same content — the second only happens if the column
changed underneath us, and it costs nothing when it does.

**What it says.** The heading is what the feature is, not what the visitor lacks:

> ### Pete can plan the whole trip
>
> Tell Pete your dates, where you are based and what you like, and he builds a complete
> day-by-day plan — real places from the CyprusWay catalogue, grouped by area, with lunch
> and travel time worked in. It arrives in your trips, ready to edit.
>
> **Trip planning is part of CyprusWay Premium**, along with:
>
> - **Three planned trips a day** — each one a full itinerary you can reorder, add to and
>   trim.
> - **Print or download any trip as a PDF** — the whole plan on paper, for the car.
> - **Unlimited Ask Pete** — no daily limit on questions.
>
> **Premium is not on sale on this site yet.** There is nothing to buy here today. If your
> account already has Premium, sign in with it and the planner opens.

Then one live link out: **Build a trip yourself** → `/build-trip`, which is free, unlimited,
and produces a trip in the same editor. That is the honest alternative and it exists.

**What it does not have: a button.** No Continue, no Upgrade, no price. `stripeEnabled` is
false, `create-checkout-session` still returns buyers to two deleted pages, and there is no
premium route on this site — so a call to action would be a dead gold button on the one
screen where somebody has just been told no. Phase 4 set that precedent with "Unlock
Unlimited": the message was kept and the action removed rather than disabled.

**What it does not say, and why.** All four of the paywall frame's claims are false today:

| `3603-17982` says | measured |
|---|---|
| "All 25 full 360° tours, every aerial preview" | `places_sync.virtual_tour` is null on **182 of 182** rows. **Zero tours exist.** The app removed this line on 21 Aug for that reason; the legacy site still ships it on two deleted pages |
| "our 87 curated places and 37 vetted restaurants" | **181 published, 146 plannable, 37 restaurants.** 87 is the placeholder figure already dropped from this site's hero |
| "€4.99 / month" above "One Time Payment" | It is **one-time**. Two different products in one card |
| "a complete day-by-day plan in about ten seconds" | **median 22 s, worst measured 57.4 s** (n=14). Not in the brief's list; found by pulling the frame |

No price appears on the page at all. €4.99 is the App Store product's price; the Stripe
price comes from a secret and has never charged live money. Quoting a price nobody can be
charged is the same class of error as the other three. → **Q2.**

**Signed out** gets the sign-in panel first, the same component and copy as `/build-trip`,
`/trips` and `/trip/:id`. A signed-out visitor is not told about the gate, because they have
no account to be gated on yet.

**The paywall itself is parked**, with the entry drafted in §12 for `PARKED.md`.

**One forward-compatibility rule, from `free-cap-flag-scoping-2026-08-30.md`:** if the
parked free-cap flag is ever switched on, a non-premium account that runs out gets a
`429 rate_limited`, not a 403. So the client branches the 429 on `is_premium`: premium →
"that is all three for today"; non-premium → this same page. Written now, it means the flag
is a secret flip rather than a web release.

---

## 5 · The loading screen

### 5.1 The bound: 120 seconds

Measured wall clocks, n = 14: min 12.8 s, **median 22**, p75 ≈ 32, **max 57.4**. Two LLM
calls is the norm, not the exception — 15 of 15 recent generations ran both attempts — so the
band is set by two `gpt-4.1-mini` completions plus an embedding, not by trip length; the
14-day trip sat in the middle at 37 s.

**Neither OpenAI call carries a timeout or an abort signal** (`llm.ts:109`, `index.ts:2348`).
The only ceilings are OpenAI's own and the platform's per-request wall clock — 150 s on the
Supabase Free plan, 400 s paid; prior sessions recorded this project as Free, and the plan is
not exposed by the Management API, so 150 s is `[unverified]`.

The app waits **90 s**. I am choosing **120 s**, for two reasons.

1. **57.4 s is the maximum of fourteen samples, not a ceiling.** A distribution with that
   shape, driven by two independent completions, will put samples past 90 s eventually.
2. **Aborting early produces the worst available outcome.** The generation is spent, the row
   is going to be written, and we have just told the user something failed. 120 s sits above
   any plausible success and below the platform ceiling that would kill the request anyway,
   so giving up at 120 s means giving up roughly when the server does.

**And the abort is not the end of the story** — see §5.3. The far more important fix is that
the recovery re-query must not be a single shot fired at the exact moment the persist is
racing it.

**What the screen shows while it waits.** The frame's Pete-with-a-map (`3603:16832`, to
export as a webp beside `public/images/pete.webp`), "Building your Cyprus route…", the three
dots. Plus two things the frame does not draw:

- a second line, **"Usually 20 to 30 seconds"**, replaced at 45 s by **"Still working —
  this one is taking longer than usual"**. Both are `role="status"`, so the change is
  announced once rather than polled.
- no cancel. There is nothing to cancel: the generation is paid for the moment the request
  clears `:1567`, and stopping the client would not stop the server or refund anything.
  Offering Cancel would imply both.

### 5.2 The failure copy — every one of them says whether it counted

The rule from Ask Pete stands: **server strings are never rendered.** `detail` is logged,
never shown.

| Outcome | Counted? | Copy | Actions |
|---|---|---|---|
| `422 generation_failed` | **yes** | "Pete could not build this trip. That attempt counted — you have **{n} of {cap}** left today. Changing your dates, base or interests usually helps." | Try again · Change details · Back |
| `502 upstream` / `500` **and** no new row found | **yes** | "The planner could not finish. That attempt counted — **{n} of {cap}** left today." | Try again · Back |
| `500`/`502`/timeout **and** a new row found | **yes** | "Your trip was created. The connection dropped on the way back, but Pete finished the plan — and that generation is already counted." | **View your trip** — and no retry |
| timeout at 120 s, **no** row after polling | **probably** | "Pete is taking longer than expected. That attempt counted, and if the plan finishes it will be in My Trips." | **Check My Trips** · Back — **no retry** |
| network error before any response | **no** | "Could not reach the planner. We checked — no trip was created, so trying again is safe." | Try again · Back |
| `429 rate_limited` | no | "That is all **{daily_cap}** for today. More on **{quota_day + 1}**, Cyprus time." | Back |
| `403 premium_required` | no | §4's page |
| `400 invalid_request` | no | "Something in this trip did not make sense to the planner." — and it is logged as a client defect, because every rule is pre-validated |

Two rules make this list what it is.

**"That attempt counted" is not an apology, it is a number.** After any response that got
past `:1567`, the row has just been written by the RPC with `trip_generations_reset_at` set
to today's Cyprus day — so re-reading the row immediately after a failure gives a count that
is *certain*, not a client guess (§5.4). The copy shows it. "Something went wrong, try
again" invites a second spend against a counter the user cannot see, which is exactly what
the brief refuses.

**A recovered trip never offers a retry.** The row exists and was paid for; a Try again next
to it is an invitation to buy the same trip twice.

### 5.3 The recovery, and the race the app has

On timeout, transport error, or any 5xx: re-query `itineraries` for a row newer than the
`max(created_at)` snapshot taken **before** the request. If one exists, the generation
succeeded and the copy above says so.

**The app fires that re-query once, immediately.** At the 90 s abort that is precisely the
moment the persist may still be in flight — the client aborts, the server finishes and
writes a second later, and the single-shot query returns nothing, so the user is told no
trip was created when one is about to exist. That is a false statement produced by timing.

**Phase 6 polls instead:** after an abort, re-query at 0 s, 3 s, 8 s and 15 s before
concluding. Four cheap indexed reads, and they close the window. The same polling is not
needed after a 5xx — the server has already answered, so nothing is in flight — but it costs
nothing to use the same helper.

**And this is a live defect in the app, not merely a design phase 6 declined to copy.**
`tripPlanner.ts`'s `recoverOrFail` fires one query, immediately, at the 90 s abort — the
exact moment the persist may be in flight — and on a miss the screen says *"No new trip
appeared on your list"* and *"We looked — no trip was created, so retrying is safe"*. Both
are claims the single query is too early to support, and the second invites a second spend.
The window is narrow and opens only on the slowest generations, which are precisely the
ones that reach the abort. It is recorded in `PARKED.md` under the app's name so whoever
opens that file next knows the one-shot is a bug rather than a simplification.

The snapshot is `select id, created_at … order by created_at desc limit 1` under RLS, which
is one row of the caller's own trips.

### 5.4 The count, and where the day comes from

`trip_generations_today` and `trip_generations_reset_at` are readable off the caller's own
`users` row. The cap is `TRIP_GENERATE_DAILY_CAP`, a server env var defaulting to **3**; no
client can read it.

**The day is never computed here.** Migration 0047 moved the limiter to the Cyprus calendar
day and `trip_generations_reset_at` now holds that day. Deriving "today in Cyprus" in the
browser is the second copy of a server rule that Decision Log entry 64 lists first in its
blast radius, and Ask Pete's `fetchQuota` already refuses to do it. The app's
`quotaRemaining()` compares `reset_at` against **UTC** today and its copy still says *"More
after midnight UTC (03:00 in Cyprus)"* — stale since 0047, and a Cyprus user reads a wrong
number every night between midnight and 03:00. The web does not copy either.

So:

- **Before any generation this session**, the stored count may belong to an earlier day and
  the lazy reset has not run. The count is *uncertain*: the screen says **"Up to 3 trips a
  day"** rather than a number it cannot stand behind, and the Create button is **not
  disabled** on it — the server is the authority and a 429 costs nothing (0047 rejects
  without incrementing).
- **After any response that consumed** — 200, 422, 502, or a 500 past `:1567` — the RPC has
  just written `reset_at` to today's Cyprus day. Re-reading the row then gives a **certain**
  count, and the number appears: "{cap − today} of {cap} left today".
- **After a 429**, `remaining`, `daily_cap` and `quota_day` arrive on the wire. They are
  authoritative, they set the cap for the rest of the session, and only then is the button
  disabled.

`daily_cap` off the wire replaces the coded 3 whenever it arrives, and the 3 is corrected
upward if a row ever shows more used than it allows for — the floor guard `askPete.ts`
already carries.

---

## 6 · Navigate-away: not verified, and the copy does not claim it

**Not verified, deliberately.** The scoping report reasons that `trip-generate` is not
streaming, so there is no writer to reject and nothing for the runtime to cancel, and the
handler runs to completion and persists. That is Deno semantics plus the app's own design,
and it is tagged `[inferred]` in both the scoping report and
`pete-abort-persistence-scoping-2026-08-28.md` §4. Neither ran the test.

**It cannot be verified cheaply.** It costs one real generation — one of the dev account's
three per Cyprus day, one `itineraries` row, and about $0.003 — and there is no local
substitute: `supabase functions serve` would answer a question about a local Deno process,
not about the deployed edge runtime, which is the thing in doubt. Nothing free tells us,
and Phase 0 does not spend the owner's quota.

**So the copy does not assert it.** Everywhere the question arises, the sentence is
conditional on finishing:

> "If Pete finishes it, it will be in My Trips."

That is true under both outcomes. *"Your trip is being built and will appear in Trips"* is
the claim, and it is not made. Neither is the opposite — no screen says nothing was created,
unless the polling re-query in §5.3 has actually looked.

**How to verify it for nothing, later.** The phase needs end-to-end runs against the dev
account regardless. One of those runs can be the disconnect test: start a generation, close
the tab at ~10 s, then read `itineraries` a minute later. It answers the question at zero
marginal cost, because that generation was going to be spent anyway. **Recommended as part
of the first signed-in run, and the copy stays conditional until it comes back.** → **Q4.**

**No `beforeunload` prompt.** It would assert a loss that has not been measured, and browsers
render it as a generic scare dialog. The loading screen's own line covers it.

Within the SPA, the generation is a module-level machine with a subscribe hook — the pattern
`tripPlanner.ts` uses — so navigating to another page and back shows the run still in
progress rather than restarting or losing it.

---

## 7 · The notes fix, in phase 5's editor

**The gap is real and it is exactly as described.** `DayList.tsx` renders
`hero_image_url`, `name`, `category`, `start_time`, `travel_to_next_min`, `travel_mode` and
a Maps link. `notes` is already in the `TripElement` type in `src/lib/tripEdit.ts` and is
read from the document — it is simply never rendered. A generated stop carries the model's
one-line tip, in the profile's language; the one hand-built trip in the database carries
`""` on all three of its stops. **Notes are the only text generation adds over a manual
trip**, and today the web would show none of it.

What the fix touches:

1. **`src/routes/trip/DayList.tsx`** — one paragraph in `StopRow`, below the category
   sub-line, rendered only when `notes` is a non-empty string after trim. Manual stops carry
   `""` and render nothing, so no manual trip changes.
2. **`src/routes/trip/DayList.module.css`** — one rule. Body copy on white:
   `--cw-grey-3` on `#ffffff` measures **6.08:1**.
3. **No translation key for the note.** It is server-authored prose in the profile's
   language at generation time, the same class as `trip-edit`'s `warnings[].message`, which
   phase 5 already renders untranslated. A label above it would need a key; I am not adding
   one — the sentence reads as what it is.
4. **Pending days.** A locally-mutated day renders times and legs as pending because they
   may have moved. Notes belong to the *stop*, not to the schedule, and `trip-edit` returns
   them unchanged — so notes render through a pending day rather than blanking. Worth
   stating because every other line in that row does the opposite.

**And one line the same read makes available: the built-short notice.** `days_requested` is
in the generate response, but the editor is the durable place for it and needs no state
threaded through navigation: `daysBetween(trip_start, trip_end) + 1` against `days.length`.
It can only disagree on a trip that shipped short, because `trip-edit` re-derives `trip_end`
from the day count on every edit, and a manual trip is created with `days: []` — so the
guard is `days.length > 0 && days.length < span`. Zero of 35 stored generations shipped
short, but the path is live and the app warns on it.

**Two further gaps I am not closing**, so they are decisions rather than oversights: the
lunch element's `suggested` flag (the venue's name already renders; that it was Pete's pick
does not), and `end_time` (the row shows the start only, as the frame draws it).

**The generation language — Q3's mechanism does not exist, and the code said so.**

The plan proposed projecting the generation language out of the row:
`genlang:generation_params->user_profile_snapshot->>preferred_language`. **That column does
not carry it.** `user_profile_snapshot` (`trip-generate/index.ts:1030-1036`) holds
`pace_preference`, `interests`, `considerations`, `morning_preference` and `traveler_type`
— five fields, and no language. `generation_params.resolved` has no language field either.
So nothing on the row records which language the model wrote its notes in, and the
projection was planned against a shape the source does not have.

What ships instead: **no `lang` attribute on the notes**, inheriting the page language.
That is right for everyone who has not switched language since generating, and it is the
same guess reading `users.preferred_language` now would make — that column holds the
current value, not the one the trip was built with — only without dressing the guess as a
fact.

**`lang="en"` on the stop names stays**, and for a reason that survives the above:
`places_sync.translations` carries only `en` on all 181 published rows (`PARKED.md`), so a
place name is English whatever language it was hydrated in. That assertion is true today as
a content fact, and it is the notes — model prose, genuinely variable — that could not be
marked up.

The one-line backend fix is written up in `BACKEND-HANDOFF.md` §6: add
`preferred_language` to the snapshot object that exists for exactly this purpose. Additive,
breaks nothing, and a client that finds no language keeps inheriting.

---

## 8 · The screen at 1440

The web frame is the only web frame, and its body is the source. Structure taken from it:

- The shipped `Layout` — navy header band, sand ground, footer. Nothing new.
- A centred title block: **AI Trip Planner** (h1, navy on sand, 9.82:1) over *Your Cyprus
  Travel Companion*.
- Below it, one content column. The step heading and its sub-line sit at the column's start;
  the **step indicator** sits opposite, on the same baseline, as drawn.
- The step's field groups stack down the column, each a `fieldset` with the group name as
  its `legend` — "Pace preference", "Morning preference".
- Option tiles in a 3-up row: icon over label, equal widths.
- **Continue** at the foot of the column, with Skip beside it on the steps where skipping is
  legitimate (1 and 4) and absent on the ones where it is not (2, 3 — both fields are
  required and a skipped step could never build a request).

Two departures from the frame, both about the column:

- **The frame's Continue runs the full 1200px page width.** A 1200px-wide button is not a
  form control. It is full-width **within the column**, which is what the frame means at
  phone width and what every other primary button on this site does.
- **The frame centres a ~370px stack of tiles under a heading pinned to the page gutter**,
  which reads as two different layouts on one page. One column, one alignment.

Derived downward: at narrow widths the 3-up tile rows become a single column, the two date
inputs stack, and the step indicator moves under the heading. No new breakpoint system —
the existing `Layout` bounds and the site's established container widths.

---

## 9 · Contrast, RTL, accessibility

### Contrast — the frame introduces one failure and re-introduces another

Measured with the repo's own routine, against the tokens:

| Pair | Ratio | Verdict |
|---|---|---|
| `--cw-gold` `#c49a10` on `--cw-sand` `#f5f0e8` | **2.32** | **The frame's step indicator ring, and its "1".** Fails 1.4.11's 3:1 for a component boundary, and 4.5:1 for the numeral |
| `--cw-gold-link` `#7f640a` on sand | **4.96** | The replacement for both |
| `--cw-gold` on `#ffffff` | **2.63** | The mobile frame's selected tile — gold fill, white label. Rejected, tenth instance of the same family |
| `--cw-black-1` on `--cw-gold` | **6.46** | The Create button's label. The one in use |
| `--cw-grey-3` on white | **6.08** | Tile borders, and the notes line |
| `--cw-grey-3` on sand | **5.36** | Sub-lines on the page ground |
| `--cw-navy` on sand | **9.82** | Headings |
| `--cw-grey-2` on sand | **1.73** | Only the indicator's connector line, and only because the state is also text (`aria-current` plus a visible "Step 2 of 5"). Decorative, per the token's own note |

So: **the current step is marked with `--cw-gold-link`, not `--cw-gold`**, and the selected
tile uses the InterestsScreen treatment — gold border, gold tint, `--cw-black-1` label —
rather than the mobile frame's gold fill with a white label. Every gold declaration carries
a `contrast:` annotation and `check-contrast.mjs` re-derives it on every build.

### RTL

- The step indicator is a logical row; its connectors are `border-inline-*`, and the
  "Continue ›" chevron mirrors. `check-logical-css.mjs` already refuses physical properties.
- **The calendar is the browser's**, which is the strongest RTL argument for native date
  inputs: a hand-built month grid would need its own mirroring, its own week-start rule and
  its own keyboard model, and the app only wrote one because React Native has no date
  control.
- The progress copy ("Step 2 of 5") is text, so it translates and mirrors for free.

### Accessibility

- **Preference tiles are radio groups**, not buttons: `fieldset` + `legend`, a real
  `input[type=radio]` per tile, the tile as its label. Pace, morning, base and party are all
  single-select and all get this. Interests are 1-of-5-max multi-select and get **checkboxes**
  in a fieldset — a deliberate divergence from `InterestsScreen`'s `aria-pressed` buttons,
  because the cap needs a group-level description and a live count ("3 of 5 chosen") that a
  toggle-button list cannot carry cleanly.
- **The step indicator is an `<ol>`** with `aria-current="step"` on the current item and a
  visible "Step 2 of 5" — the numbering is not carried by five circles alone.
- **Focus moves on step change** to the step's `h2` (`tabIndex={-1}`), so a keyboard or
  screen-reader user lands on the new question rather than back at the top of the document.
- **A way back on every step**, including step 5, plus the browser Back button working via
  `?step=`.
- **The generation is announced**, `role="status"` on the loading copy and `aria-busy` on the
  region — one announcement at the start, one when the wait passes 45 s, one at the outcome.
  Not `assertive`: nothing here is an emergency.
- Every failure state has its message in the same live region rather than only in a colour.

---

## 10 · Translation

New strings, English only, appended to `docs/TRANSLATION-QUEUE.md` at build time. The
existing translated keys that get reused rather than duplicated: `onb_i_*` (all eleven
interest chips), the region names (from the catalogue), `ui_trip_signin_title` /
`ui_trip_signin_body` / `ui_pete_signin_cta` (the signed-out panel), `ui_trip_from` /
`ui_trip_to` / `ui_trip_span` / `ui_trip_span_error` (the date fields — identical wording,
identical bounds), `ui_loading`, `ui_trip_cancel`.

New keys, roughly forty: `ui_plan_title` / `ui_plan_sub`, the five step headings and
sub-lines, six pace and morning labels, four party labels and their descriptions, three
child-age labels, the interest cap line, `ui_plan_step_of`, Skip/Continue/Back, the review
summary labels, `ui_plan_create`, the two waiting lines, the eight failure titles and
bodies, the quota lines in both certain and uncertain forms, and the eight strings of the
Premium page in §4.

Two placeholders carry numbers that must come from data and never be hardcoded in the
sentence: `{n} of {cap}` and `{quota_day}`.

**Copy owed in English before any of it is translated:** whether the Premium page names a
price (Q2). Translating that sentence five times before it is decided produces five wrong
sentences.

---

## 11 · What I am inventing, and why

Everything here is absent from every frame. Listed so it can be refused.

1. **Step 5, the review-and-spend screen.** The frames draw four collection steps and then a
   loading screen; the money appears from nowhere. The app invented the same screen for the
   same reason and its comment says so. Without it, the only place to put the spend is
   Continue on step 4, which makes a paid action indistinguishable from a navigation.
2. **The quota line, in two forms.** No frame shows a count. One of three is a fact the user
   is entitled to before spending, and the uncertain form exists because the day is a server
   fact and this client will not derive it.
3. **Every failure screen.** The frames draw only the in-flight state. Eight outcomes, each
   with its own copy, each saying whether the attempt counted.
4. **The polling recovery** (§5.3) and the 120 s bound. The frames have no notion of either;
   the app has a single-shot version of the first and a shorter second.
5. **The Premium page's copy** (§4). Nothing of the paywall frame survives except its
   subject — three of its claims are false and the fourth is a price for something not for
   sale.
6. **The child-age group** on step 4. In the contract, in the app, in no frame.
7. **The interest cap line** and the disabled state at five. `MAX_INTERESTS` is a contract
   bound; no frame draws a disabled chip.
8. **The notes line** in the editor (§7). The result frame `3603-17182` does not draw one —
   this is inferred from the payload, not from the design, and it is the whole reason a
   generated trip looks different from a hand-built one.
9. **The built-short notice** (§7).
10. **Two date inputs instead of the frame's month grid** — a phase-5 precedent re-applied,
    not a new invention, but it is a visible departure from `3603-17674`.
11. **The route `/plan-trip`, and no new nav item.** The web frame's header carries the same
    five items as every other frame and adds nothing for the planner. The entry points are a
    card at the top of `/build-trip` — "Let Pete plan it for you" — and one on `/trips`.
    → **Q1.**

---

## 12 · What phase 6 parks, and the `PARKED.md` entries it owes

**The AI edit drawer (`3605-18809`) — parked.** No endpoint exists. `trip-edit` is
deterministic by design and its own contract says *"Not the AI edit box. The designer's
natural-language edit stays parked"*; `regenerate-day` was proposed and never built; the
Blocked Register files it. `mike` cannot stand in — its prompt refuses trip planning and
redirects to the Trips tab. A text box that goes nowhere is worse than no text box.

**The paywall (`3603-17982`) — parked**, entry drafted for `PARKED.md`:

> ### The paywall sheet — drawn, and every claim on it is false
>
> **What.** `3603-17982` (`01-premium`): a gold sheet with three benefit rows, a
> "CyprusWay Premium €4.99 / month" card over the words "One Time Payment", and a Continue
> button.
>
> **Why parked.** There is nothing to buy. `stripeEnabled` is false, `create-checkout-session`
> still returns buyers to `/premium.html` and `/premium-success.html`, both deleted in
> phase 1, and there is no premium route on this site. A Continue button here cannot lead
> anywhere. Phase 6 ships the honest explanation instead — what Premium unlocks, stated
> truthfully, and that it is not on sale here yet — with no call to action, the same call
> phase 4 made for "Unlock Unlimited".
>
> **Read this before rebuilding it. All four claims are wrong** *[measured 30 Aug 2026]*:
> "All 25 full 360° tours" — `virtual_tour` is null on 182 of 182 rows, there are none;
> "87 curated places and 37 vetted restaurants" — 181 published, 146 plannable, 37
> restaurants; "€4.99 / month" over "One Time Payment" — it is one-time; "in about ten
> seconds" — median 22 s, worst measured 57.4 s. What Premium actually unlocks is three
> things: trip generation at three per Cyprus day, `trip-pdf`, and unlimited Ask Pete.
>
> **And do not restore the gold ground.** The sheet paints body copy in grey on
> `--cw-gold`; `#ffffff` on `#c49a10` is 2.63 and `--cw-sand` on it is 2.32. Copy on gold
> is `--cw-black-1`, 6.46.
>
> **What unparks it.** The Stripe rail switched on with a landing route —
> `BACKEND-HANDOFF.md` §1 lists the three steps.
>
> **Owner.** Product, then design.

**One existing entry needs amending, not adding.** `PARKED.md`'s *"`trip-generate` has no
timeout on either OpenAI call"* records the unpark condition as *"Timeouts on both calls,
and a decision about the burn-on-failure. That is a backend conversation before it is a web
one."* **Neither has happened, and phase 6 builds the screen anyway** — on the owner's
30 Aug ruling to build and test against the real gate. The entry should say so: the backend
debt is unchanged, and what stands in for it is a client-side 120 s bound, a polling
recovery, and copy that states the spend. That is a mitigation, not a fix, and the entry is
the right place for the difference to be visible.

---

## 13 · Disagreements

**13.1 The step count does not change when the fifth control goes.** §1. The brief expects
the five-dot indicator to lose a dot. "What matters more" is a group on step 1, not a step;
the mobile progress bars number the steps 1–4 for preferences, dates, base+interests and
party, leaving the fifth for the screen the app calls `generate`. Dropping the group leaves
five steps, and the fifth is the one the money requires. Nothing in the indicator changes.

**13.2 Two of the brief's seven node IDs point at something else, and the two frames that
matter most for this phase are not in the list.** §1. `3791-27032` is the preferences step,
not the paywall; `3603-16677` has no dates on it. The dates frame (`3603-17674`) and the
paywall (`3603-17982`) were found through the app's source comments, which name the frame
each planner screen was built from — a more reliable index than the brief's list, and worth
using next time.

**13.3 The 90-second wait is not long enough, and the single-shot recovery has a race.**
§5.1, §5.3. I am taking 120 s and a polled re-query. The app's 90 s abort fires a single
recovery read at the exact moment the persist may be in flight, and reports "no trip was
created" on a miss — a false statement produced by timing rather than by evidence. This is
the one place I am deliberately not matching the app.

**13.4 The app's remaining-count arithmetic is wrong on this site and I am not porting it.**
§5.4. `quotaRemaining()` compares `trip_generations_reset_at` against **UTC** today, and the
copy says *"More after midnight UTC (03:00 in Cyprus)"*. Migration 0047 moved the limiter to
the Cyprus calendar day. Ask Pete's `fetchQuota` already refuses to derive the day and takes
it off the wire; phase 6 does the same, and shows no number until it has one it can stand
behind. This is the app's bug to fix, not a web divergence to reconcile.

**13.5 "In about ten seconds" is a fourth false claim on the paywall frame**, and "about 15
seconds" is a fifth on the app's loading screen. Both are below the measured median of 22 s.
The brief lists three false claims; there are four, and the fourth is the one a user
experiences rather than reads.

**13.6 The frame's selected-tile treatment cannot ship, and neither can its step ring.**
§9. Gold fill with a white label is 2.63; a gold ring on sand is 2.32. Both are the family
that has produced every contrast failure this project has found. Substitutions are named and
measured; nothing gold ships unannotated.

**13.7 The morning preference is a three-way choice now, and the app's two-card inference
should be retired.** §1. The app drew two cards for a three-value column and flagged the
inference for the designer. The replacement frames answer it: three tiles, one per value.
The web builds three; the app is now the odd one out, and its `profile.tsx` comment should
be closed rather than left as an open question.

---

## 14 · Questions

**Q1 — where does the planner live, and is a nav item wanted?** §11.11. I have planned
`/plan-trip`, prerendered like `/build-trip`, reachable from a card at the top of
`/build-trip` and one on `/trips`, with **no new item in the header or drawer** — the web
frame's header adds none. The alternative is a sixth primary nav item, which changes a
component every frame agrees on. **My recommendation: no nav item this phase.**

**Q2 — does the Premium page name a price?** §4. €4.99 one-time is the App Store product's
price; the Stripe price is a secret and has never charged live money, and nothing on this
site can sell it. **My recommendation: no price** — a price the visitor cannot be charged is
the same class of error as the frame's other three claims. Say what it unlocks and that it
is not on sale here yet.

**Q3 — project the generation language? ANSWERED YES, AND THEN WITHDRAWN BY THE SOURCE.**
§7. The projection was approved and then found to be impossible: `generation_params` does
not record the generation language anywhere, so there is no scalar to project. The notes
ship with no `lang` attribute and inherit the page language; `lang="en"` on the stop names
stays, because place names are English on all 181 rows regardless. The one-line backend fix
that would make the projection possible is `BACKEND-HANDOFF.md` §6.

**Q4 — spend one of the first end-to-end runs on the disconnect test?** §6. The phase needs
signed-in runs against the dev account regardless; closing the tab on one of them answers the
navigate-away question at zero marginal cost. **My recommendation: yes, on the first run.**
Until it comes back the copy stays conditional, which is safe either way.

**Q5 — should step 1 write the profile on Continue, or defer it to Create my trip?** §3.1.
The app writes on Continue, so an abandoned wizard has still changed the account's stored
pace and morning — in the app too, same row. Deferring means an abandoned wizard writes
nothing, at the cost of a failed write arriving at the same moment as the spend. **My
recommendation: write on Continue**, matching the app, because two clients disagreeing about
where a profile column is written is worse than the side effect. Worth knowing that the dev
account is the tester, and that every measurement report to date has checked its stored
`moderate` / `late_riser` before spending a generation — the first web run will change them.

**Q6 — does the review step show the interests and party as chosen, or as the request will
send them?** §3.5. They are the same today. They stop being the same if `petes_picks` is ever
offered, or if a party type is left unset and the server falls back to a stored
`traveler_type` the review screen never showed. **My recommendation: show what will be sent,
and say "Pete will use your usual travel style" when the party step was skipped** — but only
once, because on this site `traveler_type` is null on almost every account, and the true
answer there is "no preference at all".

---

## 15 · Found while building

Three things the plan did not anticipate. All three are in the tree.

**15.1 Every stored time was displayed shifted by the reader's timezone.** Not a phase-6
bug — a phase-5 one, on every trip on the site since the editor shipped. `formatTime` built
a `Date` with `Date.UTC(…)` and formatted it without `timeZone: 'UTC'`, so
`Intl.DateTimeFormat` rendered that instant in the reader's own zone: a stop stored at
`09:00` displayed as **11:00 AM** in Cyprus and 5:00 AM in New York in summer. Measured in the browser
against a real document, Europe/Bucharest, 30 Aug. `formatDayHeading` and `formatDate` had
the same omission, which puts a trip day one date early for any reader west of Greenwich.

The function's own comment said the opposite — *"it is displayed, never converted"* — which
is presumably how four phases of eyes passed over it. Prose is not a test.

It surfaced now because phase 6 makes it matter: a generated day starts at the profile's
morning threshold (08:00, 09:00 or 10:00), so a Cyprus traveller was being shown a plan
beginning two or three hours after the one the server built, lunch and every leg shifted
with it. A hand-built trip is equally wrong and nobody has an expectation to check it
against. Fixed — one option on each of the three formatters. `PARKED.md` carries the entry
so the app's own renderers get checked for the same shape.

**15.2 The Pete illustration spells the brand "CUPRUSWAY".** The frame's loading art
(`3777:33828`) is the same file already in the repo at `public/images/pete.webp` — so the
loading screen needed no new asset, which is the good half. The bad half is that the hat
reads **CUPRUSWAY**, and it is baked into the artwork. It already ships at readable size on
the homepage's Book with Pete card; phase 6 adds a third surface at 220px. Nothing was
cropped, shrunk or dropped to hide it — that would leave it on the homepage and disguise a
brand-name typo as a layout choice. Recorded in `PARKED.md` under Content gaps; one
replaced file fixes every surface at once, and the app needs the same replacement.

**15.3 The built-short notice wanted the advisory treatment, not the alert one.** First
built with `.notice`, phase 5's alert-red style for a change that did not save. A short trip
is not a failure: `trip-generate` ships one rather than refusing, so the trip is real,
usable and editable and merely covers fewer days than its dates do. It now uses the same
calm navy tint as the R2/R3/R5/R7/R9 warnings below it, which is the family it belongs to.

### What was verified in the browser, and what was not

Run against the live deployment on 30 Aug, signed in as a **free** account —
`d1764585-…`, not the premium dev account:

- **The wizard, all five steps.** Prefill from the profile row; the profile write on
  Continue; `min` on the From field = tomorrow on both clocks; `max` on To = start + 30, so
  a 31-day span is the ceiling the control enforces; the live day count; six base chips from
  the catalogue; eleven interest chips; the cap at five with the other six disabled and the
  count stated; the child-age group appearing only for Family; the review summary.
- **The 403, end to end.** Create my trip → the loading screen → `[planner] HTTP 403:
  premium_required` in the console → the Premium page. Nothing consumed, as designed.
- **The editor changes**, against a trip created and then deleted for the purpose: the note
  renders, an empty note renders nothing, the built-short notice fires, and the times are
  right after 15.1.

**Not verified, and it needs the premium account:** a successful generation, the 200's
`itinerary_id` hand-off to `/trip/:id`, the 422 / 502 / timeout endings and the recovery
re-query. Those are the first signed-in run — with the profile-write flag in §3.1 to
settle first, and Q4's disconnect test to fold into it.

---

## 16 · Audit, 30 August — what the hunt found

Run against the built phase, looking for the failure shapes this project actually
produces: comments that assert what the code does not do, client-side overwrites of server
truth, stale closures, collapsed errors, paths that had never run, and numbers copied from
the server rather than read. **Twelve findings; all fixed except the two that belong to the
shell, which are recorded.** The polling and the date maths were where the brief said to
look, and they held the two worst.

### The polling — four defects in fifteen lines

**16.1 A failed snapshot was read as "no trips".** `latestItinerary()` returned `null` for
both "the account has no trips" and "the read failed", and the recovery compared with
`!before || newer`. A snapshot that failed on an account with existing trips would have
"recovered" its most recent *old* trip and announced *"Your trip was created"*. The app's
`latestItinerary` has the identical collapse. Now a discriminated `Snapshot`, and a failed
one disables recovery-by-comparison rather than matching everything.

**16.2 A thrown `fetch` was reported as "no trip was created, so trying again is safe"
after one immediate read.** That is the app's single-shot defect, reproduced in my own
transport branch: a socket can drop with the model mid-sentence, the server finishes twenty
seconds later, and the copy has already invited a second spend. Transport errors now take
the same polled schedule as the abort.

**16.3 Whether the attempt counted was asserted from the status code.** 500 `profile fetch
failed` lands before the counter; 500 `persist failed` lands after it and may leave a row;
502 is always after. The code called all of them counted. **It is now measured:**
`consume_trip_generation` writes both counter columns on every allow, so the row is read
before the request and again after the ending, and `consumed` is *moved or not moved* —
with `null` when a read failed, and copy for all three. The `COUNTED` set is gone.
Consequences the copy now gets right: a 5xx before the counter says *"did not count"*; an
abort whose counter never moved is *"offline — nothing was spent"* rather than *"slow"*; a
counted 5xx with no usable snapshot takes the conditional copy instead of asserting *"no new
trip appeared"*.

**16.4 The wizard's profile was never refreshed after an attempt.** Back from a counted 422
recomputed the count from the row read at *entry* — "3 of 3 left" after a spend, the exact
number the whole design exists to get right. Every ending now carries the fresh row and
the wizard adopts it.

**16.5 `currentAccessToken()` had no timeout** — phase 5's hang, again: a stuck
`getSession()` left Pete on screen forever with the 120 s timer never armed, because the
timer was set *after* the token. Same 8 s bound as the editor; nothing sent, so the ending
is honest about that.

### The date maths — two

**16.6 The start date was never checked against `minTripStart()`.** The `min` attribute
constrains the picker, not the keyboard. A typed past date is *accepted* by the server and
plans a trip in the past; a typed "today" is a 400 the wizard then logged as its own defect
— which it was. Checked on the way in with a message, and re-derived at the moment of the
spend rather than taken from the render that painted the button, so a tab left open across
midnight cannot send yesterday's "tomorrow".

**16.7 The three formatters were verified, not just fixed.** Run under `TZ=America/New_York`,
`Asia/Nicosia`, `Pacific/Kiritimati` (UTC+14) and `Pacific/Honolulu`: `09:00` → 9:00 AM,
`31 Aug` → *Mon, August 31*, span 1–31 Oct = 31, +30 days across a month end, +2 days
across the March DST change — identical in all four. The app's `formatTime12` was checked
for the same shape and does not have it: string arithmetic, no `Date`.

### Comments asserting what the code did not do — four

**16.8** *"4:00 AM in New York"* (formatTime, PARKED, §15) — 5:00 in summer. **16.9** *"Four
reads over fifteen seconds close that window"* — they narrow it; nothing bounds the server.
**16.10** `routes.ts`: *"what a signed-out visitor actually sees is the Premium
explanation"* — the prerender contains the sign-in panel (§16.13). **16.11** `slow`'s copy
said *"that attempt counted"* while its own comment said *"probably"* — resolved by 16.3,
which replaces the guess with a measurement.

### The editor — one

**16.12 The built-short notice flashed on every Remove Day**, because `days` shrinks
optimistically while `trip_end` is still the old value until the response. And it was not
gated on `type`, so a legacy manual row with a short document would have blamed Pete for
a trip Pete never built. Guarded on `type === 'ai_generated'`, no pending day, not saving.

### The shell — two, recorded, not fixed here

**16.13 The account-gated pages prerender their sign-in panel** (`/build-trip`, `/trips`,
`/plan-trip` alike): `SessionStatus` is `idle` on the server and `idle` is also a guest's
final state, so a page cannot tell "not probed" from "no session". A signed-in visitor sees
the panel, then a skeleton, then the page. One bit on the provider fixes all three;
`PARKED.md`. **16.14 The premium-gate state on the machine was sticky** — a 403 left
`error/premium` in module state, so an account granted premium mid-session stayed gated
until reload. The wizard now adopts the refusal into its own profile state and clears the
machine.

### Numbers copied rather than read

`TRIP_GENERATION_DAILY_CAP = 3` is the one, and it is now one constant rather than two:
the Premium page's *"Three planned trips a day"* was a second copy in prose and is
`{cap}` from the same constant. It remains a claim — a free account never receives the 429
that would correct it — and the translation queue says so.

### Verified after the fixes

`quotaFromProfile` was driven through the real module (`vite.ssrLoadModule`) across the
six states the day logic has: cold open (uncertain floor), just consumed (certain, learns
the day), a stale row after that (full cap, certain), a same-day row (certain), a row
*newer* than the known day (uncertain floor, day not adopted), and same-day again. All as
designed. `typecheck`, `check:css`, `check:contrast` and the full build pass.

---

## 17 · The motion convention — built, 30 August

Asked for after the audit: the drawer popped in and out in one frame, and so did the auth
and interests cards. Three rules, applied to those three surfaces; the day accordion left
alone on purpose. The full record — why the pop, that the frames specify nothing, the rules,
the focus-trap ordering, what was and was not measured — is `PARKED.md`, under Unparked.

What changed in the tree:

- `useDialog.ts` — `useKeepMounted(open)`: a surface mounts on its first open and stays,
  toggling `data-open` and `inert`, so a transition has a node on both sides.
- `MobileMenu.tsx` / `.module.css` — the slide phase 1 specified and did not build:
  `translate` 200 ms with `@starting-style` for the enter, a discrete `display` transition
  for the exit, and the sign flipped under `[dir='rtl']` — the one direction branch.
- `Modal.tsx` / `.module.css` — scrim fade, card fade-and-settle from `scale: 0.98`.
- `AuthGate.tsx` — one Modal instead of two mounted and unmounted, holding the last card
  while the exit runs. That is data (which card), not a closing phase; nothing times it.
- `tokens.css` — `--cw-motion-surface: 200ms`. Hover states keep `--cw-transition`.
- No reduced-motion rule anywhere new: `global.css` already clamps everything, and the
  exit does not depend on a real duration elapsing.

`typecheck`, `check:css`, `check:contrast` and the full build pass. The minified stylesheet
keeps all four `@starting-style` blocks and both `allow-discrete` keywords.
