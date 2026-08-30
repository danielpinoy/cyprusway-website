# Parked

A record of things deliberately **not built yet**, and what would change the answer.

Not a backlog. Every entry is a decision that was made on purpose, with the trigger that
unparks it, so the reasoning survives the conversation it was made in.

Each entry: **what it is · why it is parked · what unparks it · who owns it.**

Measurements tagged **[measured]** were queried against the live project
(`knvjmsnwzskbageetbam`) on the date given, not taken from a document.

Started 28 August 2026, during phase 2 planning.

---

## Unparked

Entries that were parked and have since been built. Kept, briefly, so the reasoning is not
lost the moment it stops applying — and so nobody re-parks them.

### The place detail page — built in phase 3

Parked through phase 2 because no Figma frame existed. Frame `3487-21941` arrived with the
phase-3 brief and the page is now at `/place/<slug>`: title, region, gallery, features,
About, and a Popular rail.

What it took with it: every card on the homepage was deliberately non-interactive because
a dead click is worse than an honest static card. They are links now — `PlaceCard`,
`SavedPlaceCard` and the category tiles alike.

Three parts of that frame stayed behind and have their own entries below: **the map panel**,
**the Virtual Tour panel**, and **the Tours / Hotels / Activities tabs**. The page ships
Overview only, and with no tab bar — a tab bar with one tab is chrome that explains nothing.

### Saved Places has no way to create a row — built in phase 3

The rail has queried `saved_places` since phase 2 and has never had anything to show,
because saving is a place-page action and there was no place page.

The place page now carries a save button, so the rail is reachable: sign in, open a place,
save it, and it appears on the homepage. The button is hidden entirely for a signed-out
visitor rather than shown and then refused — `saved_places` has no policy for `anon`, so
offering it would be an invitation to a 42501.

### Ask Pete on web — built in phase 4

Parked through phases 1 to 3 as "no destination". `/ask-pete` now exists, and the header,
overlay-menu and footer entries point at it — three more "Coming soon" labels gone. The
homepage hero's ask box is a real input that hands the question straight to Pete.

What came with it, and what did not: the screen is the shared thread (`ai_conversations` is
UNIQUE (user_id), so the web continues the phone's conversation and the counter is the same
counter), the place chips are real links into the 181 place pages, and the streaming reader
is written properly rather than ported. The upgrade path and the composer's `+` are below.

**The streaming half is not verified.** The transport was probed against the deployed
function and every auth-failure shape is confirmed, but no signed-in stream has been driven
— that needs a real user JWT, and none was held. Nothing about it should be described as
confirmed until the first signed-in run.

**Two things the backend fixed the same day, so nothing here mirrors a server number.**
`mike` now sends `daily_cap` and `quota_day` on `meta` and on the 429, and migration 0047
moved both daily limiters to the Cyprus calendar day. The web reads both off the wire and
computes neither — in particular it never derives "today in Cyprus", which decision-log
entry 64 lists as the first item in that change's blast radius. Absence of either field is
treated as unknown rather than as five or as today.

### What phase 3 deliberately did **not** unpark: "View All" on the rails

Phase 2 removed the frames' five "View All" links because they had nowhere to go, and wrote
that they "come back as a real link when the browse surfaces do." Explore is now that
surface, and they have still not come back — on purpose, because only some of them can go
there honestly.

*Food & Wine Picks* maps to `/explore?interest=local_food` and *Popular at the moment* to
`/explore`. *Top Recommendations* does not map to anything: it is a personalised ranking, not
a filter, and no Explore URL reproduces it. A "View All" on three rails and not on the fourth
needs a designer to say whether that reads as deliberate or as breakage.

**What unparks it.** A ruling on which rails get one. The links themselves are one line each.

**Owner.** The owner.

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


### The frames assume content that does not exist — four places, two screens

**What.** Across the Explore and place-detail frames, four separate pieces of the design
describe a catalogue richer than the one in Directus. Collected here rather than scattered,
because together they are a single question about where content effort goes.

| The frame draws | The catalogue has | **[measured 28 Aug]** |
|---|---|---|
| A **six-thumbnail gallery** strip on the place page | **108 of 181 places have zero images.** 14 have one, 45 have exactly two, 12 have three to five. **Two places** have six or more | `hero_image_url` + `gallery`, deduped |
| **"67 results found"** on Explore | Nothing produces 67. Unfiltered is 181 published, 107 scored, 72 scored-and-photographed | |
| **Per-category tag colours** — gold Beaches, green Nature, navy Culture | Categories carry `{id, slug, icon, name}` and **no colour field**. Only badges have colours, and they are a different collection | The app hit this too and wrote a provisional map awaiting the designer |
| **"Best time to visit"** with a line of editorial copy | `translations.en` carries exactly three fields on all 181 rows — `name`, `description`, `short_description`. There is no best-time column anywhere on `places_sync` | |

**Why parked.** Each was built around rather than stubbed. The gallery renders 0, 1 or n
images instead of padding to six; the result count shows the real number; tags use the
measured navy chip rather than a third copy of a provisional palette; and the best-time
section is not rendered at all.

**What unparks them.** Photography for the gallery — it is the same backlog as the hero
images. A designer's tag palette, which the app is also waiting on. And a CMS field plus copy
for best-time-to-visit, which is a content decision before it is a schema one.

**Owner.** Content and design.

### Explore is a catalogue, the rails are a ranking — do not "fix" the inconsistency

**What.** Two different renderable rules, on purpose:

- **The homepage rails** show `published AND prominence IS NOT NULL`. A rail puts four or six
  places above the whole catalogue; an unscored place has no claim to that slot. The score
  *is* the ranking.
- **Explore** shows `published`, full stop, ordered by prominence nulls-last. It is the
  surface whose job is "show me what exists". `status = 'published'` is the editorial signal
  that a place is ready to be seen; `prominence` is an ordering signal that 74 rows are still
  waiting for.

**Why this is recorded as a decision rather than left to be discovered.** It looks like an
inconsistency and it is not, and the obvious "cleanup" in either direction is wrong:

- Making Explore require a score hides **37 tavernas, 10 bars and 7 nightlife venues** —
  every one of them unscored *and* unphotographed — and returns Food, Nightlife and Hidden
  Gems to zero results. **[measured 28 Aug]**
- Dropping the score requirement from the rails puts unranked places in a four-card rail
  called Top Recommendations.

**What unparks it.** Scoring the remaining 74 places makes the two rules converge on their
own, at which point the split stops mattering and can be collapsed.

**Owner.** Web. Recorded 28 Aug when Explore was built.

### The map — Explore's List/Map toggle and the place page's map panel

**What.** Both frames carry a map: a full-width panel on the place page, and a List/Map
toggle above Explore's grid.

**Why parked.** Decision Log entry 50 rules Mapbox for the app, but the web SDK is a different
integration with its own key, its own billing and its own bundle cost, and the owner has ruled
the web map separate work from the mobile one.

Explore ships **List only, with no toggle** — a toggle with one reachable option is not a
toggle, and a disabled "Map" is a control whose only function is to say it does not work. Same
argument that removed phase 2's five inert "View All" labels. The place page simply has no map
section.

**What unparks it.** A decision on the web mapping provider and a key.

**Owner.** Product, then web.

### The Virtual Tour panel on the place page

**What.** The frame draws a panel with a tour still, a play control and a gold "Get Premium
Access" button.

**Why parked.** `virtual_tour` is null on 181 of 181 published places and Stripe is off, so
the panel would be a locked upsell for content that does not exist — the worst of both. Not
greyed out and not labelled "coming soon": absent.

**What unparks it. Itself.** Structured like the homepage tours rail: the panel is built and
renders when a place has a tour. The day a tour row lands, it appears with no code change —
and the paywall question becomes live at the same moment, which is a separate ruling.

**Owner.** Content for the tours; product for the paywall.

### Everything booking — and the CJ redirect hosts

**What.** The place page's "Book directly" button and its Tours / Hotels / Activities tabs.

**Why parked.** `affiliate_routes` holds zero rows in both Directus and Supabase, so every
route resolution returns `unavailable`. The page ships Overview only, and **with no tab bar** —
one tab is not a tab bar.

This is the same park as the homepage's Book with Pete card, which is built with its Continue
disabled for the same reason.

**What unparks it.** Authored, territory-approved rows in `affiliate_routes`.

**And the thing that breaks next, recorded here because it belongs with this park:** CJ
rotates its redirect host across `anrdoezrs.net`, `dpbolvw.net`, `tkqlhce.com` and
`jdoqocy.com`, and `book-with-pete-route`'s `HOST_ALLOWLIST` admits only the first. The moment
routes are authored, any route CJ serves from one of the other three returns
`unavailable / invalid_target_url`. Recorded in `CyprusWay_Decision_Log_v3_0.md:1289` and
still open. See also `docs/BACKEND-HANDOFF.md` §4.

**Owner.** Content for the routes; backend for the allowlist.

---

### "Unlock Unlimited" — the upgrade path, in two places on the Ask Pete screen

**What.** The frames put it twice on one screen: a gold underlined link with a padlock at
the end of the counter row, and the primary gold button inside the limit-reached banner
(`3558-17951` and `3571-37223`).

**Why parked.** `stripeEnabled` is false. There is no purchase to make, so both are
absent — **not rendered disabled**. A dead gold call to action on the one screen where
somebody has just been told they have run out is worse than no call to action at all.

**What unparks it.** Stripe being enabled.

**Read this before rebuilding it, because two things are easy to get wrong.**

1. **The limit state is the design's intended conversion moment.** It is not a leftover to
   rediscover; it is where the frame does its selling, and it is the first thing to revisit
   when there is something to sell. Phase 4 kept the *message* and dropped the *action*, so
   what is there now is deliberately only half of what was drawn.
2. **Do not restore the gold-and-white treatment. Measure it.** The banner as drawn is
   white on `--cw-gold`, which is **2.63:1** and fails at any size — the tenth instance of
   the family that has produced every contrast failure this project has found. The button
   inside it, on `#816717`, measures 5.40 and is fine. `scripts/check-contrast.mjs` will
   now refuse an unmeasured gold surface, so this cannot come back silently.

**Owner.** Product, then design.

### The composer's `+` — drawn, undefined

**What.** A 32px `--cw-grey-1` circle with a Carbon Add-Large glyph at the inline start of
the Ask Pete composer's action bar.

**Why parked.** Nothing says what it does. There is no handler or variant in the frame; the
app's composer has one control and has never had a plus; and `mike` accepts exactly
`message` and `place_id` and **400s on any other key**, so there is no request shape an
attachment could travel in. Building an upload behind it would be inventing a capability
the backend refuses.

**The one plausible reading, not acted on.** It could be the place-context affordance —
"ask Pete about this place" — which would attach `place_id`. That mechanism is real, is
verified before the daily allowance is consumed, and would make `meta.places` populate on
the echo path as well as through retrieval. It would also give the place page a route into
Pete. But it is a guess, and the brief's answer was that the owner does not know either.

**What unparks it.** A defined behaviour. If it is attachments, it needs a backend first.

**Owner.** Design.

### `retrieval_state = 'failed'` is silent, and the client is the wrong place to fix it

**What.** `failed` means retrieval was attempted and did not complete. Four paths in `mike`
produce it, all of them returning null out of `runRetrieval`:

| path | log line |
|---|---|
| the embedding call returned a non-2xx | `retrieval embed failed: HTTP <status>` |
| the embedding call threw or hit its 1500 ms abort | `retrieval embed error: <e>` |
| `match_places_pete` lost its 1000 ms race | `retrieval rpc failed: timeout` |
| `match_places_pete` returned an error | `retrieval rpc failed: <message>` |

All four are `console.error` in the edge function, so they are in the Supabase edge logs
and nowhere else. On the row it appears as `retrieval_state = 'failed'` with
`retrieved_place_ids` **null** — distinct from `empty`, which is `[]`.

**Why it matters more than the missing chips.** A failed retrieval is not a cosmetic gap:
the answer was generated **ungrounded**, and ungrounded is the state in which Pete has been
recorded inventing a CyprusWay listing that does not exist ("Stin Yialo Tavern", checked
against all 181 rows). The chips are the symptom; the grounding is the loss.

**The observed cause is cold start.** The backend's own probe records two silent failures in
one day, both "the first request after an idle period, against a 1500 ms embed and 1000 ms
RPC budget", and notes that the injection rate is therefore "understated by an unknown
amount". A third instance has since been seen from the web. The embedding call is the first
outbound request after a cold boot, and the deploy report measured cold TTFB at 3831 ms
against 1180–2463 ms warm.

**Why not surface it in the interface.** A reader cannot act on "retrieval failed", and no
honest copy exists for it — "this answer may be less grounded" is worse than silence.
Distinguishing it client-side would also mean reading `retrieval_state` on every restored
turn to render nothing. It belongs where the rate is countable: an alert on the `failed`
share, and a look at whether the two budgets are too tight for a cold start.

**What unparks it.** A backend decision on the timeouts, and a `failed`-rate alert. The
client already treats null and `[]` identically and cannot throw on either — proved by
`toPlaceIds`, which exists as a named pure function for exactly that reason.

**Owner.** Backend.

### Whether a turn retrieved anything is only visible as chips

**What.** `meta.places` arrives once, with the turn. `ai_messages` persists the same
decision as `retrieved_place_ids` (0027) and `retrieval_state` (0042) — `injected`,
`empty`, `disabled`, `failed` or `place_context` — and the row owner can read both. The web
now restores chips from `retrieved_place_ids` on load, so an answer that retrieved keeps
its links; but it does not, and should not, show a reader *why* an answer has no chips.

**Why that is worth writing down.** Retrieval is the minority outcome: the backend's own
post-deploy run measured **3 `injected`, 7 `empty` across ten live turns**. So "Pete named a
place and there is no chip under it" is the normal case, not a symptom — the model answers
from general knowledge and the retriever found nothing within 0.45. Before chips were
restored on load, that state was indistinguishable from a client bug, and one reported
sighting cost a round of investigation to tell apart.

**What unparks it.** A dev-only inspector reading `retrieval_state`, in the shape of phase
2's `?debug=rank`. Not built: it would be the fifth thing on this screen and the question it
answers is now visible from the chips themselves on any reload — except for `failed`, which
has its own entry above and is not the client's to report.

**Owner.** Web, low priority.

### The daily counter before the first turn of a session

**What.** On a cold open the web reads `ai_queries_today` and `ai_queries_reset_at` off
`public.users`, because `mike` reports the allowance only at the end of a turn and there is
no read-only quota endpoint. `ai_queries_reset_at` names the Cyprus day a count belongs to,
but nothing on the wire has yet said which day it is *now* — so the count is shown and
marked uncertain, and an uncertain count deliberately does **not** disable the composer.

**Why that is the right way round, and not a gap to close by computing the day.** The two
errors are not symmetrical. Locking somebody whose Cyprus day has already rolled over
strands them until they reload. Letting somebody at the cap press send costs a refusal the
server makes before it spends anything, returns their question to the box, and carries the
`quota_day` that makes every later read certain. The uncertain window is one request long
and closes itself.

**What would close it properly.** A read-only quota endpoint, or `quota_day` reachable
without spending a turn. Neither exists, and calling `consume_ai_query` to find out would
spend an allowance to display it.

**Owner.** Backend, and low priority — the current behaviour is correct, just briefly
unconfident.

### The contrast check has failed open twice — first CRLF, then byte 0

**What.** `scripts/check-contrast.mjs` has two jobs: re-derive every `contrast:` annotation,
and refuse gold in a text or boundary role that has no annotation *in its own rule*. Job 1
has never been wrong. Job 2 has been wrong twice, both times in the same way, and both
times the run kept printing a coverage number that read like assurance.

**Round one — the blank line that CRLF hid.** The second job located a rule's block by
searching backwards for a blank line. Git checks this repository out with CRLF on Windows,
so a blank line is two CRLFs and the search never matched. The fallback was byte 0, which
turns "no blank line found" into "the block is the whole file" — so any file containing one
annotation anywhere passed for all of its gold. It still caught a file with *no* annotation
at all, which is how the first sweep found 24 unmeasured declarations and two shipped
failures; what it could not catch was a rule with no annotation in a file that had one
elsewhere, and that is exactly what it missed: `.starter:hover` in the Ask Pete thread, a
gold border at 2.63 on the chip and 2.32 on the ground behind it.

**Round two — the same byte 0, one search along.** Line endings were normalised at read
time and that half held. The other half of the fix was recorded here as "the fallback now
fails closed", and it was not: `enclosingBlock` still answered `0` when the backwards scan
for the enclosing `{` found nothing, and still answered `0` when there was no blank line
above the selector. Two ways in, both live. A fixture with un-annotated gold outside every
rule passed, and so did an un-annotated gold rule written directly beneath an annotated
one with no blank line between them. Brace counting also read braces inside comments as
real, and the role scan read `color:` written in prose as a declaration.

**What is actually fixed, 28 August 2026.** Comments are blanked to spaces of equal length
before anything counts a brace or matches a role, so offsets and line numbers still line up
while prose stops being parsed as code. `enclosingBlock` returns **null** when a declaration
is not inside a rule, and the caller reports that rather than waving it through. The
preamble walk stops at the end of whatever precedes the selector — the previous rule's `}`,
a `;`, or the enclosing `{` — so a rule can no longer reach back into the rule above it for
an annotation. The rule is now written at the top of the function: *a search that fails
narrows the region or returns null; it never widens it, and byte 0 is never a fallback.*

**And a guard, because prose here did not stop round two.** The shapes that got through are
nine fixtures inside the script. They run on every invocation, before `src/`, against the
real checker; if the checker stops catching them it cannot report a pass, and the failure
names the shape. Verified by reintroducing the byte-0 fallback: the guard fails, and the
coverage line is never printed.

**What it caught in the tree: nothing.** Re-run over all of `src/` after the fix — 138
annotations re-derived, 44 gold declarations all measured, identical to the run before it.
The hole was real and both fixtures went through it, but no file in the repository was
using it. This fix removes a place for the eleventh failure to hide; it did not find one.

**Coverage, and why the old number was stale.** 138 and 44, measured 28 Aug 2026. The 58
and 32 recorded here previously were a phase-4 run and were never updated as phase 5 added
its stylesheets — the growth is new CSS, not newly measured CSS.

**Owner.** Web — done, recorded because a fix declared here twice was only half made the
first time, and the coverage number said nothing about it either way.

### Chrome does not re-map logical border radii when `dir` changes at runtime

**What.** `I18nProvider` sets `document.documentElement.dir` when the language changes, so
a future RTL language flips direction without a reload. Measured in Chrome on the Ask Pete
thread, 28 Aug 2026: after flipping `dir` to `rtl`, the layout mirrors correctly — flex
order, the avatar side, `padding-inline`, `max-inline-size` — but `border-start-start-radius`
keeps its LTR mapping, so a bubble's square corner points away from its speaker.

**It is a stale-cascade artifact, not a CSS mistake.** Proven three ways in the same page,
at the same moment, with `direction: rtl` computed on the element:

```
existing stylesheet rule   border-start-start-radius: 0  ->  top-LEFT   (wrong)
inline style, same decls   border-start-start-radius: 0  ->  top-right  (correct)
NEW stylesheet rule        border-start-start-radius: 0  ->  top-right  (correct)
```

A rule parsed while the document was LTR keeps the mapping it was given. A rule parsed
after the flip is correct — so a page **loaded** in an RTL language is fine, and only a
runtime switch is affected.

**Why it matters.** It is not limited to these bubbles: it applies to every logical
longhand already in a stylesheet, across four phases of CSS written specifically so RTL
would be a language file rather than a rewrite.

**What unparks it.** Adding an RTL language. The likely fix is one line — reload the page
when the *direction* changes, as opposed to the language — since switching between an LTR
and an RTL language is a different layout rather than a repaint. That is a phase-1
behaviour change and was not made unilaterally in phase 4.

**Owner.** Whoever adds Hebrew.

### Print/Download PDF is premium-only, and premium is unreachable on the web

**What.** `trip-pdf` is deployed and does the job: `POST { itinerary_id }`, no LLM and no
API spend, returning `application/pdf` bytes. **The app has never called it.**

**Why it is nearly parked.** It is gated on `users.is_premium` — a non-premium caller gets
**403 `premium_required`** — and `stripeEnabled` is false, so nobody can become premium on
the web. The button is therefore rendered **only for an account that already is**, and is
absent otherwise: the same treatment phase 4 gave "Unlock Unlimited", for the same reason.
Premium accounts do exist, so it is not dead code.

**What unparks it fully.** A purchase path. Nothing about the endpoint needs to change.

**Owner.** Product.

### The paywall sheet — drawn, and every claim on it is false

**What.** Figma `3603-17982` (`01-premium`): a gold sheet with a crown, "Let CyprusWay plan
your days", three benefit rows, a "CyprusWay Premium €4.99 / month" card over the words
"One Time Payment", and a Continue button. It is the screen the AI Trip Planner's premium
gate would open onto.

**Why parked.** There is nothing to buy. `stripeEnabled` is `false`,
`create-checkout-session` still returns buyers to `/premium.html` and
`/premium-success.html` — both deleted in phase 1 — and there is no premium route on this
site. A Continue button here cannot lead anywhere. Phase 6 ships the honest explanation
instead: what Premium unlocks, stated truthfully, and that it is not on sale here yet, with
**no call to action**. The same call phase 4 made for "Unlock Unlimited", for the same
reason — a dead gold button on the screen where somebody has just been told no is worse
than no button.

**Read this before rebuilding it. All four claims on the sheet are wrong** *[measured
30 Aug 2026]*:

| the sheet says | what is true |
|---|---|
| "All 25 full 360° tours, every aerial preview" | `places_sync.virtual_tour` is null on **182 of 182** rows. There are none. The app removed this line on 21 Aug for exactly this reason |
| "Drawn only from our 87 curated places and 37 vetted restaurants" | **181 published, 146 plannable, 37 restaurants.** 87 is the placeholder figure already dropped from this site's hero |
| "€4.99 / month" above "One Time Payment" | It is **one-time**. Two different products in one card |
| "a complete day-by-day plan in about ten seconds" | **median 22 s, worst measured 57.4 s** (n=14). The app's own loading screen repeats the error as "about 15 seconds" |

**What Premium actually unlocks — three things, and none of them tours:** trip generation
at three per Cyprus day, `trip-pdf`, and unlimited Ask Pete.

**Do not name a price when it comes back, unless it can be charged.** €4.99 is the App
Store product's price; the Stripe price comes from a secret and has never taken live money.
A price the visitor cannot be charged is the same class of error as the other four claims.

**And do not restore the gold ground.** The sheet paints its body copy in grey on
`--cw-gold`, and its heading in near-white:

    contrast: #ffffff on #c49a10 = 2.63 (rejected)
    contrast: #f5f0e8 on #c49a10 = 2.32 (rejected)
    contrast: #1b1c21 on #c49a10 = 6.46

Copy on gold is `--cw-black-1`, the ruling phase 1 made for the gold button's label.
`scripts/check-contrast.mjs` refuses an unmeasured gold surface, so this cannot come back
silently.

**What unparks it.** The Stripe rail switched on with a landing route — the three steps are
already written down in `BACKEND-HANDOFF.md` §1. The parked flag-conditional free cap
(`cyprusway-directus/docs/reference/curated/free-cap-flag-scoping-2026-08-30.md`) does
**not** unpark it: it would let free accounts generate, which removes the reason to show a
paywall rather than giving it a button.

**Owner.** Product, then design.

### The AI edit drawer — "Edit trip using AI" has no endpoint

**What.** Figma `3605-18809`: a sheet over the trip editor with a free-text field —
"Tell Pete anything specific, e.g. travelling with a toddler, need wheelchair access,
celebrating…" — a `+` and a send button.

**Why parked.** Nothing behind it exists. The project has eleven deployed functions and
none takes free text over an itinerary. `trip-edit` is deterministic **by design** and says
so in its own contract: *"Not the AI edit box. The designer's natural-language edit stays
parked."* `regenerate-day` was proposed and never built. The Blocked Register files
`08-edit-itinerary` as blocked. `mike` cannot stand in — its system prompt refuses trip
planning and redirects to the Trips tab. The app has no such screen either.

**What unparks it.** A contract. And when one is written, the open question is which
counter it draws on: `trip-edit` being **free and unlimited** is stated in its header as
load-bearing, and a paid sibling inheriting its skeleton would erode that.

**Owner.** Backend, to specify before anyone designs against the frame again.

### `trip-generate` has no timeout on either OpenAI call

**What.** Not phase 5's problem and recorded so it is not discovered by a future one.
`trip-edit` makes no model call at all, so the trip editor inherits none of this. But
`trip-generate` — which the web does not call and phase 5 deliberately did not build a
surface for — has **no timeout on either of its OpenAI calls**, which is worse than `mike`,
where the embedding at least aborts at 1500 ms. It also consumes `consume_trip_generation`
**before** the model runs, so a hang burns one of the day's allowance.

**What unparks a web generate screen.** Timeouts on both calls, and a decision about the
burn-on-failure. That is a backend conversation before it is a web one.

**Amended 30 August 2026 — the screen was built without either.** Neither happened, and
phase 6 built the generate screen anyway, on the owner's 30 Aug ruling to build and test
against the real gate as designed. **The backend debt is unchanged.** What stands in for it
on the client is not a fix and must not be mistaken for one:

- a **120 s** abort — above the measured maximum of 57.4 s (n=14, median 22) and below the
  platform's own per-request wall clock, so the client gives up roughly when the server
  would;
- a **polled** recovery re-query rather than a single shot (see the entry below);
- copy that states the spend on every failure path, with the remaining count read back from
  the row the RPC has just written.

A client-side abort does not stop the server, does not stop the OpenAI call, and does not
refund anything. It only stops this browser waiting. The generation is paid for the moment
the request clears `index.ts:1567`, which is why the screen offers no Cancel — offering one
would imply both.

**Owner.** Backend, still.

### The app's generation recovery fires one query into the race it is trying to resolve

**What.** Not a web defect — recorded here because phase 6 deliberately does not copy it,
and because it is live in the app today. `cyprusway-app`'s `startGeneration` aborts at 90 s
and calls `recoverOrFail`, which reads the newest `itineraries` row **once, immediately**,
and reports failure if it finds nothing newer than the pre-request snapshot.

**Why that is wrong.** The abort is exactly the moment the server may still be finishing:
`trip-generate` has no timeout of its own, `persistItinerary` runs before the response, and
a client abort does not cancel the handler. So the sequence is — client gives up at 90 s,
single query returns nothing, screen says *"No new trip appeared on your list"*, server
writes the row a second later. The user is told no trip was created by a query that was
fired too early to know, and the trip is sitting in their list.

It is a narrow window and it only opens on the slowest generations — which are exactly the
ones that reach the abort in the first place.

**What phase 6 does instead.** Re-queries at 0 s, 3 s, 8 s and 15 s before concluding
anything, and only then shows copy that stays conditional: *"if the plan finishes it will
be in My Trips."* Four indexed reads of the caller's own rows.

**What unparks it.** Nothing here — the web is already right. The entry exists so that
whoever next opens `tripPlanner.ts` knows the one-shot is a bug rather than a simplification,
and so the app's copy (*"We looked — no trip was created, so retrying is safe"*) is not
trusted on the timeout path, where it is a claim the single query cannot support.

**Owner.** App.

### `trip-edit` validates the request shape before it authenticates

**What.** A request with a valid project **anon key** as the bearer — no user session —
reaches the shape validation and gets specific, useful refusals back:

```
{"error":"invalid_request","detail":"unknown request keys: trip_end"}
{"error":"invalid_request","detail":"maximum trip length is 31 days"}
{"error":"invalid_request","detail":"unknown keys in days[0].pois[0]: start_time …"}
```

Only once the body is well-formed does it answer `{"error":"unauthorized"}`.

**Why it is recorded rather than reported as a defect.** No data crosses the boundary: the
itinerary read, the write, and every place lookup happen after authentication, and the
refusals describe the caller's own request rather than anything stored. It also made this
phase's contract verifiable without holding a token, which is a genuine benefit and is how
the time-picker question was settled from the server's own words.

**The other half is worth stating plainly:** error messages that name unknown keys with
their path are equally helpful to anyone mapping the API, and the anon key is public by
design. Whether ordering auth first is worth losing the diagnostics is a backend judgement,
not a client one — but it should be a judgement rather than an accident.

**Owner.** Backend, to decide rather than to fix.

### The travel line — the bus, the kilometres, and what is actually stored

**What.** The list frame draws two lines per leg: *"Take a bus · 3km away from last
location"* and *"Walk · 5 mins"*.

**Why parked.** Neither the bus nor the distance exists:

- `travel_mode` is `"car" | "walking"` (`trip-generate/types.ts`). **There is no bus**, and
  nothing anywhere plans public transport.
- **No distance is stored.** `travel_to_next_min` is minutes and is the only travel number
  on the element. Deriving kilometres from the stored coordinates would put straight-line
  distance where a reader expects road distance — the app measured that ratio at a median
  **1.46** and called it "a measured lie".
- Nothing calls a routing provider at request time, and `place_travel_times` has no client
  grant, so this is not something a client can fix.

The web renders the mode glyph and the minutes, and nothing else.

**Also not rendered, and this one is a subtraction rather than an impossibility.** Since
21 August the app uses that second line for the one thing the payload *can* prove: that a
stored drive does not fit the gap the schedule leaves for it, showing when the traveller
would really arrive. It measured 102 of 288 live legs. It is not ported, on the ruling that
a server-side reflow shipped on 24 August and the app's own note says the check "provably
returns null on every leg" of a freshly written trip — it survives for four populations the
reflow does not reach, of which the web can see two: the 34 itineraries stored before it
shipped, and legacy rows nobody has re-opened. Against that, the app warns that "two
implementations of a warning is two chances to warn wrongly", and the arithmetic is eighty
lines with three guards.

**What unparks it.** For the bus and the kilometres: a routing provider at request time and
a stored distance. For the overrun line: a web user reporting a pre-reflow trip whose times
look impossible.

**Owner.** Backend for the first, web for the second.

### The time picker in the add-to-trip panel

**What.** Frame `3429-16644` draws a "9:00 AM" chip under the selected day.

**Why parked.** `trip-edit` accepts POIs **by id only**. There is no field to send a time
in, and the deployed function says so in its own refusal — verified 28 Aug:

```
400 unknown keys in days[0].pois[0]: start_time
    (stops are sent by place_id only; times, legs and lunch are server-derived)
```

Where a stop lands is the packing rule: an appended stop starts when the one before it
ends, plus the leg between them. The app hit the same conflict and resolved it the same
way — *"Frame-vs-contract conflict, resolved in the contract's favour"* — and the web says
in one line what happens instead, rather than drawing a control that cannot be honoured.

**What unparks it.** `trip-edit` accepting a requested start time, which would mean the
packing rule taking a hint rather than owning the schedule. That is a scheduler decision,
not a client one.

**Owner.** Backend, and only if the product wants it.

### The trip map

**What.** Frame `3464-18946`: numbered pins, a route line following roads, day tabs and a
stop rail.

**Why parked.** The map itself has been parked since phase 3 — no tiles provider, no
decision on one. The route line is separately impossible: the app records that Mapbox
Directions forbids storing results, so every view would be a billable request, and that the
thin connectors drawn in the frame are decorative rather than a route.

**What phase 5 ships instead.** A placeholder **panel**, not a removed toggle. Unlike
Explore — where Map was a toggle on a list and dropping it cost nothing — this is a
designed screen with its own day tabs and its own stop rail, so removing the toggle would
delete a named destination. The tabs and the rail are real data and render; only the map
surface says what is missing.

**What unparks it.** A tiles provider, and a decision about the route line separate from it.

**Owner.** The owner.

### The search box in the add-to-trip panel — NOT parked, and why the distinction matters

Recorded because it was parked in the brief and unparked on inspection, and the reasoning
is worth keeping.

The frame's placeholder reads "Search places and experiences in Cyprus", which is the
catalogue-wide semantic search that has no client-reachable endpoint — migration 0028
revoked both vector RPCs to `service_role`. That search is still parked, in the header and
the footer, where it was parked in phase 1.

**This box is a different thing wearing the same word.** The panel has already loaded the
146 plannable places; the box filters a list in memory. It needs no endpoint, it is what
the app does at the same spot — *"the same plain, client-side substring match as Explore's
search, NOT the semantic search blocked on home. Do not conflate the two"* — and it is
about fifteen lines.

**Owner.** Done.

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

### The Pete illustration spells the brand "CUPRUSWAY"

**What.** `public/images/pete.webp` — the cat in the pith helmet — has **CUPRUSWAY**
embroidered on the hat, not CyprusWay. It is the design file's own asset (`3777:33828`),
an AI-generated illustration, and the misspelling is baked into the pixels.
**[measured 30 Aug 2026: exported at 3× from Figma and read]**

**Where it already ships.** The Book with Pete card on the homepage renders it at 108% of
the card height at ≥900px, which is large enough to read. The Ask Pete thread avatar
renders it at 40px, which is not. Phase 6 adds a third use — the trip planner's waiting
screen, at 220px — where it is legible again.

**Why it is recorded rather than worked around.** Cropping the hat out, shrinking the
illustration below legibility or dropping it from the loading screen would each hide a
brand-name typo rather than fix it, and it would still be on the homepage. It is one
regenerated or retouched asset, and every surface that uses it picks the fix up at once
because they all point at the same file.

**What unparks it.** A corrected illustration dropped in at `public/images/pete.webp`.
Nothing in the code changes; the app has its own copy of the same artwork
(`assets/images/trip-planner/pete-thinking.png`) and needs the same replacement.

**Owner.** Design.

### Hero images — 108 of 181 published places have none

**What.** 60% of the catalogue has no `hero_image_url`. **[measured 28 Aug]** By category:
**tavernas 0/37, bars 0/10, nightlife 0/7, amusement-parks 0/9, indoor-playgrounds 0/9,
parks-playgrounds 0/5, adventure-parks 0/3** — and `animal-parks` 1/6, `waterparks` 1/4,
`museums` 3/7.

The earlier estimate of 72 heroless rows understated it by half.

**Why parked.** Not a code problem.

**Phase 3 changed what it costs us, and the change is worth recording.** Through phase 2 the
rails drew from *hero-bearing* places only, on the app's reasoning that "a photo card without
a photo has no designed state, so the filter IS the placeholder." Phase 3 designed that state
— a sand-to-gold card carrying the place's own `short_description` and category — and dropped
the requirement. The photograph is no longer what decides whether a place can be seen.

That inverted the diagnosis. **Prominence, not photography, is the binding constraint.**
Of the 73 places with neither a score nor a picture, 37 are tavernas, 10 bars, 9
amusement-parks, 9 indoor-playgrounds, 7 nightlife and 1 museum — and dropping only the
photograph requirement surfaced 35 places and **zero tavernas**, because none of them is
scored either. Photographing the tavernas without scoring them changes nothing on the
homepage; Explore shows them today regardless, because it does not require either.

**What unparks it.** Photography, in Directus — but score first. Tavernas are 37 places and
the entire food half of the homepage, and they need a prominence value before a photograph
buys them anything there.

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

### 219 English-only interface strings

**What.** The rebuild has introduced 219 `ui_*` strings the vanilla dictionary never had —
62 in phase 1, 21 in phase 2 for the homepage rails, 30 in phase 3 for Explore and the place
page, 29 in phase 4 for Ask Pete, and 78 in phase 5 for Build My Trip, less one phase-1
string that was deleted rather than translated because it said Ask Pete was unavailable on
the web. They render English in all five
languages via the fallback the switcher already used.

**Pete's own replies are not in this count and never will be.** They are model output,
generated once in one language — `mike` reads `preferred_language` and tells the model to
answer in it — so there is nothing to translate and no key to add.

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

### `useDialog` steals focus when the parent re-renders — FIXED in phase 2

Kept because the entry outlived the bug and said so for three phases.

`useDialog` listed `onClose` in its effect dependencies while both call sites passed a
fresh arrow every render, so any parent re-render re-ran the whole open sequence: focus
pulled back to the dialog's first item, scroll lock removed and re-added. Phase 2 held
`onClose` in a ref and dropped it from the dependency array; the comment explaining why is
in `src/components/ui/useDialog.ts`.

Confirmed still fixed in phase 5, which needed it: the add-to-trip drawer's parent
re-renders on every pending-state change during a save, and an effect keyed on `onClose`
would have yanked focus to the first control on each one.

### Every stored time was displayed shifted by the reader's timezone — FIXED in phase 6

**What.** `formatTime` in `src/lib/tripDates.ts` built a `Date` with `Date.UTC(2000, 0, 1,
h, m)` and then formatted it with `Intl.DateTimeFormat` **without `timeZone: 'UTC'`**, so
the formatter rendered that instant in the reader's own zone. A stop stored at `09:00`
displayed as **11:00 AM** in Cyprus and as 4:00 AM in New York. Measured in the browser on
30 Aug 2026, Europe/Bucharest, against a real trip document.

The function's own comment said the opposite the entire time — *"the stored value is the
server's clock-of-day and carries no zone; it is displayed, never converted"* — which is
presumably why four phases of eyes passed over it. Prose is not a test.

`formatDayHeading` and `formatDate` had the same omission with the same cause. Their blast
radius is different and smaller: a date built at midnight UTC renders correctly everywhere
east of Greenwich and one day early everywhere west of it, so a trip dated 31 August read
"Sun, 30 August" to a reader in New York.

**Why it surfaced now.** It was always wrong, on every trip on the site. Phase 6 made it
matter more: a generated day starts at the profile's morning threshold — 08:00, 09:00 or
10:00 — so a Cyprus traveller was shown a plan starting two or three hours after the one
the server actually built, with lunch and every leg shifted with it. A hand-built trip's
times are equally wrong but nobody has an expectation to compare them against.

**The fix.** `timeZone: 'UTC'` on all three formatters. One option each. The `Date.UTC`
constructor is a way of saying "these components, no zone", and UTC is how you ask for them
back unchanged.

**What is not fixed, and is not a defect.** Which day counts as "Today" is still a
device-clock decision, deliberately, and matched to the app — `itineraries` carries no
timezone and the two clients agreeing matters more than either being right in isolation.
That is a different question from rendering a stored string.

**Owner.** Web — done. Recorded because the comment that described the correct behaviour
sat directly above the code that did the opposite, and because the app's own renderers
should be checked for the same shape.
