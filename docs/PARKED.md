# Parked

A record of things deliberately **not built yet**, and what would change the answer.

Not a backlog. Every entry is a decision that was made on purpose, with the trigger that
unparks it, so the reasoning survives the conversation it was made in.

Each entry: **what it is · why it is parked · what unparks it · who owns it.**

Measurements tagged **[measured]** were queried against the live project
(`knvjmsnwzskbageetbam`) on the date given, not taken from a document.

Started 28 August 2026, during phase 2 planning.

---

## Blocking a phase-2 feature

### `places_sync.interest_tags` — the column does not exist

**What.** Top Recommendations is specified as "ordered by prominence, filtered to places
matching the user's interests". There is nothing on a place to match against.

**Why parked.** `GET /rest/v1/places_sync?select=id,interest_tags` returns Postgres
`42703 — column places_sync.interest_tags does not exist`. **[measured 28 Aug]** No join
table exists either: `place_interests`, `places_interests`, `interest_tags`,
`place_interest_tags`, `interests` and `place_tags` all return `PGRST205`. `traveler_scores`
exists as a column and is **null on 181 of 181** rows. This is not an RLS problem that a
grant would fix; it is a schema gap, and phase 2 is barred from migrations.

`users.interests` is a **profile attribute**; `trip-generate` takes `interest_tags` as a
**generation input**. Neither has ever been a property of a place.

**What unparks it.** `interest_tags` on `places_sync` — a migration, a Directus field, and
a `sync-place` change — **or** a decision to accept a client-side interest → CMS-category
map (phase 2 plan Q1). Note the second finding below: the column alone will not be enough.

**Owner.** Backend / Directus repo.

### The content backlog that unlocks personalisation — and it is not a schema change

**What.** Scoring and photographing six interests' worth of places. This is the work that
makes Top Recommendations personal; `interest_tags` alone would not.

**The measured size, 28 August.** Counting places that are *published AND
prominence-scored AND hero-bearing* — the three things a card in this design needs:

| Interest | renderable | of | The gap |
|---|---:|---:|---|
| `local_food` | **0** | 37 | 37 tavernas: no photos, no scores |
| `nightlife` | **0** | 17 | 7 nightlife + 10 bars: no photos, no scores |
| `hidden_gems` | **0** | 0 | no category maps to it at all |
| `adventure` | **1** | 7 | 3 adventure parks, 4 waterparks |
| `kid_friendly` | **2** | 33 | 9 indoor playgrounds, 9 amusement parks, 6 animal parks, 5 parks |
| `culture_art` | **3** | 7 | 7 museums, 3 photographed |
| `churches_monasteries` | 9 | 12 | fine |
| `wine_villages` | 9 | 9 | fine |
| `nature_trails` | 7 | 10 | fine — 15 of 20 until `viewpoints-landmarks` was removed from the mapping on 28 Aug |
| `ancient_ruins` | 16 | 21 | fine |
| `beach_coast` | 18 | 22 | fine |

**Why this is the entry that matters.** Adding an `interest_tags` column tomorrow would not
fix Top Recommendations for anyone who picks Food, Nightlife, Adventure, Family-Friendly or
Hidden Gems — there would be nothing to show them. **Six of eleven interests cannot fill a
four-card rail**, and Family-Friendly is the most common badge in the catalogue (78 places).

It is also why the ranking is a re-rank rather than a filter: a filter would have shown
those users a rail made entirely of backfill and called it personalisation.

**What unparks it.** In order of how much it buys:

1. **37 tavernas** — photographed and scored. Unblocks `local_food` and turns Food & Wine
   Picks from six wine villages into the rail its name describes.
2. **17 bars and nightlife rows** — unblocks `nightlife`.
3. **33 playground, amusement, animal and water park rows** — unblocks `kid_friendly`, the
   most-selected interest.
4. A decision about what `hidden_gems` means, which is a taxonomy question, not a
   photography one.

**Owner.** Content / Directus.

### The interest → category taxonomy has never been decided

**What.** Places carry exactly one of 18 CMS categories (**0 places with more than one, 0
with none** **[measured 28 Aug]**). Users carry eleven interest slugs. Nothing maps one to
the other, in any repo.

**Why parked.** `web-command-centre-scope.md` flagged it as "new — an interest→category
mapping or a taxonomy decision" and it has not been taken. Inventing it in the web client
would create a **fifth** copy of the interest vocabulary plus a mapping nobody else has,
which is exactly the silent drift the contracts work exists to stop.

`hidden_gems` maps to nothing at all. `local_food` maps to 37 tavernas, none of which is
renderable. And since 28 August **`viewpoints-landmarks` is reachable by no interest** — it
was dropped from `nature_trails`, where it did not belong (Limassol Marina, the Ayia Napa
Sculpture Park and the Edro III shipwreck are not Nature & Hiking) and where it was doing
damage: 4 of the 8 highest-prominence places sit in it, so claiming it made `nature_trails`
swallow the editorial head. Its 10 places are not invisible — they still surface through the
prominence backfill, Popular and Food & Wine — they simply cannot be personalised to. Where,
if anywhere, that category belongs is a taxonomy call for the server.

**What unparks it.** A ruling on phase-2 plan Q1, or the `interest_tags` column above,
which makes the mapping unnecessary.

**Owner.** Product, then backend.

### `interestCategories.ts` is a fifth copy of the vocabulary, and a new mapping

**What.** `src/contracts/interestCategories.ts` maps each interest slug to CMS category
slugs, so Top Recommendations can re-rank by what the person chose. Approved 28 August
with the condition that it be recorded here.

**Why it is a risk, not just a duplicate.** The interest vocabulary already exists in four
places — the app's `interestTags.ts`, `trip-generate`'s `VALID_INTEREST_TAGS`, migration
0019's CHECK constraint, and this repo's `interests.ts`. Those four are kept honest by the
database: a wrong slug throws 23514 on the profile write and a 400 on generation. Loud,
immediate, unmissable.

**This file has no such backstop.** It is a judgement about what each interest *means*, and
nothing validates it. Nobody else holds a copy, so nothing can disagree with it loudly — it
can only disagree silently.

**The failure to watch for: the app decides Adventure contains something different.** If it
starts treating nature trails as Adventure, or stops treating waterparks as family-friendly,
a person sees one set of places under "Adventure" in the app and a different set on the web,
with no error anywhere and nothing to alert either side. Today's file already makes exactly
that kind of call: `waterparks` is deliberately in both `adventure` and `kid_friendly`.

`hidden_gems` is left unmapped on purpose. No category means "hidden gem", and the nearest
proxy — low prominence — is the opposite of what a recommendations rail should surface.

**What unparks it.** `interest_tags` on the place row. Then this file is deleted, not
edited: if the two surfaces ever disagree, the fix is to move the mapping to the server,
never to hand-sync two client copies.

**Owner.** Web holds the file; backend holds the fix.

### Legible personalisation — labelled groupings, or more cards

**What.** Making it *visible* that Top Recommendations is personal. Today it is personal and
does not look it, and no amount of work on the ranking will change that.

**Why parked.** The mechanism is correct and measured: with three interests selected, all
four cards are interest-picked, zero backfill, one interest per card in round one. But a
**four-card rail cannot express three interests** in a way that reads as personal. Round one
spends three of the four slots, the fourth goes to whichever interest has the strongest next
candidate, and the result is "one of each, plus one" — which is indistinguishable from a good
editorial ranking unless you already know what to look for.

Two rounds of tuning went into the sort before this was clear, so it is worth stating
plainly: **the remaining problem is not the ranking.** A better sort cannot make a four-card
rail say "because you like beaches". Two things could:

1. **Labelled groupings** — "Because you like Beaches" over its own row. This is the stronger
   answer: it makes the personalisation legible rather than leaving it to be inferred from
   card order, and it scales to any number of interests.
2. **More cards for a signed-in visitor** — six or eight instead of four, so round two and
   three actually happen. Cheaper, weaker, and it changes a frame that draws four.

**Why it is not being built now.** Neither has a Figma frame, and improvising a new rail
structure into the homepage at this stage is how phase 2 stops being phase 2. It belongs to
the next look at the homepage frames.

**What unparks it.** A design decision on the homepage frames — and, before that, a check
against the content: the same six starved interests above will make any labelled grouping
empty for the people who picked them.

**Owner.** Design, then web.

---

## Content gaps

### 360° tours — `virtual_tour` null on 181/181

**What.** "See Cyprus before you go" is a designed rail of three 360° tour cards.

**Why parked.** Every published place has `virtual_tour = null`. **[measured 28 Aug]** One
placeholder tour row exists but is not published content. A card promising a tour that does
not exist is a broken promise above the fold — and materially different from a missing
photo, because the tour *is* the product.

**What unparks it. Itself.** The rail is built and queries for tours; it renders nothing
while the query is empty and appears with no code change the day a row lands.

**Owner.** Content.

### Hero images — 108 of 181 published places have none

**What.** 60% of the catalogue has no `hero_image_url`. **[measured 28 Aug]** By category:
**tavernas 0/37, bars 0/10, nightlife 0/7, amusement-parks 0/9, indoor-playgrounds 0/9,
parks-playgrounds 0/5, adventure-parks 0/3** — and `animal-parks` 1/6, `waterparks` 1/4,
`museums` 3/7.

The earlier estimate of 72 heroless rows understated it by half.

**Why parked.** Not a code problem. The homepage rails draw from *hero-bearing* places
only, which the app already documents as the right call: "a photo card without a photo has
no designed state, so the filter IS the placeholder." Food & Wine Picks is the one rail
where a fallback tile is used instead, because its places are real even without a photo.

**What unparks it.** Photography, in Directus. Tavernas first — 37 places, the entire food
half of the homepage.

**Owner.** Content.

### 74 unscored places

**What.** `prominence` is null on 74 of 181 published places. **[measured 28 Aug]** They
are unscored, not unpopular, and they can never appear in Top Recommendations or Popular at
the moment, both of which order by prominence.

**Worth knowing: 73 of those 74 also have no hero image.** **[measured 28 Aug]** Scoring
and photographing stopped at the same place, so this is one gap, not two.

**What unparks it.** Extending the prominence pass (migrations 0033–0037) to the remaining
rows.

**Owner.** Content / backend.

### Place names are English on every row

**What.** `places_sync.translations` carries **only `en`** on all 181 published rows.
**[measured 28 Aug]** Category names and destination names carry all five languages; place
names do not.

**Why parked.** A Polish visitor gets Polish chrome, Polish category tiles and Polish
region pills, with English place names. This is parity with the app, where `LANG = 'en'` is
a constant in `placeFields.ts`, and it cannot be fixed from a client.

**What unparks it.** Translating the catalogue in Directus. Note this is also on the
critical path for Hebrew, and for a sixth language generally — entry 65's "five-language
capable" is true of the chrome and false of the content.

**Owner.** Content.

### Curated collections

**What.** Directus has `collection` / `collection_places`; the design's editorial groupings
would draw from them.

**Why parked.** Not synced. `collections` and `collection_places` both return `PGRST205` —
not exposed to PostgREST at all. **[measured 28 Aug]** Nothing to read.

**What unparks it.** A sync into `places_sync`'s schema, or a flag on the place row.

**Owner.** Backend / Directus.

### A real popularity signal

**What.** "Popular at the moment" is labelled as a popularity rail. Nothing measures
popularity: no view counter, no save counter, no curated flag. `saved_places` has 0 rows
and `booking_clicks`' writer has no grant.

**Why parked — and this one is a ruling, not an absence.** Popular draws a session-stable
shuffle of prominence ranks 9–30. The owner, who lives in Cyprus, ruled that the popular
places here do not churn week to week, so a rotating slice of high-prominence places is
accurate enough to carry the label. That is a deliberate decision to ship, not a
placeholder.

**What unparks it.** A save or view counter, which would replace the shuffle with a real
ordering. Until then, do not add "trending" or "this week" language to the rail — the data
would not support it.

**Owner.** Backend, when a counter is built.

---

## Surfaces not built

### Search

**What.** Three search inputs in the design: header, overlay menu, footer.

**Why parked.** There is no client-reachable search endpoint. Migration 0028 revoked both
vector RPCs to `service_role`; the live ACL is `{postgres, service_role}`. The only thing a
client can do today is a substring `ilike` on `places_sync`, which is not search and would
be a worse promise than a disabled input.

All three inputs render **disabled** with the reason in their accessible name, as phase 1
left them.

**What unparks it.** A text-in search endpoint, or an explicit decision to ship a substring
filter with copy that says what it is.

**Owner.** Backend.

### The place detail page

**What.** Somewhere for a place card to go.

**Why parked.** No Figma frame exists; being handled separately by the owner.

**Consequence, and it is visible:** every card on the homepage is **non-interactive** in
phase 2 — rendered as `<article>`, no pointer cursor, no hover lift, not in the tab order,
and the design's ↗ open badge is not drawn. A dead click is worse than an honest static
card.

**What unparks it.** A frame and a route. It also unparks *Saved Places* below, because
saving is a place-page action.

**Owner.** The owner.

### Saved Places has no way to create a row

**What.** The rail is built and queries `saved_places` for the four most recent.

**Why parked (partly).** The table has never held a row, and **phase 2 ships no save
affordance anywhere** — saving belongs to the place page. So the rail is unreachable in
practice: it renders nothing, and nothing a visitor can do will change that.

Built anyway because it is small, correct, and lights up the day saving exists.

**What unparks it.** The place detail page.

**Owner.** Follows the place page.

### Ask Pete on web

**What.** The hero input and two menu entries point at Pete. All render disabled.

**Why parked — and this needs a ruling, not just code.** `ai_conversations` carries
`UNIQUE (user_id)`, so a web Pete and the app share **one thread and one daily cap per
uid**. That is arguably the point of a server-held thread — Pete's memory following the
person across devices — but it has never been decided, and the failure mode runs the other
way: a person who signs in on the web with Apple Hide My Email gets a **different uid** from
their app account, so they get two threads and two caps, and neither client can tell.

Building it also means re-implementing the SSE parser with its two recorded fragilities,
the three envelope shapes, `rejectedBeforeRecording`, and the cap/reset mirrors.

**What unparks it.** A ruling on the shared thread and cap, then the `mike` contract
published as something a second client can build against.

**Owner.** Product for the ruling; backend for the contract.

### Book with Pete — the card cannot produce a valid request

**What.** The homepage card is drawn as a form: "Where are you going?", six region chips,
Continue.

**Why parked.** The function contract is completely clear from source — but the card is not
a valid client of it. Four separate problems: **[measured 28 Aug]**

1. It collects **one of four** required fields. `booking_type`, the subtype and the hotel
   preference have no input anywhere in the design.
2. Its chips are not the region vocabulary. Design: *Pafos, Ayia Napa, Larnaka, Limassol,
   Paralimni, Not Sure.* Backend: *paphos, limassol, larnaka, famagusta, troodos, nicosia.*
   "Ayia Napa" and "Paralimni" are both `famagusta`; "Not Sure" is not a region; Troodos and
   Nicosia are missing.
3. It says "Choose as many as apply". The API takes exactly one region.
4. **Every call returns `unavailable / no_active_route` today** — verified against three
   different valid requests. `affiliate_routes` is empty, so a perfectly wired card would
   show "we have no option for that" to every visitor for every input.

Phase 2 builds the card with single-select chips against the six real slugs and Continue
disabled. The request builder and the three-outcome handling (`ready`, `reduced_filters`,
`unavailable` — all HTTP 200, all outcomes rather than errors) are specified in the phase-2
plan §7 and can be switched on without redesign.

**What unparks it.** Authored, territory-approved rows in `affiliate_routes`, plus a
decision on where the booking-type and subtype steps live on web.

**Owner.** Content for routes; product for the flow.

---

## Backend debts recorded here so they are not lost

### Entry 44 — a server create path for itineraries

**What.** `itinerary_data` is client-written with nothing validating it. Entry 44 accepted
that because there was one writer, and named *"a second writer — a web client"* as the
trigger to move the rules server-side.

**Why parked.** Phase 2 **reads** `itineraries` and writes nothing, so the trigger has not
fired. The client grants are still `authenticated = arwd` under four owner-only policies,
which invites a direct write from any second client.

**What unparks it.** The first web write to a trip. At that point the backend needs a
server create path (`trip-edit` requires an existing `itinerary_id`) and should revoke the
direct `itinerary_data` write so a second surface cannot drift into it.

**Owner.** Backend.

### CJ rotates its redirect hosts; only one is allowlisted

**What.** Awin is scrapped in favour of CJ. `HOST_ALLOWLIST` in `book-with-pete-route`
admits `www.anrdoezrs.net` and `www.awin1.com`.

**Why parked.** No affiliate code lives in the website repo and `affiliate_routes` is
empty, so nothing is broken today.

**Why it matters.** CJ rotates across `anrdoezrs.net`, `dpbolvw.net`, `tkqlhce.com` and
`jdoqocy.com`, and only the first is allowlisted. If CJ is now the only network, the
allowlist is one rotation away from failing every affiliate link with
`unavailable / invalid_target_url`. Recorded in `CyprusWay_Decision_Log_v3_0.md:1289` and
still open.

Separately, `BookWithPete_B1_B2_Build_Spec.md` still instructs implementers to allowlist
`www.awin1.com` under a heading marked "CRITICAL". It is stale twice over — GetYourGuide
went direct before Awin was dropped.

**What unparks it.** Adding the three missing CJ hosts, and correcting the build spec.

**Owner.** Backend. See `docs/BACKEND-HANDOFF.md` §4.

### `create-checkout-session` returns buyers to two deleted pages

**What.** `success_url` and `cancel_url` are hardcoded to `/premium-success.html` and
`/premium.html`, both removed in phase 1.

**Why parked.** `stripeEnabled` is false and there is no live caller, so nothing can hit
it. Both URLs 301 to `/` from the Worker, so it degrades to a wrong-but-not-broken landing.

**What unparks it.** Switching on the web purchase rail. Full detail in
`docs/BACKEND-HANDOFF.md` §1.

**Owner.** Backend.

---

## Copy and translation

### 62 English-only interface strings

**What.** The phase-1 shell introduced 62 `ui_*` strings that the vanilla dictionary never
had. They render English in all five languages via the fallback the switcher already used.

**Why parked.** Translations are real work and are not invented. A wrong translation is
invisible; a missing one is not.

**What unparks it.** A translator. The full list with per-string context is
`docs/TRANSLATION-QUEUE.md`; adding a key to `src/i18n/strings/<lang>.ts` is all it takes,
and it is type-checked against the English shape.

**Owner.** Unassigned.

### The signin subline

**What.** *"Sign in to pick up where you left off."*

**Why parked.** A placeholder, and flatter than the site's voice. It is already translated
into all five languages on the onboarding branch, so rewriting it costs five retranslations
— which is the reason to decide before it goes further, not after.

**What unparks it.** A line from whoever owns the voice.

**Owner.** Unassigned.

### Four other strings owed in English

The hero sub-copy (the Figma's "87 hand-picked places" is wrong — 181 are published, and
the count is currently dropped rather than shipped wrong); a support address for "Report
the problem", which today points at `partners@cyprusway.eu`, the partnerships inbox; and
whether "My CyprusWay" is a product name that stays English in every language. All in
`docs/TRANSLATION-QUEUE.md`.

---

## Defects awaiting a scheduling decision

### `useDialog` steals focus when the parent re-renders

**What.** Not a parked feature — a phase-1 bug, recorded here so it has a home if it is not
fixed in phase 2.

`src/components/ui/useDialog.ts` lists `onClose` in its effect dependencies, and both call
sites pass a fresh arrow every render. Any parent re-render therefore re-runs the whole open
sequence: focus is pulled back to the dialog's first item, and the scroll-lock class is
removed and re-added.

Reproduced in Chrome: with focus on "Give feedback" at the bottom of the drawer, changing
the language from inside the drawer moved focus back to the first navigation row.

Low severity, four-line fix — hold `onClose` in a ref and drop it from the dependency
array. Phase-2 plan Q6.

**Owner.** Web.
