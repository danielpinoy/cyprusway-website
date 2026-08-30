# Phase 7 — My CyprusWay

Branch `web-phase-7`, from `web-phase-6`.

The brief is built on `docs/MY-CYPRUSWAY-DECISION-2026-08-30.md`, and it accepts that
report's argument: the question, a filter and one rail, not the page. Everything below
takes that as settled and works out what it means in code.

**Both of the brief's "check rather than assume" items were checked, and both pass** — §0.
Three of the four calls I agree with; the fourth I want to change, and the measurement that
changes it is in §5.4. One new finding outranks the rest of §0: **the homepage has a
four-place hole its own banding creates, and the traveller rail is what fills it.**

---

## 0 · What I verified

Everything here was read or measured today against the live catalogue with the **anon key
over PostgREST — the same request `fetchPlaces()` makes** — or read from source at
`bf656b0`. No writes, no migrations, no service-role reads.

### 0.1 The two checks the brief asked for

**"Whether the app's chooser copy actually matches the web's existing i18n strings."**
It does — **all eight strings, word for word**, compared programmatically:

| | app `TRAVELER_TYPE_OPTIONS` | web `ui_plan_party_*` |
|---|---|---|
| labels | Solo · Couple · Family · Friends | **identical** |
| descriptions | "Flexible ideas, easy-to-visit places…" ×4 | **identical** |

So the chooser's four cards need **zero new strings**, and they are already translated
into nothing — they are English-only phase-6 keys, which is the same position the app is
in. The keys stay named `ui_plan_party_*`: they are the same four options asked in two
places, and a second copy under a `ui_traveller_*` name would be a fifth vocabulary to
keep in sync. §7 lists what is genuinely new.

**"Whether the badge counts still hold."** They do, exactly:

| badge | brief | measured today |
|---|---:|---:|
| `solo-friendly` | 28 | **28** |
| `romantic` | 15 | **15** |
| `family-friendly` | 78 | **78** |
| `lively-busy` | 20 | **20** |

The whole badge inventory is 22 slugs; the four above are the only ones the feature reads.
The decision doc's traveller × region table also reproduces to the row (§2 below), and the
friends union is 20 ∪ 10 `bars` ∪ 7 `nightlife` = **31 distinct**. Catalogue: **181
published · 107 scored · 73 photographed**.

### 0.2 The finding that changes the rail's justification

**The homepage cannot show ranks 5–8, and three of those four places carry traveller
badges.** `TOP_RECOMMENDATIONS_COUNT = 4` and `POPULAR_BAND_START = 8` (0-based → rank 9),
so for a signed-out visitor these four appear **nowhere on the homepage**:

| rank | place | prominence | traveller badges |
|---:|---|---:|---|
| 5 | Tombs of the Kings | 93.6 | `family-friendly`, `solo-friendly` |
| 6 | Nissi Beach | 93.6 | `lively-busy` |
| 7 | Cape Greco | 92.4 | *none of the four* |
| 8 | Ayia Napa Sculpture Park | 92.0 | `romantic`, `solo-friendly` |

The gap is deliberate in origin — the band starts below the four cards Top
Recommendations takes, and interest re-ranking can pull anything into those four — but
nothing was ever put in ranks 5–8 for a visitor whose interests do not reach them. **The
traveller rail lands exactly there.** That reframes "largely redundant" (§3.3): the rail is
not a second copy of Popular, it is the only route by which the catalogue's fifth- and
sixth-best places reach the homepage.

### 0.3 Four other things found, all small and all load-bearing somewhere

- **The friends union changes the rail not at all.** The 11 places it adds over
  `lively-busy` are **0 scored, 0 photographed, 0 plannable** — so the six-card rail is
  byte-identical either way. It changes only Explore's count (31 vs 20). This does not
  reverse the brief's call; it changes its reason (§5.3).
- **`data-cw-auth` does not exist.** Searched: the only match in the repo is
  `TITLE_ID = 'cw-auth-title'`. The real precedent for "a control opens an overlay" is
  **`openAuth()` on the session context**, called by the header's Sign In button. The
  conclusion the brief drew from it survives; the mechanism is a context callback, which is
  better than an attribute and is what §1 uses.
- **The site is British English.** `about_p1` says "travellers"; `personalised` appears in
  five ported strings. The app's rail heading is *"Perfect for solo travelers"*. Taking it
  verbatim would put the site's first US spelling in a heading (§3.2).
- **The tours claim is wider than the five the brief names** — and narrower than a grep
  suggests, because most of it is dormant. §4.

---

## 1 · Where the chooser lives, and what triggers it

**A card in the existing modal family, not a page and not a route.**

`TravellerScreen`, beside `InterestsScreen`, rendered by `AuthGate` through
`Modal size="interests"` — the same component, the same focus trap, and since phase 6 the
same enter/exit motion (`useKeepMounted`, `@starting-style`, `allow-discrete`). It inherits
all of that for free; the only new CSS is the card's own spacing.

**The body is `OptionTiles<TravellerType>` with `rows`** — literally the planner's step-4
shape, passing the same four `ui_plan_party_*` options and `PARTY_ICONS`. That is a real
radio group in a `fieldset`, which is what the brief's accessibility line asks for, and it
is already built.

### 1.1 What opens it

| trigger | today | after |
|---|---|---|
| Hero card "My CyprusWay" | `optionPending`, visually-hidden *coming soon* | a `<button>` that opens the chooser |
| Nav item ×3 (header, drawer, footer DISCOVER — one `NavItem`, three renders) | `pending: true` | opens the chooser |
| A pencil beside "Travelling as a couple" in the hero | — | reopens it, once a type is set |
| Footer SEGMENTS column | dropped in phase 1 | four links to `/explore?with=…` (§2.3) |

`AuthGate` already owns "which card is up" as data (phase 6 gave it a `Card` union so the
exit could animate). A third kind, `{ kind: 'traveller' }`, is one arm of that union.

The trigger is **`openChooser()` on `SessionProvider`**, beside `openAuth()`. `NavItem`
gains a third shape next to `to` and `pending` — `action: 'chooser'` — and `NavLabel`
renders it as a `<button>` styled as the link. That is ~10 lines across
`navigation.ts` and `NavLabel.tsx`.

### 1.2 What it writes

**Signed in:** `users.traveler_type`, one column, through a `saveTravelerType()` built on
the `saveInterests` pattern — `.update(...).eq('id', userId).select('id')`, zero rows
treated as an error, never a silent success. The column is in the nine-column
`authenticated` UPDATE grant and carries a CHECK of the four values, so the vocabulary is
the database's and a fifth value is a 23514 rather than a type error.

**It is one row, shared with the phone**, exactly like `preferred_language` — and the card
says so, reusing the `ui_language_shared` precedent rather than letting it be a surprise.

**Guest:** nothing is written and nothing is stored. Continue goes to
`/explore?with=<type>`, and the URL is the whole of the guest's state. No `localStorage`:
there is no precedent for it outside the language switcher, and a preference persisted
without an account is exactly the kind of thing the cookie banner exists to talk about.
A guest therefore gets the Explore filter and no homepage rail — which is honest, because
the rail is a property of a profile.

**Skip** closes and writes nothing. The question is an invitation, never a gate: the web's
onboarding is one screen by phase-1 ruling, and the app's forced picker has a **0-of-25**
answer rate, which is the strongest available evidence that forcing it does not work.

### 1.3 What it does not do

It does not become a second onboarding step, it does not bounce anyone, and a null
`traveler_type` produces **no rail and no prompt** beyond the hero card that was always
there. `SessionProvider` gains `travelerType` beside `interests`, read from the same
`fetchProfile` call by adding one column to its `select` — not a second read, and not a
duplicate of `fetchPlannerProfile`, which keeps its own read for the planner's own reasons.

---

## 2 · The filter — what it applies to

### 2.1 The contract

`src/contracts/travellerPools.ts`: the four values → badge slugs, plus two category slugs
for friends. Same class of file as `interestCategories.ts` and recorded beside it in
`PARKED.md` as a client-side taxonomy the server should eventually own — **but a smaller
claim than that file makes**, because badges live on the place row and are curator-defined.
The only invented part is the friends union, and the app holds an identical copy.

```ts
solo    → badges: ['solo-friendly']
couple  → badges: ['romantic']
family  → badges: ['family-friendly']
friends → badges: ['lively-busy'], categories: ['bars', 'nightlife']
```

The web filters **in memory** over the 181 rows already fetched, so the app's
`.contains()` / `or=()` PostgREST traps do not apply — but the pool definition must stay
identical to `travelerTypes.ts`, and that is the thing to record.

### 2.2 On Explore

`?with=solo|couple|family|friends`, validated exactly as `interest` is and **applied only
when `ready`** — the hydration rule Explore already carries, and the reason its comment
gives (a prerendered file hydrated at a URL with query params keeps the server's
`aria-pressed` for the life of the page) applies identically to a third axis.

`filterPlaces` gains a `with` term; `ExploreEmpty` gains it as a clearable filter.

**Rendered as one dismissible pill, not a third chip row.** That is my one disagreement
with the brief's calls and the argument is §5.4.

### 2.3 The footer's SEGMENTS column

Four links — `/explore?with=solo` and friends — restoring a column phase 1 dropped as
"taxonomy links into browse surfaces phase 1 does not build". The surfaces exist now. The
frame's label "Sole-traveler" becomes **Solo**, matching the chooser's own card.

This is where discoverability lives for anyone who never opens the chooser, and it is four
`<a>` elements.

### 2.4 What happens for Solo and Family, given the overlap

The brief predicts the rail is "largely redundant for Solo and Family". Measured, with the
rail's ids added to Popular's existing `exclude` set:

| type | promotes into a labelled row | surfaces places the homepage **cannot** show | Popular's candidates left (needs 6) |
|---|---:|---|---:|
| Solo | 4 | 2 — Tombs of the Kings (5), Ayia Napa Sculpture Park (8) | 18 |
| Couple | 3 | 3 — Sculpture Park (8), Lofou (57), Omeriye Mosque (105) | 19 |
| Family | 5 | 1 — Tombs of the Kings (5) | 17 |
| Friends | 3 | 3 — Nissi Beach (6), Pissouri (51), Kourion Beach (53) | 19 |

**Nothing appears twice**, because Popular already takes an `exclude` set and the rail
joins it. So the honest description is not "redundant" but: for Family the rail mostly
*relabels* five cards that could have appeared unlabelled in Popular, and adds one the
homepage has no other way to show. For Couple and Friends it is half new. Popular stays
full in every case.

And the four rails are genuinely four rails — pairwise overlap across their six cards is
**couple ∩ family 0, couple ∩ friends 0, solo ∩ couple 1, family ∩ friends 1, solo ∩
family 2, solo ∩ friends 2**.

---

## 3 · The rail, named

### 3.1 Contents, today

Rules: the existing `renderablePool` (scored) → the badge pool → minus Top
Recommendations' four → `prominence desc nulls last, id asc` → six cards. Computed against
the live catalogue; Top Recommendations shown here in its signed-out form (it is
interest-aware, so a signed-in visitor's four may differ and the rail shifts under it).

**Solo** — 25 candidates after exclusion, 5 photo cards + 1 text card
1. Tombs of the Kings 93.6 · 2. Ayia Napa Sculpture Park 92 · 3. Kourion Archaeological
Site 91.9 · 4. Phinikoudes Beach 86.9 · 5. **Limassol Medieval Castle 86.4 — no photograph,
fallback card** · 6. Limassol Old Town 85
*Next: Venetian Walls, Lefkara, Kolossi Castle.*

**Couple** — **exactly 6 candidates**, 6 photo cards
1. Ayia Napa Sculpture Park 92 · 2. Profitis Ilias Church 88.4 · 3. Edro III Shipwreck 85 ·
4. Lefkara Village 85 · 5. Lofou Village 76 · 6. Omeriye Mosque and Hammam 64.2
*Nothing next. The pool is 15 published, 7 scored, and Petra tou Romiou is spent on Top
Recommendations.*

**Family** — 53 candidates, 6 photo cards
1. Tombs of the Kings 93.6 · 2. Kourion Archaeological Site 91.9 · 3. WaterWorld Waterpark
90.1 · 4. Fig Tree Bay 89 · 5. Camel Park 88.1 · 6. Konnos Bay 87.5
*Next: Phinikoudes Beach, Coral Bay, Limassol Medieval Castle.*

**Friends** — 8 candidates, 6 photo cards
1. Nissi Beach 93.6 · 2. Fig Tree Bay 89 · 3. Phinikoudes Beach 86.9 · 4. Limassol Old
Town 85 · 5. Pissouri Beach 78 · 6. Kourion Beach 77.6
*Next: Laiki Geitonia (no photograph), Agros Village.*

**Couple is exactly full and Friends has two spare.** One place losing its `romantic`
badge, or one being promoted into Top Recommendations by an interest re-rank, empties a
couple slot. The rail is already built to handle that — it renders whatever it has and
disappears under four — but it is the fragility to watch, and it is the argument for
content item 2 in the decision doc's §6.3 (`peaceful-quiet` minus `romantic` would roughly
double the couple pool).

### 3.2 Headings

The app's four, with one change:

> Perfect for solo **travellers** · Perfect for couples · Perfect for family trips · Perfect for friend trips

The app writes "travelers". The site writes "travellers" (`about_p1`) and "personalised"
throughout; a US spelling in a rail heading would be its first. Recorded as a deliberate
divergence from the app's verbatim copy rather than a typo, so nobody "fixes" it back.

### 3.3 Placement and rules

After Top Recommendations, before Popular, and **its ids join Popular's `exclude` set** —
the mechanism already exists (`popularBand(pool, exclude)`), so nothing new is needed for
deduplication. Absent under four candidates, by the existing empty-rail rule. No "View
All", matching every other rail — though this is the one rail that now has an honest
destination (`/explore?with=`), so it is worth asking (Q3).

Null type, guest, or a failed profile read → **no rail**, no placeholder, no prompt.

### 3.4 The hero line

For a signed-in visitor with a type set, under the hero sub-copy: *Travelling as a couple*
with a pencil that reopens the chooser. Rendered only after the session resolves — the
header's avatar rule, and phase 6's finding that `SessionStatus` starts `idle` on the
server means it must never be in the prerendered markup.

---

## 4 · The tours sweep

Swept every `.ts`/`.tsx` in `src/`, both dictionaries, and the content pages, for
`360`, `virtual tour`, `immersive`, `narration`, `aerial`, `25 tours`. **The claim is in
21 dictionary keys and 4 prose lines — but only 9 of those actually reach a visitor.**

### 4.1 Rendered, and always visible — fix these

| where | key / file | reach |
|---|---|---|
| **Homepage H1** + **footer tagline** + auth card signup heading | `onb_signup_title` — *"Step inside Cyprus before you arrive with immersive 360° tours and guided narration"* | **one ported key, three surfaces, five languages** |
| Homepage `<meta name="description">` | `ui_meta_home_desc` — same sentence | English only (a React string) |
| `/about` | `about_p1` — *"…curated places, immersive 360° virtual tours, personalised trip planning…"* | ported, five languages |
| `/faq` ×3 | `FaqContent.tsx:20, 24, 26` — *"exploring a selection of virtual tours"*, *"all 25 immersive 360° virtual tours … €4.99"*, *"preview places in 360° virtual tours"* | English only |
| `/terms` ×1 | `TermsContent.tsx:17` — *"preview them through 360° virtual tours"* | English only |

`onb_signup_title` is the expensive one: it is the **first line a visitor reads**, it is
the footer of every page, and it is the signup card's heading, so a replacement needs all
five languages or it degrades to English in four of them. The translation queue already
owes hero copy; this joins it.

### 4.2 Rendered only if a tour exists — no change needed

`ui_nav_tours` ("360° Tours") is the nav item ×3, and the brief rules it stays (parked).
`ui_tour_badge` ("360° Tour") and `ui_rail_tours` ("See Cyprus before you go") are
referenced by `TourCard` and `HomeContent`, but the rail is gated on `tours.length > 0`
and `tourPlaces()` filters on `hasTour`, which is false on all 181 rows. **Nothing ships.**
That is phase 2's design working exactly as intended and is not a claim to fix — it is the
model the rest of this sweep should be measured against.

### 4.3 Dormant — 12 ported keys, referenced by no component

`nav_vt`, `hero_desc`, `intro_text`, `feat_vt_title`, `feat_vt_desc`, `feat1_title`,
`feat1_p1`, `feat1_p2`, `prem_vt_title`, `prem_vt_desc`, `succ_vt`, `banner_desc` — × 5
languages. These came from the legacy `js/i18n.js` in the phase-1 port and no React
component reads them. **Leave them.** `src/i18n/generated/` is the ported dictionary and
is explicitly not hand-edited (the port script owns it); deleting keys there to remove
claims nobody can read would be editing a generated file to fix a problem that does not
exist. Worth one line in `PARKED.md` so a future sweep does not re-find them and panic.

### 4.4 Two adjacent defects found in the same prose

- **`/faq` promises "the ability to regenerate individual days in your itinerary"** and
  "itinerary regeneration". Phase 6 established there is no such endpoint —
  `regenerate-day` "was never built, only proposed", and `trip-edit` is deterministic.
  Same class of false claim, same paragraph, and it should go with the tours line.
- **`/faq` links to `destinations.html`** (`FaqContent.tsx:28`), a page phase 1 deleted.
  The Worker 301s it to `/`, so it is not a 404 — but an in-page link to a redirect to the
  homepage, described as "our Destinations page", is a dead end with a courtesy attached.

---

## 5 · The four calls

### 5.1 Page or state — **agree, a state**

And to answer the brief's question directly: **yes, "My CyprusWay" resolves to no route at
all.** It is the name of a question and its consequences — the chooser (a dialog), the
homepage rail, the Explore filter, and the planner's party fallback that already reads the
same column. There is no `/my-cyprusway`, no prerender entry, no `ROUTE_META` row, no
sign-in gate and no third error state.

The nav item therefore does not navigate; it asks. That is the one thing about this call
worth stating out loud, because a nav item that opens a dialog is unusual — §5.2.

### 5.2 A nav item may open a card — **agree**, with the precedent corrected

`data-cw-auth` does not exist. The precedent is `openAuth()`: the header's **Sign In**
button opens the auth card through a session-context callback, from a control that sits in
the same row as the nav. `openChooser()` is the same mechanism one item along.

Two things this must not break, both already handled by the modal family: focus returns to
the trigger on close (`useDialog` restores it), and the dialog is `inert` while closing so
a Tab during the 200 ms exit cannot land inside it.

### 5.3 The friends pool — **agree, take the union**, for a different reason

The brief's reason is parity, and parity is a good reason. But the measurement makes a
stronger one: **on the rail the union is a no-op** — its 11 extra places are 0 scored,
0 photographed, 0 plannable, so the six cards are identical either way — **and on Explore
it is correct**, because Explore is a catalogue rather than a ranking (the rule its own
comment defends: requiring a score there would "return Food and Nightlife to zero
results"). Seventeen bars and clubs are genuinely what a group of friends is looking for,
and a browse surface should show them.

So: union, recorded in `travellerPools.ts` as shared with the app's `travelerTypes.ts`,
with the note that the two copies must agree.

### 5.4 Explore's third chip row — **this one I want to change**

The brief says "only if it costs almost nothing". **In code it does** — ~60 lines, and
every piece of machinery exists. **In the interface it does not**, and here is the
measurement:

- **Traveller × interest is 45% empty: 20 of 44 cells.** Solo × local_food 0, solo ×
  nature_trails 0, solo × nightlife 0, solo × kid_friendly 0; couple × beach_coast 0,
  couple × nature_trails 0, couple × adventure 0, couple × culture_art 0; friends ×
  nature_trails 0, friends × adventure 0, friends × culture_art 0, friends × kid_friendly
  0; and `hidden_gems` is 0 for all four because it maps to nothing by design.
- **Traveller × region is 2 of 24 empty** (nobody solo or romantic is tagged in Troodos) —
  fine on its own, but it multiplies with the above.
- Explore already carries **two** rows, and `FilterRow`'s own comment records that "both
  rows overflow at common widths — the eleven interests do at every width". A third row
  makes 24 chips above the grid.

A third row invites a visitor to combine three axes, nearly half of whose pairs are empty
before the region is even chosen. That is a control panel that mostly produces
`ExploreEmpty`.

**What I would build instead — and it is less code, not more.** Keep `?with=` doing all the
work, and express it on Explore as **a single dismissible pill in the summary row**:

> Travelling as **Couple** ✕ · 15 places

- No third chip row, no `segmentOptions()` with per-chip counts, no fourth `FilterRow`.
- The filter is still linkable, still composes with region and interest, still validated
  and still `ready`-gated.
- Explore looks **exactly as it does today** for anyone who has not set a type — which is
  every visitor who has not been through the chooser or a footer link.
- It is set where it makes sense (the chooser, the footer's four links, a shared URL) and
  cleared with one control.

**What it costs:** a visitor already on Explore cannot switch traveller type there without
going to the chooser. I think that is right — the type is a profile-level answer, not a
browse-level toggle, and treating it as a chip alongside "Beaches" says the opposite.

If the owner wants it discoverable on Explore anyway, the chip row is a small addition on
top of the pill and can be added later without rework. **Recommendation: pill now, and
the frame's departure is smaller too — one indicator rather than a row the frame does not
draw.** → **Q1**

---

## 6 · Cut, and parked

Cut with no placeholder, exactly as the app cut them, each getting a `PARKED.md` entry
with its unpark condition:

| cut | why | unparks when |
|---|---|---|
| The 360° tour hero | `virtual_tour` null on 181/181; one Directus placeholder pointing at a test video, linked to nothing | a real tour row exists |
| Per-traveller card copy ("A taverna table, just for you") | no column, in either system; the solo frame's own cards read "Kayaking for Couples" — it is mockup filler | a copy column, or authored per-place lines |
| `traveler_scores` | null on 182/182, no writer, no defined shape | a shape and a writer |
| Star ratings | no column anywhere | a ratings source |
| The "360° Tours" nav item | brief's ruling: leave it | a tour exists |
| The 12 dormant ported tour keys | generated file, no component reads them | never — recorded so a future sweep does not re-find them |

---

## 7 · Strings

**Zero new strings for the chooser's four cards** (§0.1). New keys, English only, to
`TRANSLATION-QUEUE.md` — currently 323:

- Chooser: heading, sub-line, the shared-with-the-app note, Skip, Continue — 5.
- Rail headings ×4 — 4.
- Hero line "Travelling as {type}" + the pencil's accessible name — 2.
- Explore pill: label + its clear control's accessible name — 2.
- Footer SEGMENTS heading — 1.
- Four segment link labels — reuse `ui_plan_party_*`. **0.**

**≈14 new keys.** Plus the tours rewrite (§4), which is a different kind of work: one
ported key in five languages (`onb_signup_title`), one English key (`ui_meta_home_desc`),
one ported paragraph (`about_p1`), and four prose passages in two content components.
The five-language work needs a translator and should be queued as such rather than
machine-translated — the queue's own standing rule.

---

## 8 · Accessibility, motion, RTL, contrast

- **The chooser is a radio group in a dialog**: `OptionTiles` is a real `fieldset` +
  `legend` + `input[type=radio]`, and `useDialog` provides the focus trap, Escape, the
  scroll lock and focus restoration. Nothing new is written.
- **Motion** is inherited: the modal family got `useKeepMounted`, `@starting-style` and the
  discrete `display` transition in phase 6. The chooser does not opt in — it simply is a
  `Modal`.
- **RTL**: logical properties throughout; the pill's ✕ uses `inset-inline-end`. The rail is
  `Rail`, which is already mirrored and keyboard-scrollable.
- **Contrast**: the chooser's selected tile uses the established gold-border + `--cw-gold-tint`
  + navy-label treatment (10.21), **never** the mobile frame's gold fill with a white label
  (2.63, rejected). Every gold declaration carries a `contrast:` annotation and
  `check-contrast.mjs` re-derives it. The pill is a new surface and gets measured.
- **Prerender**: the rail, the hero line and the pill are all session- or URL-dependent and
  must not appear in prerendered markup — the phase-6 finding that `SessionStatus` is
  `idle` on the server applies to all three.

---

## 9 · Build order

1. `contracts/travellerPools.ts` + the `PARKED.md` entry beside `interestCategories`.
2. `profile.ts`: one column on `fetchProfile`'s select, `saveTravelerType()`.
3. `SessionProvider`: `travelerType`, `openChooser`, `setTravelerType`.
4. `TravellerScreen` + `AuthGate`'s third `Card` arm.
5. `navigation.ts` / `NavLabel.tsx`: the `action` kind; un-pend `my-cyprusway`.
6. `Hero.tsx`: the card becomes a button; the "Travelling as" line.
7. `rails.ts`: `travellerRail()`; `HomeContent`: the rail + Popular's exclude set.
8. `explore.ts` / `Explore.tsx` / `ExploreEmpty`: the `with` axis and the pill.
9. `Footer.tsx`: the SEGMENTS column.
10. The tours copy sweep (§4) — independent of 1–9 and shippable on its own.
11. `PARKED.md`, `TRANSLATION-QUEUE.md`.

Roughly 500–700 lines of new code, matching the decision doc's estimate. Step 10 is the
one the brief wants regardless of the rest.

---

## 10 · Disagreements

**10.1 Explore's third chip row → a pill.** §5.4. The only substantive one, and the
measurement is 20 of 44 empty cells.

**10.2 The rail is not "largely redundant for Solo and Family".** §2.4. With the rail's ids
in Popular's exclude set nothing appears twice, so the rail relabels rather than repeats —
and for Family it still surfaces one place (Tombs of the Kings, rank 5) that the homepage's
banding cannot show at all. The brief's framing would be right if the rail were additive to
Popular; it is not, because the deduplication mechanism already exists.

**10.3 "Perfect for solo travelers" gets a second L.** §3.2. A small divergence from "the
app's four, verbatim", and the alternative is the site's first US spelling.

**10.4 The tours sweep is 9 live instances, not 5 — and 12 dormant keys that should be left
alone.** §4. The brief named five; `about_p1` and three of the four prose passages were not
among them, and the FAQ carries two adjacent false claims (a regenerate endpoint that does
not exist, a link to a deleted page) that belong to the same fix.

---

## 11 · Questions

**Q1 — the Explore pill instead of a third chip row?** §5.4. My recommendation, and the
one call in the brief I am asking to change. If the answer is "chip row as briefed", it is
a small addition on top and nothing here is wasted.

**Q2 — does the chooser write for a guest who later signs in?** Today: no. A guest picks a
type, gets `/explore?with=couple`, signs in later, and the column is still null — so they
would have to answer twice. The alternative is holding the choice in memory and writing it
on the next successful sign-in, which is ~10 lines in `SessionProvider` but writes a
profile column as a side effect of signing in. **My recommendation: no** — an answer given
before there was an account is not consent to change the account, and the hero line makes
the question easy to answer again. Worth an explicit ruling.

**Q3 — "View All" on the traveller rail?** Every other rail has none, by a phase-2 ruling
that they had nowhere to go. This one would have somewhere: `/explore?with=<type>`. Adding
it to one rail and not the others needs a designer's call on whether that reads as
deliberate. **My recommendation: no, for consistency** — the footer's SEGMENTS column and
the chooser's own Continue already reach the same URL.

**Q4 — should the tours copy fix ship separately, ahead of the feature?** §4 is independent
of §§1–3 and the brief says phase 6 is close to deploying. Shipping it as its own commit
on this branch — or cherry-picked onto `web-phase-6` — would put the honest copy on the
first deploy rather than the second. **My recommendation: its own commit, first, so it can
be taken separately if the deploy happens mid-phase.**

**Q5 — who writes the five-language replacement for `onb_signup_title`?** It is the
homepage H1, the footer tagline and the signup heading in five languages. English is an
afternoon; the other four need a translator, and until they land those surfaces read
English for a Polish, German, Greek or Swedish visitor. The queue's standing rule is that a
missing translation is visible and a wrong one is not, so English-until-translated is the
established fallback — but this is the most-read string on the site and worth naming.
