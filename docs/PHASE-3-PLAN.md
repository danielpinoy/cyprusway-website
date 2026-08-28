# CyprusWay Web — Phase 3 Plan: Explore and the place page

Phase 0 output. **Nothing below is implemented.** Awaiting approval.

Branch `web-phase-3`, to be cut from `web-phase-2` at `69ceb90`.

**What was read and measured.** Figma `3397-1327` (Explore) and `3487-21941` (place detail) —
screenshots and full metadata on both. Phase 2's `Rail`, `PlaceCard`, `rails.ts`, `places.ts`
and `interestCategories.ts`. The app's `categoryTagColors.ts`. And **the live catalogue** —
every number tagged **[measured]** was queried against `knvjmsnwzskbageetbam` today, not taken
from a document. The deep-link question was answered by running the real build under
`wrangler dev`, not by reading the config.

---

## 0 · The relaxed rule does not go far enough, and I can show you why

You asked me to check whether prominence, not photography, is the real limit for some
categories. **It is, and it is the limit for exactly the categories you care about.**

The 73 places that have neither a score nor a photograph are almost entirely the starved
ones: **[measured]**

| | places with neither score nor photo |
|---|---:|
| `tavernas` | 37 |
| `bars` | 10 |
| `amusement-parks` | 9 |
| `indoor-playgrounds` | 9 |
| `nightlife` | 7 |
| `museums` | 1 |

So relaxing the image rule to **published + scored** moves 35 places into view — but not one
taverna, not one bar, not one nightlife venue, and neither of the two biggest family
categories. Here is what each rule actually yields: **[measured]**

| interest | A: scored + photo (phase 2) | B: scored (your proposal) | C: published (my counter) |
|---|---:|---:|---:|
| `beach_coast` | 18 | 21 | 22 |
| `ancient_ruins` | 16 | 21 | 21 |
| `churches_monasteries` | 9 | 12 | 12 |
| `wine_villages` | 9 | 9 | 9 |
| `nature_trails` | 7 | 10 | 10 |
| `culture_art` | 3 | 6 | 7 |
| `adventure` | 1 | 7 | 7 |
| `kid_friendly` | 2 | **15** | **33** |
| **`local_food`** | 0 | **0** | **37** |
| **`nightlife`** | 0 | **0** | **17** |
| `hidden_gems` | 0 | 0 | 0 |
| **All Interests** | **72** | **107** | **181** |

**Rule B leaves three chips empty. Rule C leaves one.** And the one it leaves —
`hidden_gems` — is empty for a different reason: it maps to no CMS category at all, which is
a taxonomy gap already recorded in `PARKED.md`, not a content gap that any rule change can
reach.

### What I propose instead

**Explore uses rule C. The rails keep rule B.** Different jobs, different bars:

- **A rail is a ranking.** "Top Recommendations" and "Popular at the moment" put four or six
  places above everything else in the catalogue, and an unscored place has no claim to that
  slot. Requiring `prominence` there is not a photography rule, it is the ranking itself.
- **Explore is a catalogue.** It is the surface whose whole job is "show me what exists".
  `status = 'published'` is the editorial signal that a place is ready to be seen;
  `prominence` is an ordering signal that 74 rows are simply still waiting for. Withholding a
  published place from the browse grid because nobody has scored it yet is the same category
  of mistake as withholding it because nobody has photographed it.

The unscored places are not incomplete in any other way: **[measured]**

```
of the 74 unscored places —  74/74 have a name        74/74 have a region
                             73/74 have a short_description
                             74/74 have a category     70/74 have badges
                             57/74 have a visit duration
```

A sample one reads: *"On Paphos harbour since 1957 and renamed after a pelican rescued in
1967; a pelican called Kokos still lives at the restaurant…"* That is a publishable place with
real editorial copy. It is missing a ranking number.

Explore orders by `prominence` descending, nulls last, then `id` — so the scored places lead
and the unscored follow in a stable order. Nothing is ranked that has no rank.

**→ Q1. Rule C for Explore, rule B for the rails?** If you'd rather hold Explore to rule B,
say so and I will build it — but then Food, Nightlife and Hidden Gems return nothing, and the
empty state becomes the primary experience for three of the eleven chips rather than one.

---

## 1 · The fallback card, and whether it survives grid density

You asked me to check whether phase 2's fallback tile — sand-to-gold gradient with the
category's initial as a watermark — holds up at twenty-plus. **It does not.** It was designed
for at most one or two cards inside a six-card rail. Filter Explore to Food and it becomes
twenty identical gradients with a letter on them: a wall, and one that reads as a rendering
failure precisely because every tile is the same.

**The fix is already in the data. Give the card the words instead of the picture.**

Every unphotographed place has a `short_description`, and they are exactly card-sized:
**[measured]** median **166 characters**, 75th percentile 174, longest 192, and only one row
of 181 has none.

So the fallback card carries:

- the category's Material icon (`categories[0].icon` — `restaurant`, `beach_access`,
  `landmark`…) as a small mark, not a giant watermark
- **the `short_description`, clamped to three lines**
- the place name and region, exactly as a photo card does

Every tile is then different, and different in a way that is *useful* — a person browsing
tavernas without photographs learns more from three lines about the pelican than from a
photograph of a taverna they would have got. It reads as an editorial card, which is what it
is, rather than as an image that failed to arrive.

Phase 2's gradient is kept as the ground, so the two treatments stay visibly related, and the
big-initial watermark is dropped everywhere including the homepage rails.

Applied consistently, as you asked: Explore, the homepage rails, and the detail page's gallery
when a place has no images at all (§5).

**One consequence worth naming:** Popular's band picks up **5 unphotographed places out of
22** under rule B — Limassol Medieval Castle, Mount Olympus, Agios Neophytos Monastery,
Fasouri Watermania and Pafos Zoo. **[measured]** Those are good places that were invisible for
lack of a photograph alone. Top Recommendations' head is unchanged: ranks 1–8 all have
photographs already.

---

## 2 · Explore

### The query

The same single request phase 2 already makes, with the rule relaxed — 181 rows, 13.8 KB
gzipped, 232 ms. **[measured]** Filtering happens in memory; there is no per-filter round trip.

```
GET /rest/v1/places_sync
  ?select=id,slug,name:translations->en->>name,
          short:translations->en->>short_description,
          hero_image_url,gallery,virtual_tour,destination,categories,badges,
          prominence,visit_duration_minutes
  &status=eq.published
  &order=prominence.desc.nullslast,id.asc
```

`short_description` is new to the select (the fallback card needs it) and adds about 30 KB
uncompressed. Explore and the homepage share the fetch, so the homepage pays for it too; I
will measure the gzipped delta and report it rather than guess.

### Filters and the URL

**`/explore?region=<slug>&interest=<slug>`.** Both single-select, both backend slugs, absent
means all. `?region=paphos&interest=beach_coast`. Reasons: it is the shape you suggested, it
survives a reload and a share, the values are the same vocabulary everything else in the repo
uses, and an unknown value can be ignored and dropped from the URL rather than erroring.

The frame's chips are single-select with an "All" reset, which is what this encodes. If
multi-select is wanted later, `?interest=a,b` extends it without breaking existing links.

**Regions come from the data, not a hardcoded list.** `destination` carries `{slug, name}` in
all five languages, so the chips are translated for free: **[measured]**

```
paphos 37 · limassol 39 · famagusta 32 ("Ayia Napa & Protaras") · larnaka 31 ·
troodos 22 · nicosia 20
```

The frame labels them "Pafos" and "Troodos & Mountains"; the catalogue says "Paphos" and
"Troodos". The data wins — those labels are what the app shows and what the region pill on
every card already says.

**Interests come from `interestCategories.ts`.** One map, the one phase 2 built and phase 2's
review round corrected. No second mapping. If it needs changing it changes there, and it is
already recorded in `PARKED.md` as a taxonomy call that belongs on the server.

### The real result count

The frame says **"67 results found"**. Nothing in the catalogue produces 67. The unfiltered
total is **181** under rule C, 107 under rule B, and 72 under phase 2's rule. **[measured]**
I will render the real count, and it will be `181` on first load.

### The empty state — it will be seen, and there are two kinds

Even under rule C, **21 of the 66 region × interest combinations are empty**. **[measured]**
Six of those are `hidden_gems` in every region; the other fifteen are ordinary facts about
Cyprus:

```
beach_coast × troodos      ancient_ruins × troodos     wine_villages × paphos
nature_trails × limassol   culture_art × larnaka       adventure × nicosia   …
```

Those two kinds deserve different copy, because one is true and the other is a gap in our data:

**A combination with genuinely nothing in it** — there are no beaches in the Troodos
mountains, and saying so is more useful than "no results":

> **No beaches in Troodos.**
> Troodos is the mountain range — try Nature & Hiking, or pick another region.
> [Clear filters]

The suggestion names an interest that *does* have content in that region, computed from the
same in-memory catalogue rather than hardcoded.

**`hidden_gems`, which is empty everywhere** — the honest thing is that the tag does not exist
on places yet, not that Cyprus has no hidden gems:

> **Hidden Gems isn't tagged on places yet.**
> The other ten interests are. This one needs the places themselves to be tagged.
> [Clear filters]

TODO(contracts) on both: when `places_sync.interest_tags` lands, the second message goes away.

### Signalling empty chips before they are clicked — my view

**Yes, but with a count, not a disabled state.**

Every chip's result count is already known — the whole catalogue is in memory before the chips
render, so the number is free. Show it: `Beaches 22`, `Nightlife 17`, `Hidden Gems 0`.

Against disabling: a disabled chip hides the vocabulary. Someone who cares about nightlife
should see that we know the category exists and are simply not there yet — that is a different
message from the chip not being offered, and it is the truthful one. A count also degrades
correctly as the filter narrows: with Troodos selected, `Beaches 0` tells you why before you
click, and tells the team where the gap is.

Against doing nothing: three interests currently return zero from a cold start under rule B,
one under rule C, and a chip that silently returns nothing is the worst of the three options.

The counts update with the region filter, so the pair always describes what a click would do.
**→ Q2** if you would rather have plain chips.

### Grid, and Load More

Five columns of 220 × 251 cards at 1200, four rows — **20 per page** from the frame.
**[measured from `3397:8977`]** Responsive down to two columns; the card fills its column
rather than being fixed-width, unlike the rail cards which scroll.

**Load More**, as a real button, per the frame and your reasoning about the footer. It appends
the next 20 and moves focus to the first newly added card so a keyboard user is not returned
to the top. The count line stays live — `Showing 40 of 181`.

### List / Map

**Ship List only, with no toggle.** A toggle with one reachable option is not a toggle, and a
disabled "Map" is a control whose only function is to tell you it does not work — the same
argument that removed phase 2's five inert "View All" labels. The heading row keeps the result
count on the left and nothing on the right until the map exists. `PARKED.md` gets the entry.

---

## 3 · The place page

### Route and query

`/place/<slug>`, resolved from the same catalogue fetch — the place is found in memory by
slug, so a visitor arriving from Explore or a rail pays no extra request. A cold direct load
fetches the catalogue once, exactly as the homepage does.

**A slug that does not resolve renders the real 404 view**, and the Worker returns a real 404
status for prerendered slugs — see §4, which is the part that does not work today.

### What ships

Title · region · gallery · features badges · About · the Popular rail. Overview only.

**No tab bar.** The frame draws Overview / Tours / Hotels / Activities and three of the four
are parked; a tab bar with one tab is chrome that explains nothing.

**"Best time to visit" has no data source and is not being built.** `translations.en` carries
exactly three fields on all 181 rows — `name`, `description`, `short_description`
**[measured]** — and there is no best-time column anywhere on `places_sync`. The frame's *"Late
afternoon, when the light softens over the headland"* is editorial copy that does not exist in
the CMS. Inventing it per place is out of the question and a generic line would be worse than
nothing. Recorded in `PARKED.md`. **→ Q3** if a field is coming.

**Features badges** are `badges[]` — real data, all five languages, 22 distinct slugs, and they
carry their own `color`. Every colour will be measured against the label before it ships; the
palette has an eight-failure history and these have never been checked.

**About** is `translations.en.description`, which is EditorJS. Measured across all 181 rows:
**only `paragraph` blocks, only a `text` field, no inline HTML, 1–2 blocks, 11–148 words**
(median 61). **[measured]** So the renderer is `blocks.map(b => <p>{b.data.text}</p>)` with no
HTML parsing and no sanitiser — the text is rendered as text, which is both correct and safer
than trusting that no markup will ever appear.

### The gallery — the frame is drawn for a catalogue we do not have

The frame shows a large image and a **six-thumbnail strip**. Actual distribution of distinct
images per place (`hero_image_url` plus `gallery`, deduped — the hero is never inside the
gallery): **[measured]**

| images | places |
|---:|---:|
| 0 | **108** |
| 1 | 14 |
| 2 | **45** |
| 3–5 | 12 |
| 6 | 1 |
| 7 | 1 |

**Two places in the entire catalogue have six or more.** The common cases are none and two.

So the gallery is built for what exists:

- **0 images (108 places)** — no gallery at all. The page leads with the title block and the
  fallback treatment from §1 as a wide banner: gradient ground, category icon, and the
  `short_description` given room. Not an empty frame, not a placeholder graphic.
- **1 image (14)** — the image alone, full width. No thumbnail strip, because a strip of one
  is a control with nothing to control.
- **2 or more (59)** — main image plus a strip of the rest. The strip holds however many there
  are, up to seven; it is not padded to six.

Thumbnails are real `<button>`s with `aria-pressed`, arrow-key navigable within the strip, and
the main image is announced on change. The strip is a horizontal scroller and uses
`scrollByInline` — which phase 2 found to be direction-broken and fixed, so it gets exercised
both ways along with the filter rows.

---

## 4 · Deep links do not resolve today — verified, not assumed

Phase 1 flagged this. I built the current tree and ran it under `wrangler dev`:

```
/                        HTTP 200
/privacy                 HTTP 200
/place/nissi-beach       HTTP 404      ← a real, valid slug
/explore                 HTTP 404
/explore?region=paphos   HTTP 404
```

That is phase 1's Q4 ruling working as designed: `not_found_handling: "none"` plus a Worker
that 404s everything the asset layer does not match. Every route must be prerendered or
explicitly handled. **Neither new route works until this changes**, and a direct load of a
shared place link is the common case.

**Proposal — prerender, with an SPA fallback behind it:**

1. **Prerender `/explore` and all 181 `/place/<slug>` pages** at build time. The prerender
   script already loops a route list; it gains a fetch of the catalogue (one request, 232 ms)
   and 181 more entries. This is the same argument phase 1 made for prerendering at all, and
   place pages are the site's only substantial indexable content — 181 pages of real editorial
   prose. Cost: about 3 MB in `dist`, and a build-time dependency on Supabase being reachable.
   If the fetch fails the build **falls back to the static routes only** rather than failing,
   and logs it loudly.
2. **Add an SPA fallback for `/place/*` in the Worker.** A place published in Directus after
   the last deploy has no prerendered file; without this it would 404 until someone deploys.
   With it, the client renders it.
3. **The cost of (2): a bad slug returns HTTP 200** with a client-rendered 404 — a soft 404,
   which phase 1 deliberately avoided everywhere else. Mitigated by having the 404 view set
   `<meta name="robots" content="noindex">`, and bounded by the fact that the 181 real slugs
   are prerendered and return proper 200s.

The alternative to (2) is a generated slug manifest the Worker checks, which gives real 404s
but breaks newly published places until the next deploy. I think a shared link to a
just-published place matters more than the HTTP status of a typo. **→ Q4.**

---

## 5 · English names and descriptions inside a translated page

`translations` carries **`en` only on all 181 rows** — no `pl`, `de`, `el` or `sv`.
**[measured]** Region names and category names *are* translated; place names and prose are not.

On a card this is easy to miss. On a detail page it is the whole page: a Polish visitor gets
Polish chrome, a Polish region pill, Polish category and badge names, and an English title and
English prose.

**How I am handling it:** the English content is marked as English rather than pretending.
The title, the `short_description` and the About section get `lang="en"` on their elements when
the interface language is not English. That is three lines, it costs nothing visually, and it
is what the attribute is for — a screen reader switches voice instead of reading English with
Polish phonemes, and a browser's translate offer becomes accurate.

What I am **not** doing: machine translation, a "translation unavailable" notice on every page,
or hiding the page in other languages. The content is real and useful in English; the honest
thing is to label it, not apologise for it. Already in `PARKED.md` as a content gap owned by
Directus, and it is on the critical path for a sixth language.

---

## 6 · The homepage becomes clickable

`PlaceCard`, `SavedPlaceCard` and the category tiles become links:

- place cards → `/place/<slug>`
- category tiles → `/explore?interest=<slug>`

Phase 2's deliberate non-interactive treatment is removed: `<article>` becomes `<a>`, the
`cursor: default` goes, and each card gains hover, a visible focus ring and a place in the tab
order. The card's accessible name becomes the place name plus its region, so a link list is
navigable — "Nissi Beach, Ayia Napa & Protaras" rather than twenty links called "Beaches".

The rail scroller keeps its `tabindex="0"` and `role="group"`: it is still a scrollable region,
and now its contents are focusable too, which is the normal case that pattern is written for.

`ContinueTripCard`'s Continue button stays inert — the trip surface is still phase 4 — and the
header nav stays inert except that **"Explore Now" now has a destination** and becomes a real
link, in the header, the drawer and the footer, and on the hero's Explore Now option card.
That removes four of the seven remaining "Coming soon" labels.

**One thing not in your ship list that I want to raise rather than decide.** The detail page's
frame has a heart, and `PARKED.md` says in as many words that the place page is what unparks
Saved Places. `saved_places` has full owner-scoped DML for `authenticated`, and the app's
`savePlace`/`unsavePlace` are proven. It is about twenty lines, and without it phase 2's Saved
Places rail can never populate — it is a rail that cannot be reached by any path. **→ Q5:
build the save button, or leave the rail unreachable for another phase?** My view: build it.

---

## 7 · Parked

Each with what unparks it, added to `docs/PARKED.md`:

- **The map** — both the detail page's panel and Explore's List/Map toggle. Entry 50 rules
  Mapbox for the app; the web SDK is a separate integration with its own key and billing, and
  the owner has ruled it separate work. Unparked by that decision and a key.
- **The Virtual Tour panel** — `virtual_tour` null on 181 of 181, and Stripe off, so the panel
  would be a locked upsell for content that does not exist. Structured like the homepage tours
  rail: it renders when a place has a tour, and nothing appears until then.
- **Everything booking** — the "Book directly" button and the Tours / Hotels / Activities tabs.
  `affiliate_routes` is empty in both Directus and Supabase, so every resolution returns
  `unavailable`. Same entry records that **CJ rotates its redirect host across four domains and
  only `anrdoezrs.net` is allowlisted** — backend work, but it belongs with the booking park
  because it is the next thing that breaks when routes are finally authored.
- **"Best time to visit"** — no field exists (§3).
- **The six-thumbnail gallery** — the design is drawn for a photo density the catalogue does
  not have (§3). Unparked by photography, not code.

---

## 8 · Disagreements and open questions

| # | Question | My recommendation |
|---|---|---|
| **Q1** | Explore's renderable rule: published (C), or published + scored (B)? §0 | **C.** B leaves Food, Nightlife and Hidden Gems empty, because those categories are unscored as well as unphotographed. Rails stay on B |
| **Q2** | Show a result count on each filter chip, or plain chips? | **Counts.** Honest, free to compute, and better than disabling — a disabled chip hides that the category exists |
| **Q3** | "Best time to visit" — is a field coming, or is the section dropped? | Dropped for now; nothing to render |
| **Q4** | Deep links: prerender + SPA fallback (soft 404 on bad slugs), or prerender + slug manifest (real 404s, new places break until deploy)? §4 | **SPA fallback**, with `noindex` on the 404 view |
| **Q5** | Build the save (heart) button, unparking phase 2's Saved Places rail? §6 | **Build it.** Otherwise the rail is unreachable by any path |
| **Q6** | Explore card tag colour: phase 2's measured navy chip, or port the app's provisional per-category palette? | **Navy.** The app's map is explicitly provisional, and two of its three colours fail with white — `#71A850` measures **2.83:1**. Porting means inventing a third version of a palette that is already awaiting a designer |
| **Q7** | Region chips have no avatar source — `destination` carries no image. Text-only chips? | **Text-only**, the same call phase 2 made for Book with Pete's region chips |

**Two further notes, not questions.**

The frame tags Explore cards with *interest* names — "Lofou Village" as *Culture & Art* — but
places carry CMS categories, and Lofou is `villages`. Same taxonomy gap as everywhere else.
Cards will show the CMS category name, which is real data and translated.

The frame's own six-thumbnail gallery, its "67 results", its per-category tag colours and its
"Best time to visit" all describe a catalogue richer than the one that exists. That is not a
criticism of the design — it is the same gap `PARKED.md` has been tracking since phase 2, and
it is worth the owner seeing that it now shows up in four separate places on two screens.

---

## 9 · Constraint check

| Constraint | Held |
|---|---|
| Branch from `web-phase-2` | `web-phase-3`, to be cut from `69ceb90` |
| One interest map, not two | Explore reuses `interestCategories.ts` unchanged |
| Filters in the URL | `/explore?region=&interest=`, single-select backend slugs |
| Load More, not infinite scroll | A real button, focus moved to the first new card |
| Map, virtual tour, booking not stubbed | All absent, all in `PARKED.md` with unpark triggers |
| Real 404 for an unresolved slug | §4, with the soft-404 trade stated |
| Fallback card, not exclusion | §1, redesigned for grid density |
| Contrast measured, not trusted | Badge colours and every new pair, before shipping |
| RTL | Logical properties; the gallery strip and both filter rows exercised in both directions |
| No invented translations | New strings to `docs/TRANSLATION-QUEUE.md` in English |
| `TODO(contracts):` on hardcoded values | Interest map, Food & Wine categories, empty-state copy, result counts |
| **`.env` untouched** | Not created, not written, not deleted. The build was run with the variables passed inline, which `check-env.mjs` supports precisely so no file is needed |
