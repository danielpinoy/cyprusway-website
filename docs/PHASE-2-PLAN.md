# CyprusWay Web — Phase 2 Plan: the homepage

**Approved 28 August and implemented.** §§0–11 are the plan as written before building;
**§12 is the implementation record** — every deviation, with its reason, plus what was
verified and what was not.

Branch `web-phase-2`, cut from `web-react-phase-1` at `dc97288`. Staged, not committed.

**What was read and measured before writing this.** All of phase 1's `src/`. Figma
`3370-7099` and `3390-8530` — full metadata on both, plus design context on the
recommendation card and header, and rendered screenshots of the categories grid and the
Book with Pete card. `book-with-pete-route/index.ts` (399 lines) and `_shared/regions.ts`
in `cyprusway-directus`. The app's `interestTags.ts`, `savedPlaces.ts`,
`directusImage.ts` and `home.tsx`'s trip and category logic. And **the live database** —
every number below with a **[measured]** tag was queried against
`knvjmsnwzskbageetbam` on 28 August with the anon key, not taken from a document.

---

## 0 · Read this first — the personalisation ruling cannot be built as specified

You asked me to verify, not assume, whether `interest_tags` on `places_sync` is readable
by `anon` and `authenticated`. **The answer is worse than "not readable": the column does
not exist.** **[measured]**

```
GET /rest/v1/places_sync?select=id,interest_tags&limit=1
{"code":"42703","message":"column places_sync.interest_tags does not exist"}
```

`places_sync` has 25 columns; there is no interest tag among them. Nor is there a join
table — `place_interests`, `places_interests`, `interest_tags`, `place_interest_tags`,
`interests` and `place_tags` all return `PGRST205` (not exposed). `traveler_scores` exists
as a column and is **null on 181 of 181** published rows. **[measured]**

This matches what `web-command-centre-scope.md` recorded on 27 August — *"no place carries
an interest tag (no column, no M2M)"* — and it is consistent with how interests are
actually used: `users.interests` is a **profile attribute**, and `trip-generate` takes
`interest_tags` as a **generation input**. Neither has ever been a property of a place. The
app's `interestTags.ts` says so in its own comment: the slugs are "the backend vocabulary"
for the profile CHECK and the trip-generate 400 — not for a place filter.

So per your own escalation rule — *"the fallback is a server-side change, not a client
workaround"* — **I am stopping and reporting rather than inventing a mapping.**

### But there is a second finding that should change the ruling, not just delay it

The obvious workaround is a client-side interest → CMS-category mapping. Every published
place carries exactly one category (**0 places with more than one, 0 with none**
**[measured]**), from a vocabulary of 18. I sized that mapping before recommending against
it. Here is what each interest would actually yield, where **renderable** means
*published AND prominence-scored AND has a hero image* — the three things a photo card in
this design needs: **[measured]**

| Interest | Mapped categories | Places | Renderable |
|---|---|---:|---:|
| `beach_coast` | beaches | 22 | **18** |
| `ancient_ruins` | archaeological-sites, historical-sites, castles-fortifications | 21 | **16** |
| `nature_trails` | nature-trails, viewpoints-landmarks | 20 | **15** |
| `churches_monasteries` | monasteries-churches | 12 | **9** |
| `wine_villages` | villages | 9 | **9** |
| `culture_art` | museums | 7 | **3** |
| `kid_friendly` | indoor-playgrounds, amusement-parks, animal-parks, parks-playgrounds, waterparks | 33 | **2** |
| `adventure` | adventure-parks, waterparks | 7 | **1** |
| `local_food` | tavernas | 37 | **0** |
| `nightlife` | nightlife, bars | 17 | **0** |
| `hidden_gems` | — nothing maps | 0 | **0** |

**Six of the eleven interests cannot fill a four-card rail.** Someone who picks Food,
Nightlife, Adventure, Family-Friendly or Hidden Gems — and Family-Friendly is the single
most common badge on the catalogue, 78 places — would see a rail composed entirely of
backfill. That is: identical to the signed-out rail. The personalisation would be invisible
in exactly the cases where it was asked for.

So the blocker is not only the missing column. **It is that the content behind six of the
eleven interests is neither scored nor photographed.** Adding `interest_tags` tomorrow
would not fix Top Recommendations for those users; scoring and photographing tavernas,
bars, nightlife and playgrounds would.

### What I recommend instead — and it is not "ignore the interests"

You were right to overrule the shuffle proposal: collecting preference data and then
ignoring it is worse than not collecting it. I am not proposing that again. I am proposing
a different mechanism.

**Re-rank, don't filter.**

> Take the renderable pool ordered by prominence. Stable-sort it so that places matching
> the person's interests come first, prominence breaking ties within each group. Take four.

This is strictly better than filter-plus-backfill for three reasons:

1. **The empty-rail problem disappears by construction.** There is no minimum count to
   choose, no backfill rule, no "too few matches" branch. The rail is always four cards
   because it always draws from the full pool.
2. **It degrades exactly as the content does.** A user who picks Beaches sees beaches at
   the top. A user who picks Nightlife sees the ordinary prominence order — which is the
   truth, because there is no photographed, scored nightlife to show them. It never
   pretends.
3. **It survives the content improving.** The day tavernas get photos and scores, the same
   code starts personalising for `local_food` with no change.

It still needs the interest → category mapping, and that mapping is a taxonomy decision
that belongs to you, not to me. So:

**→ Q1. Rule on one of these three.** I recommend (b).

| | What ships | Cost |
|---|---|---|
| **(a)** | Prominence only. Interests collected but unused on the homepage until the backend has real tags. | Honest, zero new vocabulary, but it is the thing you already overruled once. |
| **(b)** | **Re-rank by a client-side interest → category map**, marked `TODO(contracts):`, with the map in `src/contracts/` beside the eleven slugs. | Ships personalisation now for the five interests that have content. Adds a **fifth** copy of the interest vocabulary and, worse, a *new* mapping nobody else has. If the app later disagrees about what "Adventure" contains, the two drift silently — this is precisely the drift the contracts work exists to stop. |
| **(c)** | Wait for `interest_tags` on `places_sync`. | Correct, but it is a migration plus a Directus field plus a `sync-place` change — and phase 2 is barred from migrations. |

If you pick (b), `hidden_gems` still has no mapping and I will not invent one; a user who
picks only Hidden Gems gets the prominence order, which is option (a) for them.

**Everything else in this plan is buildable as specified and does not depend on Q1.** Top
Recommendations ships either way; only its ordering changes.

---

## 1 · One query feeds four rails

Every place-backed rail reads the same rows, so phase 2 makes **one request** and derives
the rails in memory. This is the pattern the app already uses on its home screen ("181
small rows, still one request").

```
GET /rest/v1/places_sync
  ?select=id,slug,name:translations->en->>name,hero_image_url,destination,categories,prominence
  &status=eq.published
  &order=prominence.desc.nullslast,id.asc
```

**Measured: 181 rows, 89.7 KB uncompressed, 13.8 KB gzipped, 232 ms.** **[measured]**

Two details that matter:

- **`name:translations->en->>name` projects the name server-side.** Selecting the whole
  `translations` column instead costs **71 KB gzipped** rather than 13.8 KB — it drags the
  entire EditorJS `description` blocks along. **[measured]**
- **`order=` is not optional and needs the `id` tiebreak.** Six places are tied at exactly
  `prominence = 85.0` **[measured]**. Without a deterministic second key, Postgres may
  return ties in a different order between requests, which would let Top Recommendations
  and Popular overlap despite drawing from disjoint rank bands.

`places_sync` is readable by `anon` (HTTP 200) **[measured]**; `saved_places`,
`itineraries` and `users` all return `42501` for `anon` and are read only when a session
exists.

### The renderable pool

Nearly every rail draws from **published AND scored AND hero-bearing = 72 places**
**[measured]**, for the reason the app already recorded: *"a photo card without a photo has
no designed state, so the filter IS the placeholder."* Food & Wine Picks is the one
deliberate exception — §5.

Coverage, for the record: **[measured]**

- 181 published
- **74 have no `prominence`** — and **73 of those 74 also have no hero image**. The two
  gaps are the same set of places. Scoring and photographing were done together, and both
  stopped at the same place.
- **108 have no `hero_image_url`** — 60% of the catalogue, not the 72 the brief estimated
- **`virtual_tour` is null on 181 of 181**

---

## 2 · The rails

Which render for whom, in Figma order (`3390-8530` for signed-in; `3370-7099` is the same
list minus the first row).

| Rail | Guest | Signed in | Renders today? |
|---|---|---|---|
| Continue your trip | — | ✓ | only with an active trip |
| Saved Places | — | ✓ | `saved_places` has **0 rows** live; hidden until one exists |
| Top Recommendations | ✓ | ✓ | yes — 4 cards |
| See Cyprus before you go | ✓ | ✓ | **no** — 0 tours exist |
| Popular at the moment | ✓ | ✓ | yes — 6 cards |
| Categories | ✓ | ✓ | yes — 11 tiles |
| Book with Pete | ✓ | ✓ | yes, card only — see §7 |
| Food & Wine Picks | ✓ | ✓ | yes — see §5 |

Every rail follows the same rule: **when its query is empty, the whole section renders
nothing** — no heading, no empty-state copy, no placeholder cards. A heading over nothing
is a broken promise, and phase 1 already set this precedent by hiding the hero's tour
carousel rather than filling it.

### Top Recommendations — 4 large cards (282×300)

Pool: the 72 renderable places. Order: prominence, or the interest re-rank from Q1. Take 4.
Never empty (72 ≫ 4), so there is no empty state.

Ranks 1–8 today are all hero-bearing and well spread — Petra tou Romiou, Kato Paphos
Archaeological Park, Church of Saint Lazarus, Limassol Marina, Nissi Beach, Tombs of the
Kings, Cape Greco, Ayia Napa Sculpture Park. **[measured]**

### Popular at the moment — 6 small cards (180×251)

**Band: ranks 9–30 of the renderable pool — 22 places.** Shuffle, take 6.

Why 9–30 and not something else: rank 9 is the first place Top Recommendations cannot
reach even if Q1's re-rank pushes an interest match up from rank 8; and rank 30 is where
prominence has fallen from 95.9 to 84.5, still comfortably "notable". The band's category
spread is genuinely varied — beaches 5, viewpoints 3, villages 3, castles 3, monasteries 2,
historical 2, and one each of archaeological, waterpark, animal park and nature trail
**[measured]** — so a shuffle of 6 reads as a mixed selection rather than six beaches.

**No overlap with Top Recommendations, by construction.** Disjoint rank bands over one
deterministically-ordered list, exactly as you specified — no exclusion logic, nothing to
get out of sync.

**Holding the shuffle stable.** A seed integer is generated once and kept in
`sessionStorage`; the order is derived from it with a small seeded PRNG (mulberry32,
~6 lines, no dependency). Consequences: stable across re-renders, across client-side
navigation, and across a reload within the same tab; a new tab or a new session re-rolls.
`sessionStorage` rather than `useMemo` because `useMemo` is not a cache — React may discard
it — and because a reload mid-read is exactly when cards jumping is most jarring.

Because the seed is per-session and English is what gets prerendered, **the prerendered
HTML must not contain a shuffled order**: the server has no session. The prerender renders
the band in its deterministic prominence order and the client re-orders after hydration. A
seeded shuffle rendered server-side would be a hydration mismatch on every page load.

### See Cyprus before you go — built, hidden

Query: renderable pool where `virtual_tour` is not null. **Returns 0 rows today**
**[measured]**, so the section renders nothing.

Built properly against the design's 384×210 card so that the day a tour row lands, the rail
appears with no code change. No placeholder cards — your reasoning holds exactly: a card
promising a 360° tour that does not exist is a different and worse thing than a missing
photo.

### Categories — 11 tiles

The eleven interest tags, labels from the phase-1 dictionary (`onb_i_*`, already in five
languages), slugs from `src/contracts/interests.ts`. Not redefined — reused. Note the
design says "Wine & Village"; the dictionary says "Wine & Villages" and wins, being the
translated string.

**The tiles have no photo source, and I recommend they do not get one.** See §6.

### Saved Places — signed-in, 4 circular cards

```ts
supabase.from('saved_places')
  .select('place_id, saved_at')
  .order('saved_at', { ascending: false })
  .limit(4)
```

RLS scopes it to the caller; no `user_id` filter is needed (the app's `unsavePlace` relies
on the same property). The place rows come from the one query already in memory — a saved
row whose place is unpublished or missing simply produces no card, which the app documents
as "the expected steady state, never a failure".

`saved_places` has never held a row. The rail renders nothing until it does, and there is
no "save" affordance anywhere in phase 2 to create one — saving belongs to the place page,
which is parked. **So this rail is unreachable in practice until the place page ships.**
Worth building anyway: it is small, and it is wired the moment saving exists.

### Continue your trip — signed-in, up to 2 cards

Read-only. **No writes to `itineraries`,** per entry 44.

The query and the day-of-N computation are **taken from the app** rather than re-derived,
so the two clients cannot disagree about what "Day 2 of 4" means:

```ts
supabase.from('itineraries')
  .select('id, name, base_location, status, days:itinerary_data->days')
  .lte('trip_start', today).gte('trip_end', today)
  .order('updated_at', { ascending: false })
  .limit(1)
```

- `dayCount` = `days.length`; `dayNumber` = the `day_number` of the entry whose `date` is
  today, else null — and when it is null the "Day X of Y" pill hides.
- `today` is the **device-local** date, not UTC. This is the app's deliberate choice, with
  its own comment: `itineraries` carries no timezone, so a traveller whose phone is on home
  time can be a day off at either edge. Matching it is more important than being right in
  isolation.
- Region labels come from the app's map, where `famagusta` displays as "Ayia Napa &
  Protaras" and `troodos` as "Troodos".

The design shows **two** cards: one with the "Active trip · Day 2 of 4" row, one without.
The second is a trip that is not currently running. The app only ever queries the active
one. Phase 2 renders the active trip in card 1, and card 2 only if a second, non-active
trip exists — a second query without the date range, `status` ordered by `updated_at`.
**36 itineraries exist, all `active`, and exactly 1 spans today** per the scope doc, so in
practice one card renders. **[from the scope doc, not re-measured]**

---

## 3 · The card, and a design/data mismatch

The large recommendation card (Figma `3372:19994`) has **two** text slots:

- top-left, an editorial headline — *"Explore Crystal-Clear Waters"*
- bottom, a region pill and the place name — *Paphos* / *Blue Lagoon*

**There is no editorial-headline field in the database.** `translations.en` carries `name`,
`description` (EditorJS blocks) and `short_description` — and `short_description` is a
full sentence, e.g. *"Five kilometres of flat, hard sand along the Akrotiri peninsula…"*,
which is not a headline and would wrap to four lines in a 154px slot. **[measured]**

**Proposal: the top slot renders the category name.** It is real data, it is already in all
five languages inside `categories[0].name`, and it mirrors what the small cards do with
their category tag pill. "Beaches" as a headline over a beach photo reads correctly. The
alternative — leaving the slot empty — leaves a large hole in the top half of the card.
**→ Q2.**

**The ↗ badge is not rendered.** It is an affordance for opening the place, and cards are
non-interactive in phase 2. Drawing it would be a button that does nothing.

**Non-interactive, visibly.** Cards render as `<article>`, not `<a>` or `<button>`: no
`cursor: pointer`, no hover lift, no focus ring, not in the tab order. Nothing to activate,
so nothing claims to be activatable.

**Keyboard.** The rails scroll horizontally. Each scroller is a
`role="group"` with an accessible name and `tabindex="0"`, so it is reachable and
arrow-key scrollable (WCAG 2.1.1 — a scrollable region must be keyboard-operable, whether
or not its contents are). The previous/next chevrons in the design are real `<button>`s.
Scrolling uses `scrollByInline()` from phase 1's `src/lib/dir.ts`, never `scrollLeft`
arithmetic, so it works under RTL.

**Images.** `directusImageUrl()` is ported from the app's `src/lib/directusImage.ts`,
swapping `PixelRatio.get()` for `window.devicePixelRatio` and adding a `srcset`. That helper
encodes measured facts worth not rediscovering: Directus silently ignores unknown params
and returns the full-size original with a 200, it upscales without a ceiling unless
`withoutEnlargement=true` is sent, and derivative `ETag`s are broken so caching rests on
`max-age` alone. Verified live from this repo: a 432 KB JPEG becomes a **45 KB WebP** at
564×600, `Cache-Control: public, max-age=2592000`. **[measured]**

---

## 4 · Place names are English on all 181 rows

`translations` carries **only `en`** on every published place. **[measured]** Category and
destination names carry all five languages; place names do not.

So a Polish visitor sees Polish chrome, Polish category tiles, Polish region pills — and
English place names. This is parity with the app (`LANG = 'en'` is a constant in
`placeFields.ts`) and it cannot be fixed from the web. Recorded in `PARKED.md`; not a
phase-2 defect.

---

## 5 · Food & Wine Picks — the fallback image, and why the rail is not what it looks like

The rail's categories are `tavernas` and `villages`. Measured: **[measured]**

| Category | Places | With hero | With prominence |
|---|---:|---:|---:|
| `tavernas` | 37 | **0** | **0** |
| `villages` | 9 | **9** | **9** |

**Not one of the 37 tavernas has a photo or a score.** Neither does any of the 10 bars or
7 nightlife rows. Your ruling — *"a fallback image is fine here, because the place is
real"* — is right, and I am not arguing with it. But it was made against "some images are
missing"; the measurement is that **the entire food half of the rail has no images at
all**, so the ruling's consequence is larger than it looks.

Ordering by `prominence NULLS LAST` and taking six yields **six wine villages, all
photographed** — a full, handsome rail with no fallback tile in it, and no food. Ordering
any other way puts unscored, unphotographed tavernas on the homepage as six tinted tiles.

**→ Q3. Which is Food & Wine Picks today?**

- **(a)** *Wine, honestly.* Order by prominence NULLS LAST, take 6 → six villages. The
  fallback tile is built but unused until the pool runs short. **My recommendation**, on
  the grounds that six real photographs of Omodos, Lefkara and Platres is a better homepage
  than six grey-gold name tiles, and the label is not a lie — villages are the wine.
- **(b)** *Food represented.* Interleave: 3 photographed villages, 3 tavernas as fallback
  tiles. Honest about the catalogue, visually mixed, and it puts the missing-photo problem
  on the homepage where it is more likely to get fixed.

Either way **the fallback tile gets built**, because Popular's band contains 5 heroless
places out of 22 and the treatment is needed there too.

### The fallback tile treatment

Not a grey box, and not a fake photo. A tile filled with a **sand-to-gold gradient**
carrying the category's Material icon name (`categories[0].icon` — e.g. `restaurant`,
`landmark`, `beach_access`, already on every row) at low opacity as a background mark, with
the place name and region rendered exactly as on a photo card. It reads as a designed card
with a typographic treatment, not as an image that failed. Text contrast is checked at the
same bar as everything else in §8.

---

## 6 · The Categories tiles have no photo source

The design draws 11 tiles, each a photograph under a heavy cream veil with the interest
label in navy.

There is no photo to put there. The tiles are **interests**, and interests have no place
membership — that is the same missing link as §0. The app's category tiles solve this by
using "the lowest-id member hero as the tile photo", but the app's tiles are CMS
categories, which do have members.

Three options, and the third is the interesting one:

- **(a)** Export the 11 photographs from Figma and commit them. They may be unlicensed
  stock; I would want that confirmed before committing images to a repo that ships to
  production.
- **(b)** Derive a photo through the Q1 mapping. Depends on Q1, and gives nothing for
  `hidden_gems` and `local_food` (0 heroes).
- **(c)** **Render the tile without a photograph** — the sand ground, the label, and the
  interest's existing 48px icon from `public/images/interests/`.

**I recommend (c).** Look closely at the design: the veil is heavy enough that the
photographs are barely perceptible — the tiles read as cream cards with navy text. A flat
tile would be within a few percent of the drawn design, and it costs no assets, no
licensing question, and no taxonomy decision. **→ Q4.**

(Phase 1's interest thumbnails are 48×48, sized for a 24px chip. They are usable as a small
mark inside the tile, not as a background.)

---

## 7 · Book with Pete — the contract is clear, the card is not

You asked me to wire it if the contract is clear from the function source and to say so if
it is not. **The contract is completely clear. The card is the problem.**

The function takes:

```jsonc
{
  "booking_type": "accommodation" | "activity",
  "accommodation_type": "hotel" | "villa" | "apartment",   // when accommodation
  "hotel_preference": "all_inclusive"|"stars_5"|"stars_4"|"stars_2_3"|"none",  // required for hotel
  "activity_category": "boat_cruises" | "water_sports_diving" | ... ,          // when activity
  "region": "paphos"|"limassol"|"larnaka"|"famagusta"|"troodos"|"nicosia",
  "locale": "en"|"el"|"pl"|"de"|"sv"
}
```

and returns `ready` | `reduced_filters` | `unavailable`, **all with HTTP 200** — outcomes,
not errors. `verify_jwt = false`, CORS `*`. Verified live from this machine: an OPTIONS
preflight from `https://cyprusway.eu` returns **204**, and a valid POST returns **200**.
**[measured]**

Three problems, in increasing order of severity:

1. **The card collects one of four required fields.** It asks "Where are you going?" and
   nothing else. `booking_type`, the subtype and the preference have no input anywhere in
   the design. Wiring the card means building the rest of the wizard, which is more than
   "the illustrated card".
2. **The chips are not the region vocabulary.** The design shows *Pafos, Ayia Napa,
   Larnaka, Limassol, Paralimni, Not Sure*. The backend's six slugs are *paphos, limassol,
   larnaka, famagusta, troodos, nicosia*. "Ayia Napa" and "Paralimni" are both `famagusta`;
   "Not Sure" is not a region; Troodos and Nicosia are missing entirely. `regions.ts` is
   explicit that display labels must never appear in a route key, and that the July docs'
   `ayia_napa_protaras` and `troodos_mountains` are both wrong.
3. **The card says "Choose as many as apply". The API takes exactly one region.**
4. **Every call returns `unavailable` today.** Three different valid requests
   (accommodation/hotel/paphos, activity/day_trips/limassol, accommodation/villa/troodos)
   all return `{"status":"unavailable","reason":"no_active_route"}`. **[measured]**
   `affiliate_routes` is empty, so a perfectly wired card would show an unavailable message
   to every visitor, for every input, until routes are authored.

**Recommendation: build the card, do not wire the call.** Region chips render as
single-select against the six real slugs (labelled "Ayia Napa & Protaras" for `famagusta`,
matching the app's own label map), Continue is disabled with an honest note, and the
request builder plus the three-outcome handling are written up in `PARKED.md` ready to
switch on. Wiring a multi-step wizard whose only reachable outcome today is "we have no
option for that" is not worth building twice. **→ Q5** if you would rather I build the full
flow and show the `unavailable` outcome honestly.

The Pete illustration is an asset to export from Figma.

---

## 8 · Carried forward from phase 1

- **Contrast.** Phase 1 found four measured failures in the Figma palette — white on gold
  (2.63:1), grey-2 borders (1.96:1), the alert banner's own text on its own tint (2.34:1),
  and gold links on sand (2.32:1). Assume more. Every new colour pair in phase 2 gets
  measured before it ships, particularly: white text over photo gradients on the cards, the
  category tag pill (`rgba(255,255,255,0.3)` on an arbitrary photo — this one is almost
  certainly a failure and will need a solid or much darker scrim), and the fallback tile.
- **The card gradients in the design are per-card colours** (`#099ebf` teal on one, warm
  browns and greens on others) chosen to suit each photograph. Phase 2 uses **one** navy
  gradient for every card: a per-photo colour cannot be derived at runtime, and legibility
  must not depend on which photo the CMS returns.
- **RTL**: logical properties only; the build already fails on physical ones. Rails scroll
  with `scrollByInline()`.
- **i18n**: no invented translations. New English-only strings go to
  `docs/TRANSLATION-QUEUE.md` with context.
- **`TODO(contracts):`** on the interest map (if Q1 picks b), the Popular band constants,
  the Book with Pete request builder, and the Food & Wine category list.

---

## 9 · A phase 1 bug, verified

**`useDialog` re-runs its entire open sequence whenever the parent re-renders, stealing
focus.** `src/components/ui/useDialog.ts` lists `onClose` in its effect dependencies, and
both call sites pass a fresh arrow on every render — `Layout` passes
`() => setMenuOpen(false)` to `MobileMenu`, `AuthGate` passes
`() => setInterestsDismissed(true)` to the interests modal.

Reproduced in Chrome:

```
drawer open, focus:                      "Home"
focused deep in drawer:                  "Give feedback"
→ changed the language from inside the drawer
after language change, focus:            "Start"      ← yanked back to the first row
```

A keyboard user who changes language mid-drawer loses their place; a screen-reader user
hears the trigger and then the first row announced again. The scroll-lock class is also
removed and re-added on each parent render.

Focus *restoration* survives by luck: the cleanup restores to the trigger before the
re-run captures `document.activeElement`, so the re-run happens to re-capture the same
trigger. It is one render-ordering change away from restoring focus to a node inside the
dialog that is about to be removed.

**Fix: hold `onClose` in a ref inside `useDialog` and drop it from the dependency array,**
so only `open` and `dismissible` drive the effect. Four lines. Not phase-2 scope — say the
word and I will include it, since I am in the file anyway.

---

## 10 · Open questions

| # | Question | My recommendation |
|---|---|---|
| **Q1** | Top Recommendations personalisation: **(a)** prominence only, **(b)** re-rank by a client-side interest→category map, **(c)** wait for `interest_tags`. §0 | **(b)**, and note that "re-rank" rather than "filter" removes the minimum-count problem entirely |
| **Q2** | The large card's top text slot: category name, or leave it empty? §3 | Category name — real data, already in five languages |
| **Q3** | Food & Wine Picks: six photographed villages, or an interleave that puts tavernas on the homepage as fallback tiles? §5 | Six villages. The rail looks like the design; the missing photos are recorded in `PARKED.md` |
| **Q4** | Category tiles: export 11 Figma photographs, derive via Q1's map, or render flat with no photograph? §6 | Flat. The design's veil already hides the photograph almost completely |
| **Q5** | Book with Pete: card only with Continue disabled, or build the full booking-type → subtype → region flow and show `unavailable`? §7 | Card only. Every possible answer today is "unavailable" |
| **Q6** | The phase 1 `useDialog` focus bug — fix it in this branch, or separately? §9 | Fix it here; it is four lines and I am in the file |
| **Q7** | Is `saved_places` worth building given nothing can create a row until the place page ships? §2 | Yes — it is small and correct, and it lights up the day saving exists |

**Nothing here blocks starting.** Q1 changes one sort function; Q3, Q4 and Q5 change one
component each. I will build everything else first if they are still open.

---

## 11 · Constraint check

| Constraint | Held |
|---|---|
| No database migration, written or applied | Yes — the `interest_tags` finding is reported, not worked around |
| No writes to `itineraries` | Yes — one read query, no mutation anywhere |
| No commit, no push; staged on a new branch | `web-phase-2`, cut from `web-react-phase-1` |
| No secrets; `.env` gitignored | Yes. The anon key was used from git history for read-only measurement and is not written to any file |
| Do not build search, the place page, or Ask Pete | Yes — search inputs stay disabled as phase 1 left them; cards are non-interactive |
| Cards non-interactive and visibly so | Yes — `<article>`, no pointer cursor, no hover lift, not in the tab order |
| Rails hidden rather than faked when empty | Yes — tours, saved places and continue-trip all render nothing |
| Interest slug/label mapping reused, not redefined | Yes — `src/contracts/interests.ts` and the `onb_i_*` dictionary keys |

---

## 12 · Implementation record — what changed against this plan

Built 28 August on branch `web-phase-2`, staged, not committed. Deviations from the plan
above, with reasons. Nothing changed silently.

### The rulings, as built

| | Ruling | Built |
|---|---|---|
| **Q1** | Re-rank, not filter, on a client-side map | `src/contracts/interestCategories.ts`, `TODO(contracts):` naming `places_sync.interest_tags` + the client_config RPC as its replacement. Recorded in `PARKED.md` as a fifth copy with "the app disagrees about what Adventure contains" as the named failure. `hidden_gems` left unmapped |
| **Q2** | Category name in the card's top slot | Built. Real data, already in five languages |
| **Q3** | Six villages | Ordered by prominence NULLS LAST; renders Omodos, Lefkara, Platres, Lofou, Kakopetria, Fikardou — all photographed |
| **Q4** | Flat category tiles | Built, with one addition — see below |
| **Q5** | Card only, Continue disabled | Built, with the six real region slugs single-select |
| **Q6** | Fix the `useDialog` focus bug here | Fixed: `onClose` held in a ref and dropped from the effect's dependencies |

### One addition to Q4, flagged rather than assumed

"Flat with no photograph" is built — no full-bleed background, no exported Figma stock. But
each tile carries the **32px interest thumbnail phase 1 already ships** for the onboarding
chips. It recovers some of the design's imagery for free, needs no new asset and no
licensing question, and ties the Categories rail visually to the screen where the same
eleven words were chosen. Strike it in one line if you meant no imagery at all.

### Two more measured contrast failures, both on gold

Phase 1 found four. Two more, in the same family — light copy on `--cw-gold`:

| Where | Figma | Measured | Built |
|---|---|---|---|
| Book with Pete heading | white, 24px bold | **2.63:1** — fails even the 3:1 large-text bar | `--cw-black-1`, 6.46:1 |
| Book with Pete body copy and hint | `--cw-sand` | **2.32:1** | `--cw-black-1`, 6.46:1 |
| Book with Pete region chips | `rgba(0,0,0,0.2)` over gold, white label | **3.98:1** | 35% near-black scrim → `#896e16`, white at 4.88:1 |

Documented as note 5 in `styles/tokens.css` with the new `--cw-scrim-on-gold` token. The
card keeps its gold; only the text darkens — the same ruling phase 1 made for the gold
button's label.

**Also measured, and changed from the frame:** the card's photo gradient. The design tints
each card to suit its photograph (`#099ebf` on one, warm browns and greens on others) and
only scrims the bottom. Over a bright photograph that leaves the top-slot category name at
about 3:1. All cards use one navy two-zone scrim instead — 72% at the top, 95% at the
bottom — which measures **4.91:1 for white over a pure-white photograph**, the worst case.
The frame's translucent white pill (`rgba(255,255,255,0.3)`) is likewise replaced with navy
at 82%: over a bright photograph the drawn pill is effectively white-on-white.

### A second phase 1 bug, found and fixed

**`scrollByInline()` was not direction-aware, despite a comment claiming it was.**
`ScrollToOptions.left` is a *physical* x delta, not a logical one. Phase 1 wrote the helper
on the opposite assumption; nothing used it, so nothing caught it. Phase 2's rails are its
first consumer.

Measured in Chrome in an isolated RTL scroller (range −632…0): at the start,
`scrollBy({left: +100})` does nothing (clamped) and `scrollBy({left: −100})` moves forward.
So under RTL, forward means *decreasing* `scrollLeft`.

Fixed by negating the delta when the element computes `direction: rtl`. Verified both ways
after the fix: LTR 4 → 310 → 4; RTL −4 → −310 → −4.

### The content column was 48px too narrow — a phase 1 geometry fix

`--cw-content: 1200px` was used as a `max-inline-size` *including* the gutter padding, so
the real content column was 1152px. The frames draw 1200px of content inside a 1440px
frame. Four 282px cards with three 24px gaps need exactly 1200, so every rail overflowed by
48px and showed scroll chevrons that should not have been there.

Added `--cw-content-outer: calc(var(--cw-content) + var(--cw-gutter) * 2)` and used it in
every section wrapper — header, footer, hero band, home content, skeleton. Measured after:
all three rails at `scrollWidth === clientWidth`, zero chevrons at desktop width, no page
overflow at 320/360/430/768/1100.

### Smaller deviations

- **A minimal `{placeholder}` interpolation** was added to `t()` — three lines in
  `dictionary.ts`. "Day 2 of 4" is not word order every language shares, and composing it
  from fragments in the component would have made it untranslatable. No plurals, no dates,
  no nesting.
- **`fetchOnboardingCompleted` became `fetchProfile`**, reading `interests` in the same
  round trip the session bootstrap already makes. `completeOnboarding` now takes the
  selection, so Top Recommendations re-ranks straight after onboarding with no refetch.
- **`logRead` prints Postgres errors properly.** The first version printed
  `[object Object]` for a `PostgrestError`, which is a plain object rather than an `Error` —
  it cost a diagnostic round trip during this build, so it now formats code, message,
  details and hint the way the app's `logDbError` does.
- **`ui_trip_heading` was written and then removed.** The frame has no heading over the
  trip column; only Saved Places is titled.
- **A dev-only `&as=user`** renders the signed-in skeleton, which is otherwise unreachable
  without a real sign-in. Presentational only — it does not fake a session.

### Verified, and how

Against the live catalogue in Chrome.

| | Result |
|---|---|
| One query feeds four rails | 181 rows, **13.8 KB gzipped, 232 ms**, `name` projected server-side rather than shipping the whole `translations` blob (71 KB) |
| Top Recommendations | Ranks 1–4 for a guest: Petra tou Romiou, Kato Paphos Archaeological Park, Church of Saint Lazarus, Limassol Marina |
| Popular — no overlap | Verified across two different session seeds: zero places shared with Top Recommendations |
| Popular — shuffle stability | Stable across re-renders (two language switches), stable across a reload in the same tab; **re-rolled on a new session**, seed `214653107` → `2579184334` |
| Food & Wine | Six photographed villages, as ruled |
| Tours | Section absent — the query returns nothing |
| Guest rails | No Continue-your-trip and no Saved Places, as designed |
| Rail keyboard | Scroller is `role="group"` with an accessible name and `tabIndex=0`, `overflow-x: auto` |
| RTL | Rails mirror, chevrons swap ends and point correctly, `scrollByInline` verified in both directions |
| Responsive | No page overflow at 320, 360, 430, 768, 1100 |
| Loading skeleton | Guest: 3 rails (4/6/6 cards) + 11 tiles, no tours skeleton. Signed-in: adds the trip column and four saved cards |
| Images | 28 of 28 load; Directus transform verified at 432 KB JPEG → 45 KB WebP |

**Not verified, and not claimed:** anything behind a session. Continue your trip and Saved
Places are built against the app's own query and day-of-N computation, but no real sign-in
was performed — the same gap phase 1 left. `saved_places` has never held a row anywhere, so
that rail has never rendered with data; `itineraries` has one row spanning today, belonging
to an account I cannot sign into. The signed-in **skeleton** is verified via `&as=user`; the
signed-in **rails** are not.

---

## 13 · Review round — the personalisation was too weak, and two smaller things

Reported after the first build: signed in with `["ancient_ruins","nature_trails","beach_coast"]`,
Top Recommendations differed from the signed-out rail by exactly one card and contained no
beaches, despite `beaches` being the largest renderable pool of any interest.

### It was not a bug. It was the mechanism I recommended.

Reproduced against the live catalogue by importing the real `rails.ts` in the browser, so
this is measured rather than reasoned:

```
interests received   ["ancient_ruins","nature_trails","beach_coast"]
categories wanted    archaeological-sites, historical-sites, castles-fortifications,
                     nature-trails, viewpoints-landmarks, beaches
signed out           Petra tou Romiou · Kato Paphos · Church of Saint Lazarus · Limassol Marina
with interests       Petra tou Romiou · Kato Paphos · Limassol Marina · Tombs of the Kings
beach_coast only     Nissi Beach · Fig Tree Bay · Makronissos Beach · Konnos Bay
```

All three suggested causes are ruled out by those last two lines: the interests reached the
sort (the rail changed), the map matched the strings PostgREST actually returns (a
beach-only selection returns four beaches), and the stable sort applied (Church of Saint
Lazarus was displaced).

**What actually happened:** three interests reach six of the eighteen categories, which
already covers five of the six highest-prominence places. A partition that only moves matches
to the front therefore has almost nothing to move. Nissi Beach sat at matched-position 5,
behind Tombs of the Kings on a prominence tie — both 93.6, broken by row id, Tombs id 4 and
Nissi id 17.

So the code did exactly what §0 designed, and **§0's design was too weak to be worth having.**
I argued for it on the grounds that it cannot produce an empty rail, which is true, and never
checked how visible it would be for someone with several interests. That was the gap, and it
was mine.

### The replacement: one card per interest before a second for any interest

Each interest gets a queue of its places in prominence order. The rail fills in rounds —
every interest contributes at most one card per round, strongest offer first — then backfills
from the pool. Measured after the change:

| interests | rail |
|---|---|
| `ancient_ruins, nature_trails, beach_coast` | Petra tou Romiou · Kato Paphos · **Nissi Beach** · Limassol Marina |
| `beach_coast` | four beaches |
| `beach_coast, local_food, nightlife` | four beaches — the two with nothing renderable contribute nothing |
| `culture_art` (3 renderable) | its three museums, then prominence backfill — a weak interest is bounded at one card per round |
| `nightlife` (0 renderable) | plain prominence order |
| `hidden_gems` (unmapped on purpose) | plain prominence order |
| signed out | plain prominence order |

### It broke the no-overlap guarantee, which had to be fixed too

The original argument was that disjoint rank bands make overlap impossible without exclusion
logic that could fall out of sync. That held only while Top Recommendations took the head.
Round-robin can reach anywhere: `wine_villages` alone puts Omodos, Lefkara and Platres in the
rail, and all three sit at pool ranks 21–27 — **inside Popular's 9–30 band**.

Verified: without a fix, that selection put three places in both rails. `popularBand()` now
takes the ids Top used and skips them, computed in the same render so there is nothing to keep
in sync. The band drops from 22 candidates to 19 in that case, ample for six cards. Overlap
measured at 0 across every selection tried.

### `?debug=rank`, so this is inspectable rather than inferred

A dev-only panel showing the interests received, the categories they map to, per-interest
renderable counts, and for each card: its category, prominence, pool rank, and whether an
interest picked it — with the round — or the backfill did. Paired with `?interests=a,b,c`,
which overrides the profile so any combination can be exercised without a sign-in.

It exists because the first version looked broken from the outside and was not, and "the
interests never arrived" and "the mechanism is too weak" are one-line fixes to completely
different problems.

### The two smaller items

**Popular renders 6, Top Recommendations renders 4 — deliberate, not drift.** The frames draw
four 282×300 cards for Top Recommendations and six 180×251 for Popular and Food & Wine. Both
fill the 1200px column exactly: 4×282 + 3×24 = 1200, and 6×180 + 5×24 = 1200.

**"Coming soon" appeared twelve times, not seven.** Five rail "View All" labels, the header's
five pending nav items, and the hero's two option cards. **The five View All labels are gone.**
They were an affordance for a surface that does not exist, the rail already scrolls to show
everything it has, and nothing is hidden behind the missing link — so the honest fix is not to
make the offer at all. It returns as a real link when the browse surfaces do. The header's
five and the hero's two stay: each names a specific destination someone may be looking for,
and each needs its own state.

### `.env`

Three levels, because it cost twenty minutes twice and the failure mode gave no clue:

1. **`scripts/check-env.mjs`, run by `predev` and `prebuild`.** Refuses to start, and says
   what to do. It checks *shape*, not just presence — the second failure was a key written
   twice, which is non-empty and fails at request time as "Invalid API key". Verified against
   all three cases: no file, doubled key (caught as "5 segments, 416 characters"), and valid.
   Reads `process.env` first, so CI and the Cloudflare build environment pass on their own
   variables without a file.
2. **`MissingCredentialsError`**, so a configuration problem is distinguishable from a data
   outage at the point it happens rather than thirty lines downstream.
3. **A dev-only diagnostic page** in place of the designed error state, naming the cause and
   the fix — including that Vite reads `.env` once at startup, so editing it while the server
   runs changes nothing. Production keeps the designed page: a visitor cannot fix a build-time
   variable, and `prebuild` is what stops it reaching them.

Also fixed while in there: `reset.css` strips list markers from any `ol` carrying a class, so
that diagnostic's numbered steps rendered unnumbered.

---

## 14 · The mapping, and where this stops

Ruled 28 August, after `?debug=rank` settled what the rail was actually doing.

### `viewpoints-landmarks` is no longer Nature & Hiking

The debug panel showed the rail was **4 for 4 interest-picked, zero backfill** — so the
mechanism was right and the two cards that looked like defaults were genuine matches. They
matched through `nature_trails`, because §0 mapped it to `['nature-trails',
'viewpoints-landmarks']`.

That mapping was wrong twice over. It is wrong on the merits — the category holds Limassol
Marina, the Ayia Napa Sculpture Park and the Edro III shipwreck, none of which is nature or
hiking. And it was doing measurable damage: **4 of the 8 highest-prominence places sit in
`viewpoints-landmarks`**, so claiming it made `nature_trails` swallow the editorial head and
a three-interest rail came out looking identical to the signed-out one.

`nature_trails` is now `['nature-trails']` — 7 renderable places instead of 15.
`viewpoints-landmarks` is deliberately left reachable by no interest rather than moved
somewhere else: where it belongs is a taxonomy call for the server, and `PARKED.md` holds it.

Verified against `?debug=rank`, with a real signed-in session and the profile's own stored
interests — not the dev override:

```
categories wanted   archaeological-sites, historical-sites, castles-fortifications,
                    nature-trails, beaches
per interest        ancient_ruins 16   nature_trails 7   beach_coast 18

1. Kato Paphos Archaeological Park   archaeological-sites  95.6  rank 2   ancient_ruins  r1
2. Nissi Beach                       beaches               93.6  rank 6   beach_coast    r1
3. Avakas Gorge                      nature-trails         87    rank 18  nature_trails  r1
4. Tombs of the Kings                archaeological-sites  93.6  rank 5   ancient_ruins  r2

backfill: 0        overlap with Popular: 0
```

Before the change the same profile got Petra tou Romiou · Kato Paphos · Nissi Beach ·
Limassol Marina — two of which are `viewpoints-landmarks`, and two of which are the
signed-out rail's own first cards.

### The sort is finished

Two rounds went into the ranking and the second one was unnecessary: the mechanism was
already correct when the complaint arrived, and what looked like a personalisation failure
was a mapping problem. **No further changes to the sort.**

What remains is not a ranking problem and cannot be fixed by one: a four-card rail cannot
express three interests legibly, because round one spends three of the four slots and the
fourth goes to whichever interest has the strongest next candidate. Making that visible needs
**labelled groupings** ("Because you like Beaches") or **more cards for a signed-in visitor**,
both of which are homepage design changes with no frame behind them. Parked with the
reasoning in `docs/PARKED.md`, for the next look at the homepage frames.

### One caveat lifted

A real session was present for this verification, which phase 2 had not had. That confirms
end to end: the profile read reaches the ranking, the stored interests drive it, and both
signed-in rails correctly render **nothing** — `saved_places` has never held a row and this
account has no itinerary spanning today, which is the designed empty state rather than a
failure. No console output of any kind.

Still unverified: those two rails *with data*. Nothing anywhere can create a saved row until
the place detail page ships.
