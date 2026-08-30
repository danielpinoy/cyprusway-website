# My CyprusWay on the web — build the question and the rail, not the page

**2026-08-30. Read-only.** No code, no migration, no commit, no row written. The catalogue was
read with the **anon key over PostgREST — the exact request `fetchPlaces()` makes**; `users`
and `saved_places` were counted as `audit_ro`; Directus was read with GET only; the two frames
(`9hIxD9uzRbYdm1YLPz0bAi`, `3404:12375` and `3404:12914`) were screenshotted and read; the live
site was fetched once. Every number tagged **[measured]** was taken today; **[read from source]**
names the file; **[unverified]** says why.

Companion to `cyprusway-directus/docs/reference/curated/my-cyprusway-feed-scoping-2026-08-30.md`
(the backend scope this checks), the app's `docs/build-my-cyprusway-report.md` (22 Aug, what it
shipped) and `cyprusway-directus/docs/traveller-feed-data-scoping-2026-08-22.md` (the first
measurement of the pools). Every count in all three reproduced today, to the row.

---

## Verdict

**Build a reduced version, and it is smaller than the scoping doc's reduced version. Not a page:
the question, a filter, and one rail — about a day and a half, against half a phase for the frame.**

The frame draws a second homepage. Measured against the catalogue, that is what it is: for a
**solo** or **family** traveller, every one of the first eight cards in the "Perfect for…" rail
is already inside the homepage's top 30 (Top Recommendations plus Popular's band); for a
**couple** or **friends** traveller the rail is genuinely different but is **exactly seven
photographed places deep**, after which it is text cards for tavernas and bars; and for all four,
"Top Picks for you" is the homepage's own head — six or seven of its eight cards for couple and
friends — because their rails do not consume it. **[measured, §1]** Apply this repo's own rules
to the frame — a rail whose query is empty renders nothing, no placeholder promises, no dead
controls — and the 360° hero, the authored card lines, the star ratings, the "View Tours" links,
the food section for three of four types (37 tavernas, 0 photographs, 0 scores) and "Top Picks
*for you*" all go, exactly as the app cut them. What survives is a chooser and one badge-filtered
rail. That is not a page. It is a profile column and a filter over data the homepage already
holds in memory, and the web — unlike the app — already has the two surfaces that can carry it:
a homepage that personalises (the interest re-rank) and an Explore that filters (two chip rows
over the same fetch).

So the recommendation is: **(1)** a traveller-type chip row on Explore, badge-backed, guest-usable,
URL-linkable — the four footer SEGMENTS become real links; **(2)** the chooser as a card in the
existing modal family, built from the planner's `OptionTiles` and the four party strings that are
already word-for-word the frame's, writing `users.traveler_type` for a signed-in visitor and
opening from the hero's "My CyprusWay" card and the nav item, both currently *coming soon*;
**(3)** a "Perfect for {type}" rail on the homepage for a signed-in visitor whose column is set,
six small cards, deduplicated against Top Recommendations, absent under four — which is the
labelled personalisation `PARKED.md` has been asking for, backed by the one signal that exists.
The planner already reads the column (its review step says "Your usual travel style"), so the
same answer changes generated trips too, for nothing. §5 has the build list; §4 has why the
frame-scale page is the wrong shape for this site rather than merely expensive.

Two things found on the way outrank all of it and are not alternatives to it (§6): **`cyprusway.eu`
still serves the legacy site** — six phases are not public, and the legacy nav promises "360°
Virtual Tours" to every visitor today — and the React build's own **H1, meta description and
footer tagline promise "immersive 360° tours and guided narration"** for a feature with zero
rows behind it. The first is the owner's call; the second is an afternoon.

---

## 1 · What the four rails would actually contain

Pools as the app defines them (`cyprusway-app/src/lib/travelerTypes.ts`), ordered `prominence
desc nulls last, id asc` — the order `fetchPlaces()` already returns. 📷 = has a hero;
∅ = none; † = unscored; ✗ = `plannable = false`. **[measured]**

Catalogue today: **181 published · 107 scored · 73 photographed · 72 both · 146 plannable ·
0 tours · `traveler_scores` 0 of 181 · 22 places with no badge at all.**

### Solo — `solo-friendly` · 28 places · 24 📷 · 28 scored

1 Kato Paphos Archaeological Park 95.6 📷 · 2 Church of Saint Lazarus 94.8 📷 · 3 Limassol Marina
94.2 📷 · 4 Tombs of the Kings 93.6 📷 · 5 Ayia Napa Sculpture Park 92.0 📷 · 6 Kourion 91.9 📷 ·
7 Phinikoudes Beach 86.9 📷 · 8 Limassol Medieval Castle 86.4 ∅ · 9 Limassol Old Town 85 📷 ·
10 Venetian Walls 85 📷 · 11 Lefkara 85 📷 · 12 Kolossi Castle 84.8 📷 — then Larnaka Fort, Paphos
Castle, Ayia Napa Monastery, Cyprus Museum, Amathus, Shacolas Tower, Agia Solomoni Catacomb,
THALASSA, Famagusta Gate ∅, Laiki Geitonia ∅, Paphos Old Town, Leventis Museum ∅, Agia Paraskevi,
St Paul's Pillar, Omeriye Mosque, NiMAC.

**Overlap with the homepage:** the top four are **three of the homepage's top four** (everything
but Petra tou Romiou) and all four sit in its top eight. The first eight: **5 in the homepage's
top 8, 3 in Popular's band, 0 outside its top 30.** The strongest pool in the catalogue, and the
one that adds least: a solo rail is the editorial head under a new heading.

### Couple — `romantic` · 15 places · 7 📷 · 7 scored

1 Petra tou Romiou 95.9 📷 · 2 Ayia Napa Sculpture Park 92.0 📷 · 3 Profitis Ilias Church 88.4 📷 ·
4 Edro III Shipwreck 85 📷 · 5 Lefkara 85 📷 · 6 Lofou 76 📷 · 7 Omeriye Mosque and Hammam 64.2 📷 —
then **Dionyssos Mansion, M Fusion, ROUS, Memento Mori, Pralina Experience** (tavernas, ∅†) and
**Sail at Castle, Lighthouse Beach Bar, Memories Rooftop Bar** (bars, ∅†✗).

**Overlap:** top four = 1 of the homepage's four (Petra, which is #1 for everyone), 2 of its
eight. The first eight: 2 in the top 8, 3 in Popular's band, **3 outside the top 30** — a
genuinely different rail. **Depth once filtered to photographed and scored: seven.** A six-card
web rail is full; a twelve-card app rail is seven photographs and five text cards.

### Family — `family-friendly` · 78 places · 29 📷 · 55 scored

1 Kato Paphos 95.6 📷 · 2 St Lazarus 94.8 📷 · 3 Tombs 93.6 📷 · 4 Kourion 91.9 📷 · 5 WaterWorld
90.1 📷 · 6 Fig Tree Bay 89 📷 · 7 Camel Park 88.1 📷 · 8 Konnos Bay 87.5 📷 · 9 Phinikoudes 86.9 📷 ·
10 Coral Bay 86.4 📷 · 11 Limassol Medieval Castle ∅ · 12 Omodos 85 📷 · Fasouri Watermania ∅ ·
Pafos Zoo ∅ · Kolossi · Larnaka Fort … and a 23-place unscored tail of luna parks, playgrounds,
bowling alleys and go-karts, none photographed.

**Overlap:** top four = 2 of the homepage's four, 3 of its eight. First eight: 3 in the top 8,
**5 in Popular's band, 0 outside the top 30.** 78 of 181 places carry the badge — it is most of
the scored catalogue, which is why the app had to deduplicate "Top Picks" against it.

### Friends — `lively-busy` ∪ `bars` ∪ `nightlife` · 31 places · 7 📷 · 8 scored

1 Nissi Beach 93.6 📷 · 2 Fig Tree Bay 89 📷 · 3 Phinikoudes 86.9 📷 · 4 Limassol Old Town 85 📷 ·
5 Pissouri Beach 78 📷 · 6 Kourion Beach 77.6 📷 · 7 Laiki Geitonia 76 ∅ · 8 Agros Village 76 📷 —
then six tavernas (Karatello, Armadillo, Hobos, Panos, Koralli, Moondog's — ∅†) and **seventeen
bars and clubs, every one ∅ † ✗**.

**Overlap:** top four = **0 of the homepage's four**, 1 of its eight. First eight: 1 in the top
8, 3 in the band, **4 outside the top 30.** The most different rail and the shallowest: seven
photographs, and the seven are six beaches and a village. The union with `bars` and `nightlife`
adds eleven places to `lively-busy`'s twenty and **not one of the eleven is photographed, scored
or plannable** — the union lengthens the text-card tail and changes nothing above it. The
friends *distinctive* inventory is 0 of 17 renderable on the homepage's rule.

### What the numbers say together

- **Co-occurrence:** couple ∩ family **0** (a curator has already separated them); solo ∩ family
  13; solo ∩ couple 3; solo ∩ friends 3; family ∩ friends 5; couple ∩ friends 3 — all three bars.
- **The homepage's top eight, by pool:** Petra → couple only · Kato Paphos → solo, family ·
  St Lazarus → solo, family · Marina → solo only · Tombs → solo, family · Nissi → friends only ·
  **Cape Greco → no pool** · Sculpture Park → solo, couple.
- **55 published places are in no pool; 26 of them are scored and photographed**, including Cape
  Greco (rank 7), Kykkos (10), Cape Greco Sea Caves (12), Makronissos (15), Avakas Gorge (18) —
  and **Blue Lagoon, the frame's own first solo card, which carries no badge at all.**
- **The feed as the app builds it** (rail 12 → two feature cards → Top Picks 12, deduplicated):
  "Top Picks for you" ∩ the homepage's top 8 = solo **3**, couple **6**, family **5**, friends
  **7**. For couple and friends the third section *is* the homepage's head, because their rails
  are too thin to have taken any of it.
- **The six-card homepage rail this report recommends**, after removing the four Top
  Recommendations: solo 25 candidates (21 📷), couple **6 (6 📷)**, family 53 (27 📷), friends
  **8 (7 📷)**. Full for all four today; exactly full for couple.
- **Explore, by segment and region** (catalogue rule — everything published):

  | | total | Paphos | Limassol | Larnaka | Famagusta | Troodos | Nicosia |
  |---|---:|---:|---:|---:|---:|---:|---:|
  | Solo | 28 | 7 | 6 | 4 | 3 | **0** | 8 |
  | Couple | 15 | 4 | 3 | 2 | 2 | **0** | 4 |
  | Family | 78 | 17 | 20 | 15 | 11 | 8 | 7 |
  | Friends | 31 | 4 | 10 | 7 | 6 | 1 | 3 |

  Nobody romantic or solo has been tagged in Troodos. The chip-count pattern Explore already uses
  ("Couple 0" with Troodos selected) says so before the click.

- **The text-card tail is safe now.** The 22 Aug scoping found 22 `short_description`s under 40
  characters ("St.", "2000+ sq."). Today: **0 under 40, median 166** — the 25 Aug description
  import fixed them. The fallback card the web designed in phase 3 can carry a taverna.

---

## 2 · What the app shipped on 22 August, and what its shape says

**Read from source:** `my-cyprusway.tsx` (895 lines), `traveler-type.tsx` (248),
`lib/travelerTypes.ts` (269), `TravelerTypeCard` (106), `TravelerTypeSheet` (160),
`FeatureCard` (256) — **1,934 lines**, plus ~250 in `context/auth.tsx` and two components lifted
out of `home.tsx`. Committed 24 Aug as `acec6bb` / `20f877d`.

**Cut, with the reason in the file:** star ratings (no column); the 360° hero (`virtual_tour`
null on all rows — "one promo for a nonexistent feature is a placeholder, two is a pattern");
the authored per-card line (no column; cards carry `short_description`, the section heading
carries the voice); "View Tours" links (Tours tab holds one placeholder row → every link goes to
Explore); the scroll-indicator dots.

**Kept, and changed:** the chooser — with a **Continue and a Skip the frame does not have**, and
a **pencil** on the feed that reopens it as a sheet ("the ONLY entry point 02a has, and it is what
makes the answer changeable — without it the question is asked once, at onboarding, forever");
one badge rail of 12; two "Large Cards" over `tavernas` (solo/couple/friends) or six attraction
categories (family — 36 places, 2 photographs); the gold CTA to the **free manual builder**;
"Top Picks for you" as *the catalogue by prominence, deduplicated, explicitly not personalised*;
the categories rail. Section order **normalised across all four feeds** because "the four frames
shuffle which section is a rail and which is cards for no reason the data supports". Null
`traveler_type` → **bounce to the picker**, on the argument that a default "would show someone
else's island to anyone whose profile read failed".

**The file's own summary is the finding:** *"ONE SCREEN, FOUR FEEDS. The four frames differ in
three things: the sub-greeting's second line, two section headings, and the hand-off card's
copy. Everything else … is identical across all four."* The per-type difference is **a pool and
two headings** — configuration, not a screen. The screen exists because the app had nowhere else
to put a filter: its home is prominence order with no interest re-rank, and its Explore has region
chips and a substring search but **no interest row** (`explore.tsx:70`, "the Interest filter row
is NOT built"). On the app, My CyprusWay is the *only* personalised surface. On the web it would
be the *second*, and — as the scoping doc says — less personal than the first, because the
homepage's Top Recommendations already re-ranks by interests and a badge rail would not.

**Usage:** `traveler_type` is null on **25 of 25** accounts today, the developer's included
**[measured]**. That is not evidence about demand: the app has no store listing (the App Store
product is "Prepare for Submission"), the 25 accounts are the team's and 20 are anonymous, and the
picker is reachable only from entry-choice once and from a home tile. It is evidence that the
question has never been put to anyone — the owner's own correction, and the right one. It is
also evidence that the *app's* shape did not cause anyone on the team to answer it in eight days,
which is worth one sentence when deciding how large a web version should be.

**So the app's shape argues for a web version of the feature and against a web version of the
page.** It proved the feature reduces to a filter; the web already has the surfaces a filter
belongs in.

---

## 3 · What the web already carries, and what is genuinely new

Everything below is **[read from source]** at `bf656b0`.

| the frame needs | exists on the web | where |
|---|---|---|
| every published place with `badges` | **yes** — one 13.8 KB request, already in memory on `/` and `/explore` | `lib/places.ts` (`SELECT` includes `badges`), `useHomeData` |
| a 282×300 place card (the frame's "Recommendation Card") | **yes** — `PlaceCard size="large"`, with a designed no-photo fallback carrying `short_description` | `components/home/PlaceCard.tsx` |
| a titled, keyboard-scrollable rail with chevrons | **yes** | `components/home/Rail.tsx` |
| the four chooser cards with icon, label, description | **yes** — `OptionTiles<T>` renders exactly this shape, and the planner's step 4 already passes `solo/couple/family/friends` with `PARTY_ICONS` and `ui_plan_party_*_desc` — **the frame's card copy, word for word** | `routes/plan-trip/PlannerControls.tsx:30`, `PlanSteps.tsx:271-310`, `i18n/strings/en.ts` |
| a modal card that appears after sign-in and writes the profile | **yes** — the `AuthGate` → `Modal size="interests"` → `InterestsScreen` family; a second card kind is the same pattern | `components/auth/AuthGate.tsx`, `ui/Modal.tsx` |
| a profile write with the zero-row guard | **yes** — `saveInterests` / `saveTripPreferences` (`.select('id')`, `zero_rows_updated`) | `lib/profile.ts` |
| reading `traveler_type` off the profile | **yes, already** — `fetchPlannerProfile` reads it for the review step's "Your usual travel style" | `lib/profile.ts`, `PlanSteps.tsx:369` |
| filter chips with counts, in the URL, hydration-safe | **yes** — `FilterRow` + `filterPlaces` + `interestOptions`, gated on `ready` | `routes/explore/*`, `lib/explore.ts` |
| the entry points | **drawn and pending** — hero card with a visually-hidden *coming soon*; nav item `pending: true` in header, drawer and footer | `routes/home/Hero.tsx:77-86`, `components/shell/navigation.ts` |
| the segment links in the footer | absent — the footer drops SEGMENTS as "taxonomy links into browse surfaces phase 1 does not build" | `components/shell/Footer.tsx` |
| the 384×243 "Large Card" | **no** — `TourCard` is 384×210, a non-link `<article>`; the app built `FeatureCard` from scratch | — |
| a name to greet by | `displayNameFor()` from session metadata (2 of 5 real accounts); `users.display_name` on 1 of 25 | `lib/auth.ts:112-129` |
| the 360° hero, per-type card lines, `traveler_scores`, a behavioural signal | **nothing, in any system** — scoping doc §1.3–1.6, reproduced today: 0 tours, 0 scores, `collection` 0 rows, `saved_places` 1 row from 1 user | — |

**Genuinely new, in the reduced version:** `travelerType` on `SessionProvider` beside `interests`
(~15 lines); a `saveTravelerType` (~20); a **badge-pool contract** — `contracts/travellerPools.ts`
mapping the four values to badge slugs (and, for friends, two category slugs). That file is the
same class of thing as `interestCategories.ts` — a client-side mapping with no database backstop
— but smaller: badges live on the place row and are server-defined, so the only invented part is
the friends union, and the app holds an identical copy in `travelerTypes.ts`. **Two copies must
agree; record it in `PARKED.md` beside the interest map.** Then `segmentOptions` + a third
`FilterRow` on Explore (~40 lines), `travellerRail()` in `rails.ts` (~30), the rail in
`HomeContent` (~15), a `TravellerScreen` card (~120 with CSS), a "Travelling as … ✎" line in the
hero (~25), four headings, the chooser copy, the nav and hero un-pending, entries in `PARKED.md`
and `TRANSLATION-QUEUE.md`. **Roughly 500–900 lines; a day to a day and a half.** Phases 2–5 ran
4.4k / 6.3k / 5.4k / 4.5k insertions.

**Genuinely new, at the frame's scale:** all of the above plus a route, its prerender and
`ROUTE_META` entry, a `FeatureCard`, a page composition with five sections and their skeletons,
a third copy of the error state, the greeting block, a Food & Wine section that for three types
is text cards in id order, the "Top Picks" dedupe, the bounce-or-default ruling and a sign-in
gate for the route. **1.5–2.5k lines; about half a phase** — for a page whose every section
except the first rail the homepage already renders, better.

---

## 4 · Three options, honestly

**Build it at the frame's scale — no.** Not because of cost. Because on this site it fails its
own review before it ships. The frame is six sections; this repo's standing rules — a rail whose
query is empty renders nothing (`HomeContent.tsx`), no placeholder for content that does not
exist (phase 1's hero carousel, phase 2's tours rail, phase 3's Virtual Tour panel), no dead
control, no personalised claim without a signal (`?debug=rank` exists so that claim is
inspectable) — remove the hero, the authored lines, the ratings, "for you", the tour links and,
for three types, the food section. What passes review is a chooser and a rail. The scoping doc
reached the same list and called it "buildable in a phase"; it is, but a phase spent building a
page whose surviving content is one rail is a phase spent on chrome. And the page carries a cost
the rail does not: a nav slot, a route, a sign-in gate, a third error state, and a second
personalised surface that is less personal than the homepage the visitor just left.

**Don't build it, work the backlog instead — nearly, but no.** The case is real: the couple
and friends rails are gated on seven photographs each, the friends' distinctive venues are 0 of
17 renderable, and `traveler_type` has never been answered. But the reduced version is not
competing with the backlog for the same effort — it is a day of web work, and the backlog is
content work by other hands (§6). And two of its three parts are not about the rails at all: the
question is the *only* way the column gets filled, and the column already feeds `trip-generate`
(the party phrase in the RAG sentence and one prompt line — `rag.ts:36`, `llm.ts:59`); the
Explore filter costs forty lines and is honest at any depth. "Not worth it" would be the right
answer for the page. It is the wrong answer for the question.

**Build the reduced version — yes.** What it buys, per part: the hero's "Tell us who you're
travelling with, and we'll shape Cyprus around you" card becomes true instead of *coming soon*;
the nav item stops being one of the site's apologies; the footer's SEGMENTS column gets four
real destinations; a signed-in visitor gets one labelled rail that *reads* as personal —
`PARKED.md`'s "Legible personalisation" entry, whose diagnosis was "a four-card rail cannot
express three interests" and whose stronger remedy was "labelled groupings — 'Because you like
Beaches' over its own row" — built for the one signal that exists rather than for a taxonomy
that does not; and the column that the planner already falls back to gets a way to be set. What
it does not buy: a destination named My CyprusWay. The name attaches to a state of the site —
the homepage with your rail, Explore on your segment, the planner defaulting to your party —
rather than to a page. That is a product framing the owner should accept or reject explicitly
(§5, open decisions), because the designer drew a page.

---

## 5 · The reduced version, concretely

**5.1 Explore — a "Travelling as" row.** `?with=solo|couple|family|friends`, validated like
`interest`, applied only when `ready` (the hydration rule Explore already carries). Counts per
chip respect the region and interest selected; "Couple 0" under Troodos is the existing empty
pattern. Pool = the app's, so the two clients agree. Guest-usable; nothing written. Footer
SEGMENTS → these four URLs (rename "Sole-traveler" to "Solo" — the frame's own chooser says
Solo). **Departure from the Explore frame:** a third chip row. Flag for the designer.

**5.2 The chooser — a card, not a page.** `TravellerScreen` beside `InterestsScreen`, in the same
`Modal size="interests"`: the frame's heading and sub-line, `OptionTiles` with the four party
options the planner already defines, **Skip**, Continue. Signed-in: writes
`users.traveler_type` with `.select('id')` — one row, shared with the phone, and the card says
so (the `ui_language_shared` precedent). Guest: no write; Continue goes to
`/explore?with=<type>` either way. Opened by the hero card, the nav item (header, drawer,
footer), and a pencil in the hero once a type is set. **Not** inserted as a forced second step
of onboarding — the web's onboarding is one screen by phase-1 ruling, and the app's own forced
picker has a 0-of-25 answer rate; the invitation is the hero card, which is what the frame draws
it as. The write order the app settled — type before `onboarding_completed` — does not arise,
because the web never gates onboarding on it.

**5.3 The homepage rail.** For a signed-in visitor with the column set: `travellerRail(pool,
type, exclude)` in `rails.ts`, the badge pool from the renderable (scored) pool, minus Top
Recommendations' four, **six small cards**, placed after Top Recommendations so Popular
deduplicates against both (Popular already takes an `exclude` set). Heading = the app's four,
verbatim: *Perfect for solo travelers · Perfect for couples · Perfect for family trips · Perfect
for friend trips.* **Absent under four candidates** — the existing empty-rail rule; today all
four types clear it (§1). No "View All": the same ruling as the other rails, and this one has a
destination if the owner unparks the links (`/explore?with=`). Null type → no rail, no bounce;
the hero card is the invitation. The fallback text card is allowed in this rail exactly as it is
in Popular (5 heroless of 22 there).

**5.4 The hero line.** Under the sub-copy, for a signed-in visitor: *Travelling as a couple ✎* —
rendered after the session resolves (the header's avatar rule), never in the prerender. The
name: nameless path first; `displayNameFor()` where the session carries one. The frame's chips
row (type + interests) is optional and adds nothing the line does not.

**5.5 Cut, as the app cut it, and for the same reasons.** The 360° hero; authored card lines;
ratings; "View Tours"; "Top Picks for you"; the Food & Wine section; a route; the greeting-by-name
as a requirement; the scroll dots. The gold CTA is not needed — `/build-trip` is one click away in
the nav and the frame's own sub-line names the free builder; if the owner wants it on the
homepage it is a separate card, not part of this.

**5.6 Rules to carry over from the app, unchanged.** Order `prominence desc nulls last, id asc`
(the `id` tiebreak is load-bearing for unscored tails). JSONB containment is not needed on the
web — the filter is in memory — so the app's `.contains()` string-operand trap does not apply,
but the *pool definition* must stay identical. The builder silently drops 35
`plannable = false` places, all heroless: a card on the rail or on Explore can lead to a place
the builder will not offer — the app's note, still true, still nothing the client can fix.

**5.7 Open decisions — the owner's or the designer's, not the builder's.**

1. **Is "My CyprusWay" a page?** This report says it is a state. If the owner wants a
   destination, the honest minimum is `/my-cyprusway` = the chooser frame as drawn
   (`3404:12375` is buildable to the pixel), whose Continue lands on Explore filtered — and the
   feed frame is retired. That adds a route and a prerender; it does not add the feed.
2. **May a nav item open a card rather than a route?** "Sign In" already does. If not, drop the
   nav item and keep the hero card.
3. **The friends pool** — `lively-busy` alone (20) or the union (31). The union adds only
   unrenderable rows; the app chose it so the *app's* twelve-card rail did not run short. On the
   web the rail is six and Explore shows the whole pool either way. Recommend **the union, for
   parity**, recorded as a shared contract.
4. **Explore's third chip row** is a departure from the frame.
5. **Whether to ask during onboarding.** Recommended no (§5.2); it is a one-line change if the
   owner wants the question forced.

---

## 6 · Better uses of effort, found on the way

**6.1 The React site is not deployed. `cyprusway.eu` serves the legacy site.** **[measured
today]**: the response carries `js/i18n.js`, `js/config.js` and the `nav_vt` "360° Virtual
Tours" dropdown; `wrangler.jsonc` declares no route or custom domain, and the README lists the
three Cloudflare settings that live outside the repo. Every phase-1 ruling — the deleted
`premium.html` with "All 25 Virtual Tours", `features.html#virtual-tours`, the 87-place hero
copy — is live to the public and to search engines while six phases sit in `dist/`. Whether that
is a deliberate hold until a phase boundary is the owner's decision and not this report's; it is
recorded because nothing else on this list is visible to a visitor until it changes.

**6.2 The tours claim is not only in the nav.** In the React build **[read from source, and in
`dist/index.html`]**:

| where | string | what it takes |
|---|---|---|
| **the homepage H1** and the footer tagline | `onb_signup_title` — *"Step inside Cyprus before you arrive with immersive 360° tours and guided narration"* | a new line in five languages — it is a ported key; `TRANSLATION-QUEUE.md` already owes the hero copy |
| the homepage `<meta name="description">` | `ui_meta_home_desc` — the same sentence | one English string |
| header, drawer, footer | `ui_nav_tours` "360° Tours — Coming soon" ×3 | drop the pending item, or relabel; `navigation.ts` |
| `/faq` | "all 25 immersive 360° virtual tours", "€4.99 one-time", "regenerate individual days" | `FaqContent.tsx:20,24,26` — three paragraphs; the "regenerate" claim has no endpoint either |
| `/terms` | "preview them through 360° virtual tours" | `TermsContent.tsx:17` |

The first line a visitor reads on the rebuilt homepage promises the one feature with zero rows.
`PARKED.md` already rules that a tour card "is a broken promise above the fold … the tour *is*
the product". The H1 is above the fold. This is an afternoon plus a translator, and it should
happen whether or not anything in §5 does.

**6.3 The content backlog, ranked by what it unlocks for the rails.** All content work, none of
it web work; listed so the trade is visible. **[measured]**

1. **Badge the 26 scored-and-photographed places that sit in no pool** — Cape Greco (92.4),
   Kykkos (91.0), Cape Greco Sea Caves (89.1), Makronissos (88.3), Avakas Gorge (87.0), Peyia
   Sea Caves, Platres, Hala Sultan Tekke, Caledonia Waterfall, Blue Lagoon, Stavrovouni, Agia
   Thekla, Green Bay, Cedar Valley… — sixteen of them carry **no badge of any kind**. Nothing on
   any traveller rail can show them. The 22 Aug precedent: 28 junction rows in one session, the
   re-embed measured and harmless (`retrieval-baseline-2026-08-22.md`).
2. **Extend the couple pool.** `peaceful-quiet` minus `romantic`, scored and photographed:
   Konnos Bay, Hala Sultan Tekke, Ayia Napa Monastery, Lara Beach, Stavrovouni, Fikardou,
   Artemis Trail — seven places that would double the couple rail's depth if a curator agrees
   they are romantic. A curator's call, not a rule to encode.
3. **Apply `hidden-gem`** (defined, translated, on **0** places; `off-the-beaten-path` likewise).
   The Hidden Gems interest chip filters nothing today by design (`interestCategories.ts`);
   a badge is the cheapest way to make it filter something, and the `with=` mechanism in §5.1
   would carry it for free.
4. **Score the 37 tavernas** (0 scores, 0 photographs) — the food section of every surface, and
   `PARKED.md`'s standing first item. Score before photographing: on the homepage's rule a
   photograph buys an unscored place nothing.
5. **Photograph the 17 bars and clubs** — the friends rail's only distinctive content. Also
   `plannable = false`, so the builder will still refuse them.

---

## 7 · The scoping doc's conclusions, checked

- **"The existing homepage with a traveller-type filter on top."** Confirmed, and it can be
  stated more sharply from the web side: on this repo's own rules the page *collapses into* the
  homepage — so the conclusion is not "the homepage plus a filter is what it is" but "build the
  filter". The doc's §4 "what the feed can be today" is right and is still a page; this report
  removes the page.
- **"It earns its place only for couple and friends, and only if the content backlog is
  worked."** Half right. Couple and friends are the different rails — but at six or seven
  photographed, scored places they fill a six-card web rail **today**, without waiting for
  content. What they cannot fill is a twelve-card app rail or a page. And solo and family are
  not worthless: after deduplication against Top Recommendations a solo rail is 21 photographed
  candidates deep; it is just the homepage's second tier under a heading — which for a labelled
  rail is fine.
- **The bounce-or-default question** ("the web should decide the same question explicitly
  rather than inherit it"). Decided by not having a page: null → no rail, and the invitation is
  the hero card.
- **The cut list** (hero, authored lines, ratings, "for you", tour links) — agreed, and the app's
  reasons still hold today.
- **The CTA to `/build-trip`, not `/plan-trip`** — agreed; in the reduced version it is not
  needed at all.
- **"25 users, 1 premium"** — today **2** `is_premium` rows **[measured]** (the 26 Aug sandbox
  purchase account, presumably; not verified which).
- **The 22 Aug data scoping's "22 short descriptions under 40 characters"** — no longer true:
  0 today, median 166. The fallback card is safe, which the doc did not need to know and this
  recommendation does.
- **`traveler_type` null on 25 of 25 as "nobody has used it"** — the owner already corrected the
  reading; §2 adds the two reasons it cannot be read as demand either way.

---

## What I could not determine

- **Whether couple, family and friends web frames exist.** The file's page listing returned
  only the cover to this session's token; the two node ids came from the brief and both render.
  Everything above assumes the feed frame is the solo variant of four, as it is in the app.
  **[unverified]**
- **Whether the owner intends `cyprusway.eu` to stay on the legacy site until a phase boundary.**
- **Adoption.** No real users exist on either client; nothing about demand can be measured
  until the store listing or the deploy happens.

## Side effects

None. Reads only: `places_sync` over PostgREST with the anon key (the site's own request);
`SELECT` counts as `audit_ro`; Directus `GET /items/badge`, `/items/place_badges` and three
aggregate counts with the admin token; two Figma screenshots; one `GET https://cyprusway.eu/`.
Written: this file, and scratch scripts and PNGs in the session's scratch directory.
