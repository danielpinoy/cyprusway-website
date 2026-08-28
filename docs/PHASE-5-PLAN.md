# Phase 5 — Build My Trip

Branch `web-phase-5`, from `web-phase-4`.

Frames: setup `3427-15775`, list `3427-16138`, map `3464-18946`, add-to-trip `3429-16644`.

The brief warned that it rests on one scoping report and that the code wins. I read the
code. **The report holds on every load-bearing claim**, and I verified the contract against
the deployed function rather than against its document. Three places where the brief and
the code differ are in §12.

---

## 0 · What I verified against the deployment

`trip-edit` validates the request shape **before** it authenticates, which means the whole
request contract can be probed with no user session. Run 28 Aug 2026 with the project anon
key as the bearer:

| Sent | Got |
|---|---|
| `OPTIONS` preflight | **204**, CORS open |
| POST, no `Authorization` | **401** `{"code":"UNAUTHORIZED_NO_AUTH_HEADER"}` — the gateway, so `verify_jwt = true` |
| well-formed body, anon key | **401** `{"error":"unauthorized"}` — our envelope, after validation |
| `"colour": "blue"` | **400** `unknown request keys: colour` |
| `"trip_end": "2026-09-01"` | **400** `unknown request keys: trip_end` |
| a stop with `"start_time"` | **400** `unknown keys in days[0].pois[0]: start_time (stops are sent by place_id only; times, legs and lunch are server-derived)` |
| 32 days | **400** `maximum trip length is 31 days` |

Every claim in `docs/trip-edit-contract.md` that I could reach without a JWT is confirmed by
the deployment. The fourth row is the time-picker answer in the server's own words (§2).

Catalogue counts, measured live: **181 published, 146 `plannable`, and all 146 carry
coordinates.** So the 35 unplannable rows are exactly the population the picker must not
offer, and `place_not_plannable` can be made unreachable by filtering rather than handled.

---

## 1 · `trip-edit` — the contract I am coding against

`POST {SUPABASE_URL}/functions/v1/trip-edit`, `Authorization: Bearer <jwt>` + `apikey`.
**Free and unlimited**: no embedding, no LLM, and it never calls `consume_trip_generation`.
Nothing in this client should confirm, warn or ration before sending.

### There is one operation, not six

Reorder, move between days, add a stop, remove a stop, add a day, remove a day, rename and
move dates are **the same call**. The client sends the whole trip; the difference is the
content.

```jsonc
{
  "itinerary_id": "uuid",
  "expected_updated_at": "2026-08-17T10:00:00.123456+00:00",  // echoed BYTE-FOR-BYTE
  "days": [
    { "source_day_number": 1,    "pois": [{ "place_id": 5 }, { "place_id": 7 }] },
    { "source_day_number": null, "pois": [] },                 // a day the user added
    { "source_day_number": 2,    "pois": [{ "place_id": 189 }] }
  ],
  "trip_start": "2026-08-20",   // optional, moves the whole trip
  "name": "Paphos, revised"     // optional, 1–120 chars
}
```

- `days` is the **whole trip in order**; position becomes the new `day_number`. 1–31 entries,
  ≤ 20 stops per day, no duplicate `place_id` within a day.
- `source_day_number` is the `day_number` the day had in the document the client loaded, or
  null for a new day. It is what lets a mid-trip insert leave later days' stops "kept" and
  carries each day's pace and suggested restaurant across renumbering.
- **`trip_end` is never sent** — the server derives it, and sending it is a 400 (verified).
- Not accepted anywhere: times, legs, lunch elements, notes.

### Response 200

`{ itinerary_id, name, trip_start, trip_end, base_location, type, days: ScheduledDay[],
warnings: [{day_number, rule, message}], updated_at }`

**Replace state with `days` wholesale** — no merging, no keeping local times — and store
`updated_at` for the next edit. `warnings[]` is advisory (R2/R3/R5/R7/R9): show, never block.

### The stored element shapes

```ts
PoiElement   { type:"poi", place_id, slug, name, category, hero_image_url, lat, lng,
               visit_duration_minutes, start_time, end_time,
               travel_to_next_min: number|null, travel_mode: "car"|"walking"|null,
               notes, is_premium }
LunchElement { type:"lunch", place_id: number|null, slug?, name?, start_time, end_time,
               travel_to_next_min, travel_mode, suggested? }
ScheduledDay { day_number, date, pace, pois: (PoiElement|LunchElement)[] }
```

The client reads these tolerantly — a stored element with a surprising shape must render
degraded, never crash — and carries **no scheduling constants**: no pace caps, no morning
thresholds, no lunch rules. The server owns all of it.

### Errors

| Status | `error` | Handling |
|---|---|---|
| 405 | `method_not_allowed` | cannot happen; generic failure |
| 401 | `unauthorized` | session expired → re-auth |
| 400 | `invalid_request` | **a client bug by construction** — every checkable rule is pre-checked |
| 400 | `place_not_found` (+ `place_ids`) | unreachable: the picker only offers published rows |
| 400 | `place_not_plannable` (+ `place_ids`) | unreachable: the picker filters `plannable = true` |
| 404 | `not_found` | the trip is gone (or was never the caller's) → back to the hub |
| 409 | `conflict` (+ `current_updated_at`) | §5 |
| 500 | `upstream` | revert and say so |

Also from the gateway, not us: `{"code":"UNAUTHORIZED_NO_AUTH_HEADER"}` etc. The client reads
both envelopes then falls back to the status, exactly as phase 4's Ask Pete client does.

---

## 2 · The time picker — resolved by the server, and by the app before me

The add-to-trip frame draws a per-day time chip ("9:00 AM"). **The app did not build it**, and
its reason is recorded at the site:

> *"04-select-day's per-day '9:00 AM' time input is NOT built: trip-edit accepts POIs by id
> only — times are server-derived by the packing rule, and there is no field to send a time
> in. Frame-vs-contract conflict, resolved in the contract's favour."*

The deployed function says the same thing in its own 400: *"stops are sent by place_id only;
times, legs and lunch are server-derived"*.

**What I am matching:** the day accordion stays, the time chip is **not rendered at all** —
not disabled, not a stub. A control that cannot be honoured is worse than its absence, and
this is the third time this project has reached that conclusion (phase 4's `+`, phase 2's
"View All"). Where the stop lands in the day is the **packing rule**: appended stops start at
`prev.end + leg`, and everything already in the day keeps its stored time unless it now
overlaps. That is worth one line of interface copy under the day selector so the absence
reads as a design rather than an omission.

---

## 3 · The create INSERT, field by field

Client-side, as the app does it — this is the one direct write left, and it writes
`itinerary_data: {"days": []}`, never a populated document.

```ts
supabase.from('itineraries').insert({
  user_id:        session.user.id,
  name:           trimmedName,
  status:         'active',
  trip_start:     startIso,          // YYYY-MM-DD
  trip_end:       endIso,            // = start + N − 1, written once here
  base_location:  regionSlug,
  itinerary_data: { days: [] },
}).select('id').single()
```

Six scalars and the empty document — identical to `createManualTrip` in the app, including:

- **`type` is deliberately absent.** The column default is `'manual'`, and if the scoped
  column-grant migration ever lands, naming the column would fail the whole insert with
  42501. I will carry the app's comment across rather than re-derive it.
- `trip_end` is written **here and only here**; every later change goes through `trip-edit`,
  which derives it. That is what stops the column and the days array disagreeing.
- `.select('id')` so a zero-row insert is an error rather than a silent success — the same
  rule `saveInterests` follows.

### The `base_location` guard the brief asked for

`itineraries.base_location` is plain `text` with **no CHECK** (migration 0013 line 130);
`trip-generate` validates it against six slugs and a manual trip never touches
`trip-generate`. So the web validates client-side against exactly:

```
paphos · limassol · larnaka · famagusta · troodos · nicosia
```

**And the frame's chips are not that set.** It draws *Paphos, Ayia Napa, Larnaka, Limassol,
Paralimni, Other* — which is wrong three ways: "Ayia Napa" and "Paralimni" are both towns
inside the one `famagusta` destination ("Ayia Napa & Protaras"); **"Other" is not a slug at
all** and, with no CHECK, would be stored and only break later; and Troodos and Nicosia, two
of the six real regions, have no chip. So the chips come from the catalogue's own six
destinations with their translated names — phase 3's `regionOptions` already produces
exactly this — intersected with the fixed six as the guard.

Text-only chips. The frame gives each a 24px photo disc; `destination.hero_image` is null on
all six, which is the same standing departure phase 3 made for Explore's region chips.

**Single-select**, despite the plural label: `base_location` is one text column.

### Dates

`trip_start` must be **strictly after today on both the local and the UTC clock** — the app's
`minTripStart()`, because the server's same-day check is UTC and a Cyprus evening runs a day
ahead of it. Span capped at 31 days, `trip-edit`'s structural bound.

The frame prints "09-10-2026", which is ambiguous between DD-MM and MM-DD. The app prints
"10 Sep 2026" instead and so will the web.

---

## 4 · The travel line — what actually renders

`travel_to_next_min` (integer minutes) and `travel_mode` (`"car" | "walking"`, or null).
That is the whole of it. Confirmed in `trip-generate/types.ts`:

```ts
export type TravelMode = "car" | "walking";
```

So, against the frame:

| The frame draws | Why not |
|---|---|
| **"Take a bus"** | there is no bus in the enum, and nothing plans transit |
| **"3km away from last location"** | no distance is stored anywhere. Deriving km from the stored lat/lng would ship straight-line distance as road distance — the app measured that ratio at a median **1.46** and called it "a measured lie" |
| **"Get Directions"** | §12.1 — the app has this, and it is not what the brief thinks it is |

What renders: a car or footprints glyph, and `Drive for N minutes` / `Walk for N minutes`.
Nothing else on the line.

**Pending is a first-class state, not a nicety.** From local mutation until the canonical
response lands, a touched day's travel rows and times render as pending — never their old
numbers. A leg whose neighbours just changed must not display its previous value as though
still true, and the client cannot compute a replacement. Lunch rows hide while pending too:
their position is server-derived and may have moved.

**Not built, and it is a real subtraction — see §12.2:** the app renders a second line on
legs where the stored drive does not fit the gap the schedule leaves for it.

---

## 5 · Concurrency

`expected_updated_at` is the `updated_at` last read for the row, echoed **byte-for-byte** —
read as a string, never parsed and re-serialised. The server compares at millisecond
resolution on load and conditions the UPDATE on the row's own value, so a write racing
between load and save also fails loudly.

On **409**: the response carries `current_updated_at`. The client **reloads the trip and
says so**. It does not retry — a silent retry would do exactly what the guard exists to
prevent, and the user's change is discarded either way; the difference is whether they know.

Copy, matching the app's: **"This trip changed somewhere else — showing the latest version."**
It is accurate without asserting a device — the other writer is usually their phone but could
be a second tab.

The in-flight local edit is lost. That is honest and it is the app's behaviour; re-applying
the user's intent on top of the reloaded document is the contract's suggested path and is
deferred, because "re-apply a reorder onto a document that changed underneath" has no safe
general answer and guessing wrong is worse than the reload.

### The save loop

Single-flight with coalescing: a mutation during a save sets a flag, and the loop re-sends
the newer state rather than queueing a second request. The web sends the whole document every
time, so a **single generation counter** does the job the app needs per-day `rev`s for: if the
counter moved while the request was in flight, re-send instead of applying the stale
canonical response.

---

## 6 · The screen

**Routes.** `/build-trip` for setup — matching the `build-trip` nav id already in the table,
the same way `ask-pete` became `/ask-pete`. `/trip/:id` for the editor.

**`/trip/:id` is private data and must not be prerendered or indexed.** It gets the same
Worker SPA fallback `/place/*` has, and the page sets `noindex` unconditionally — not only
on the not-found branch. `/build-trip` is prerendered like `/ask-pete`: account-gated, so
what a crawler gets is the signed-out state, and the first render must read no session
(phase 3's hydration hazard).

**Entry points.** `build-trip` in the header, overlay menu and footer becomes a real link —
three more "Coming soon" labels gone. The homepage's Continue card becomes a link to
`/trip/:id`, removing a fourth.

**`my-trips` stays pending.** Phase 5 builds no hub, so a trip is reachable from the Continue
card (which shows the running trip plus one other by `updated_at`) and from the setup flow.
That is thin — see Q4.

### List view

Trip name as `<h1>` with a rename control (the map frame draws a pencil; the list frame does
not — I take the pencil, since `name` is in the contract and a trip you cannot rename is
worse than an inconsistent frame). List/Map pill. Then per day:

- `Wed, June 3` · `Day 1` · a **Today**/**Tomorrow** tag · delete-day · collapse chevron
- stop rows: photo disc, name, **category** beneath it, time at the inline end, remove
- travel rows between stops
- reorder by up/down chevrons plus a move-to-day action, **not drag** — the frames draw a
  handle but define no drag semantics, and a hand-rolled drag inside a scroller is its own
  pass. The optimistic machinery is drag-ready.

The frame's sub-line under a stop is a **region**; stored elements carry no region, so the
`category` slug stands in, de-hyphenated. It is an English slug in a translated interface —
the same class as place names being English on all 181 rows, and consistent with it.

**Today / Tomorrow** is the device clock: `daysBetween(localToday(), date)` → 0 is Today, 1 is
Tomorrow, anything else no tag. The frames also draw "After Tomorrow", against dates that
contradict it — placeholder sloppiness, not a spec, and the app rejected it for that reason.
`localTodayIso()` already exists in `trips.ts` from phase 2 and is the same decision.

### Add to trip

A drawer over a scrim. Day accordion (no time chip, §2), interest filter chips, place grid,
Add to Trip. Multi-select: the frame's cards select and one button commits, which is one
`trip-edit` call for N stops rather than N calls.

The grid is phase 3's `PlaceCard` at `size="grid"` — including its no-photo fallback, which
matters here because the frame shows twelve photographed cards and **108 of 181 places have
no image**. The catalogue query is `plannable = true` and `status = published` — 146 rows,
projected the way phase 3 projects them (`name:translations->en->>name`) rather than pulling
the whole `translations` blob the app pulls.

Filter chips are the eleven interests, through `interestCategories.ts` — the existing map, not
a second one. The app filters by CMS category here; the frame draws interests, the web already
has the vocabulary, and Explore's chips already work this way.

---

## 7 · Actions

| Action | Path | Notes |
|---|---|---|
| Add Day | `trip-edit`, a `{source_day_number: null, pois: []}` appended | capped at 31 |
| Delete Day | `trip-edit`, the day omitted | drawn in the day header; **the app has not built it** |
| Add / remove stop | `trip-edit` | |
| Rename | `trip-edit`, `name` | |
| **Delete Trip** | **PostgREST `.delete().eq('id', …)`** | see below |
| Print/Download PDF | `trip-pdf` | see below |

**Delete Trip has no server path and does not need one.** `trip-edit` has no delete
operation; migration 0013 grants `DELETE` on `itineraries` to `authenticated` with an
`itineraries_delete_own` policy. Deleting a whole row is not an `itinerary_data` write, so it
does not cross the line the entry-44 rewrite draws. **The app has never built it** — no
`.delete()` on itineraries anywhere in its source — so the web would be the first. Confirmation
dialog and a live region, per the brief.

**Print/Download PDF exists.** `trip-pdf` is deployed: `POST {itinerary_id}`, no LLM or API
spend, and it returns `application/pdf` bytes with
`Content-Disposition: inline; filename="trip-XXXXXXXX.pdf"`. But it is **premium-gated** —
`users.is_premium` false returns **403 `premium_required`** — and `stripeEnabled` is false, so
no web visitor can become premium. **The app does not call it either.**

Recommendation, which is Q3: render the button **only when `users.is_premium` is true**, and
omit it otherwise — exactly what phase 4 did with "Unlock Unlimited", for the same reason. A
premium account does exist (the backend's own retrieval probe ran as one), so the button
would not be dead code. The download itself is a blob and an object URL; a POST returning
bytes cannot be a plain link.

---

## 8 · The three things that cannot be built, and the fourth

Each gets a `PARKED.md` entry.

1. **The travel line's bus, kilometres and directions.** §4. Unparks with a routing provider
   at request time and a stored distance — and `place_travel_times` has no client grant, so it
   is not a client-side fix.
2. **The time picker.** §2. Unparks if `trip-edit` ever accepts a requested start time, which
   would mean the packing rule taking a hint rather than owning the schedule.
3. **The map.** Parked since phase 3. **I am shipping the placeholder as a panel behind the
   List/Map toggle**, not removing the toggle — the brief allows either and this is the case
   for keeping it: unlike Explore, where Map was a toggle on a list, here it is a designed
   screen with its own day tabs and its own stop rail. Removing the toggle would delete a
   named destination; a placeholder keeps the shape and says what is missing. The day rail
   beside it is real data and renders; only the map surface is a placeholder.
4. **The search box in the add-to-trip panel.** See §12.3 — the brief and the app disagree and
   I think the app is right.

---

## 9 · Contrast, RTL, accessibility, translation

**Contrast.** The frames put white text on `--cw-gold` in three places — "Create a Trip",
"Add to Trip" ×2 — which is 2.63 and is the family that has produced every failure this
project has found. They take `--cw-black-1` (6.46), phase 1's ruling for any label on gold.
Also to measure: the gold "Today" tag, the alert-coloured "Delete Trip", the gold numbered
pins, the day-header chevron discs. `scripts/check-contrast.mjs` now covers `outline` and
`border-color` as well as text roles and fails closed, so anything gold is measured or the
build stops.

**RTL.** A day list with times at the inline end, collapse chevrons, and a stop rail beside a
map is strongly directional. Everything logical; the times sit at the inline end; the collapse
chevron rotates rather than flips. Built for a page **loaded** in RTL — the runtime
`dir`-switch defect is parked with a repro and is not phase 5's to fix.

**Accessibility.** Day collapse is a real disclosure: a `<button aria-expanded aria-controls>`
against a labelled region. The place grid is a keyboard-navigable list of real controls with
selection state in `aria-pressed`. Delete Trip and remove-stop confirm before acting, and the
outcome goes to a polite live region. Warnings from `warnings[]` are announced once, not per
render.

**Translation.** New strings English-only into `docs/TRANSLATION-QUEUE.md`. Two carry-overs
worth stating there: the stop sub-line is a category **slug** and is not translated, and
`warnings[].message` is **server-authored English prose** — it is not in the dictionary and
cannot be, which is a new category for that document.

---

## 10 · `trips.ts` — replacing the entry-44 comment

The current comment says `itineraries` is read-only because entry 44 accepted client-written
`itinerary_data` and named "a second writer — a web client" as the trigger to move the rules
server-side. **The trigger was pulled before the comment was written.** `trip-generate` inserts
the row it generates; `trip-edit` has owned every subsequent mutation since 18 August, under
the caller's JWT, with optimistic concurrency and the same `scheduler.ts` validators as
generation. The only direct client write left is the empty-row create.

The replacement comment will say that, name `trip-edit` and its contract document, and record
that the one remaining direct write is six scalars and `{"days": []}` — so that the next
person to read this file is not warned off an endpoint that exists.

---

## 11 · What phase 5 does not touch

`trip-generate` is not called, directly or indirectly. It has **no timeout on either of its
OpenAI calls** — worse than `mike`, which at least aborts its embedding at 1500 ms — and it
consumes `consume_trip_generation` before the model runs, so a hang burns an allowance. Phase
5 builds no generation surface. If a future phase adds one, it inherits both, and that should
be a backend conversation before it is a web one.

---

## 12 · Disagreements

**12.1 "No directions link" is a scope choice, not a backend fact — and the app has one.**
The brief groups "Get Directions" with the bus and the kilometres as things that cannot be
built. The first two cannot. The third can: the app renders it as a **deep link into the
device's maps app** built from the stop's stored `lat`/`lng` — no routing provider, no
request, no cost. The web equivalent is one `https://www.google.com/maps/search/?api=1&query=…`
link, or a `geo:` URI. I have not built it, because the brief says not to and it is an
outbound link to a third party, which is the owner's call and not mine. **→ Q1.**

**12.2 Not rendering the travel-overrun line is a subtraction from what the app shows.**
Since 21 August the app uses the frame's second line for the one thing the payload can prove:
that a stored drive does not fit the gap the schedule leaves for it, showing when the traveller
would really arrive, alert-coloured. It measured **102 of 288 live legs**. I am following the
brief and rendering minutes and mode only, but the omission should be a decision rather than an
oversight — and there is a strong argument for the omission: a server-side reflow shipped on
24 August, and the app's own note says the check "provably returns null on every leg" of a
freshly written trip. It survives for four populations the reflow does not reach, of which the
web can see two: the 34 itineraries stored before it shipped, and legacy rows. Porting ~80 lines
of subtle arithmetic with three guards, to warn on legacy documents only, against the app's own
warning that "two implementations of a warning is two chances to warn wrongly", is not obviously
right. **Recorded in PARKED rather than built. → Q2.**

**12.3 The search box is buildable, and the app built it.** The brief parks it because "no
client-reachable search endpoint exists". That is true and it is not the constraint here: the
picker has already loaded all 146 plannable rows, and the app filters them with a plain
client-side substring match — explicitly *"NOT the semantic search blocked on home"*. Phase 1
parked the header and footer search inputs because those imply catalogue-wide search; this one
filters a list already in memory. It is about fifteen lines and it makes a 146-item grid
usable. **I would build it. → Q5.**

**12.4 Delete Day is drawn, supported, and not in the brief's action list.** The list frame
puts a trash icon in every day header, `trip-edit` expresses it by omitting the day, and it is
the natural inverse of Add Day. I have planned it in. Say if it should wait.

---

## 13 · Questions

**Q1 — Get Directions: does the "no directions link" ruling stand?** §12.1. It needs no
provider and costs nothing; it is an outbound link to Google or Apple Maps from a stop's stored
coordinates, and the app ships it. My recommendation is to build it, as a plain external link
with the usual new-tab treatment. If the objection is the third party rather than the
mechanism, it stays out and I will record why.

**Q2 — the travel-overrun warning: port it, or record the gap?** §12.2. My recommendation is
to record it now and revisit if a web user reports a trip whose times look impossible — the
population is legacy documents, and the app's own comment argues against a second
implementation. The counter-argument is that a user opening a pre-reflow trip on the web sees
a schedule the app would have warned them about.

**Q3 — Print/Download PDF: premium-only button, or omit entirely?** §7. `trip-pdf` is deployed
and free of spend but gated on `is_premium`, which no web visitor can obtain while
`stripeEnabled` is false. My recommendation is to render it only for premium accounts, which
exist, and omit it otherwise — phase 4's treatment of "Unlock Unlimited". Omitting it entirely
is also defensible and is less code.

**Q4 — is a trips hub in scope?** §6. Without one, a trip created for next month is reachable
only from the Continue card, which shows the running trip plus one other by `updated_at`. A
third trip becomes unreachable from the web. The frames do not include a hub and the brief does
not ask for one, so I have not planned it — but "create a trip you can then not find" is a real
outcome. A minimal list at `/trips` is perhaps forty lines and would unpark the `my-trips` nav
item too.

**Q5 — the add-to-trip search box: build the client-side filter?** §12.3. My recommendation is
yes.

---

## 14 · Corrected after the first signed-in run

The plan above described the design; these are three defects the first real trip found, and
what changed. Recorded here so the document does not disagree with the code.

### 14.1 A new trip could not be edited at all, and nothing was sent

**Symptom.** Every mutation on a freshly created trip failed with the generic banner and no
`trip-edit` request appeared in the network panel.

**Cause.** A trip created here starts as `{"days": []}`. `saveTrip` pre-checks the
request-shape bounds before sending, and an empty `days` array is one of them — the server
refuses it with *"days must contain at least one day"* — so it returned early. Correct as
far as it went, and a dead end: **"edit a trip with no days" is a path that had never run
anywhere**, because the app only ever edits a trip `trip-generate` populated.

**Fix.** The first time an empty trip is opened, its day skeleton is created in one
`trip-edit` call sized from `trip_start`..`trip_end`. The create still mirrors the app's
exactly — `{"days": []}`, six scalars, no `type` — and the days are made by the endpoint
that owns days. Verified against the deployment: a three-day skeleton of
`{"source_day_number": null, "pois": []}` passes shape validation and reaches the ownership
check. Without dates there is nothing to size from, so such a trip is left at zero days and
Add Day works from empty.

### 14.2 Every save sent the document as it was *before* the change

The more serious one, and it was hidden behind 14.1.

`mutate` called `setState` and then `flush` in the same tick, and `flush` read state through
a ref that was only assigned during render. So the payload was always one mutation behind —
and because the generation counter had already moved, the response was not treated as raced
and **was applied as canonical, silently discarding the user's change.** On a populated trip
the first chevron press would have appeared to work and then reverted.

`days` and `updatedAt` now live in refs that `mutate` writes synchronously before calling
`flush`; `state` is a mirror kept for rendering.

### 14.3 Six outcomes wore one message

`invalid`, `server` and `transport` all rendered "That change couldn't be saved", which is
useless: a 409 wants "look at what is on screen now", a dropped connection wants "try
again", and a client-side refusal wants "reload" and needs logging, because nothing else
would show it. Each outcome now has its own notice, and the two that never reach the
network are logged with their reason. `empty` was split out of `invalid` for the same
reason — an empty document is a state the trip can legitimately be in, while too many days
is a bug in this client.

**And `saveTrip` now takes the access token as an argument** rather than reading the
session itself. That was not cosmetic: the first harness written against it reported every
case as `auth`, because there is no session in a test process. It is now a function of its
arguments plus `fetch`, and its outcome table is covered by thirteen cases — every failure
distinct, and only well-formed requests reaching the network.

### 14.4 Not a defect: `type` is `"manual"` on the row

The create omits the column, deliberately, and `itineraries.type` is
`text NOT NULL DEFAULT 'manual'` (migration 0013, line 131). The row carries the value
because Postgres filled it, which is exactly what the omission relies on — naming the column
in the body is what would break if the scoped column-grant migration ever lands.
