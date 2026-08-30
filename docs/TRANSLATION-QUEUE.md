# Translation queue — phases 1 to 6

The React rebuild introduces strings the vanilla dictionary never had. They ship in English
only, and the other four languages fall back to English — the same fallback the vanilla
switcher used, so nothing disappears; it just reads in the wrong language.

**Nothing here was machine-translated or invented.** A wrong translation is invisible; a
missing one is not.

---

## How to fill one in

Add the key to `src/i18n/strings/<lang>.ts`. It is type-checked against the English shape,
so a mistyped key will not compile and a missing one is simply not yet done.

```ts
// src/i18n/strings/pl.ts
export const stringsPl: Partial<Record<UiKey, string>> = {
  ui_header_signin: 'Zaloguj się',
};
```

No build step, no re-run of the port script — that only touches `src/i18n/generated/`,
which is the ported vanilla dictionary and is not edited by hand.

---

## What is already translated, and is not in this queue

**177 keys × 5 languages** were ported from `js/i18n.js` on the `web-onboarding` branch by
`scripts/port-i18n.mjs`. The shell reuses them wherever the design's string already existed,
rather than adding an English-only duplicate:

| Where it shows | Key | Note |
|---|---|---|
| Hero H1, auth card signup heading, footer tagline | `onb_signup_title` | The Figma's hero headline is word-for-word the onboarding card's, already in five languages |
| Header and menu "Ask Pete" | `nav_ap` | |
| Menu "Home" | `nav_home` | |
| Footer "About" link | `nav_about` | |
| Footer "Contact" | `footer_contact` | |
| Footer "Privacy Policy" / "Terms of Service" | `footer_privacy`, `footer_terms` | The Figma says "Privacy Notice"; the existing translated key says "Privacy Policy", which is also what the page is titled. Kept |
| Copyright | `footer_copyright` | Names Almisource LTD, the legal entity. The Figma's "CyprusWay" is wrong for a copyright line |
| All eleven interest chips | `onb_i_*` | |
| Auth card, both modes, both providers, both errors, all pending states | `onb_*` | |
| The whole About page | `about_*` | The one content page that was ever translated |

`privacy.html`, `terms.html` and `faq.html` carried **zero** `data-i18n` attributes, so
those three pages were English-only on the vanilla site too. Porting them as English is
parity, not a regression — but it does mean a Polish visitor reading the privacy policy
gets English, exactly as before.

---

## The queue — 318 keys, English only

Grouped by where they appear. Context matters more than the string for several of these,
so it is given.

### Chrome — 3

| Key | English | Context |
|---|---|---|
| `ui_skip_to_content` | Skip to content | First tabbable on every page; jumps to `<main>` |
| `ui_language` | Language | Accessible name of the globe control |
| `ui_coming_soon` | Coming soon | **Appended to the accessible name** of every navigation item whose surface does not exist yet, e.g. "Explore Now — Coming soon". Needs to read naturally after an em dash |

### Header — 12

| Key | English | Context |
|---|---|---|
| `ui_nav_explore` | Explore Now | Nav item, phase-2 surface |
| `ui_nav_my_cyprusway` | My CyprusWay | Nav item. **A product name — check whether it should be translated at all**; the app treats it as a feature name |
| `ui_nav_tours` | 360° Tours | Nav item |
| `ui_nav_build_trip` | Build My Trip | Nav item |
| `ui_nav_primary` | Main navigation | `aria-label` on `<nav>` |
| `ui_header_search` | Search | Accessible name of the disabled search control |
| `ui_header_saved` | Saved places | Accessible name of the heart, signed-in only |
| `ui_header_account` | Your account | Accessible name of the avatar, which opens the drawer |
| `ui_header_menu_open` | Open menu | |
| `ui_header_menu_close` | Close menu | |
| `ui_header_signin` | Sign In | **The gold button.** Keep it short — the header is tight below 480px, where the wordmark already drops to the logomark to make room |
| `ui_header_home` | CyprusWay home | `aria-label` on the logo link |

### Hero — 7

| Key | English | Context |
|---|---|---|
| `ui_hero_sub` | Explore hand-picked places, get personalised guidance from Pete, and build a day-by-day trip around the Cyprus you want to experience. | **Copy owed in English first** — see below |
| `ui_hero_ask_placeholder` | Ask me anything... | Placeholder of the disabled Ask Pete input |
| `ui_hero_explore_title` | Explore Now | Option card |
| `ui_hero_explore_desc` | Browse hand-picked places right away. No questions asked. | |
| `ui_hero_my_title` | My CyprusWay | Option card |
| `ui_hero_my_desc` | Tell us who you're travelling with, and we'll shape Cyprus around you. | |

### Overlay menu — 8

`ui_menu_title`, `ui_menu_search_placeholder`, `ui_menu_book_pete`, `ui_menu_my_trips`,
`ui_menu_saved_places`, `ui_menu_settings`, `ui_menu_logout`, `ui_menu_feedback`,
`ui_menu_report`

All are drawer rows except the first two. Every one except Log out is a phase-2 surface
and renders dimmed with the "Coming soon" suffix.

### Footer — 4

`ui_footer_search_placeholder`, `ui_footer_discover`, `ui_footer_about_heading`,
`ui_footer_faq`

The two headings are rendered uppercase by CSS, so translate them in sentence case.

### Command centre states — 6

| Key | English | Context |
|---|---|---|
| `ui_loading` | Loading | Visually hidden `role="status"`, announced once while the shell resolves |
| `ui_error_title` | Cyprus is still there | The full-page error takeover's headline. **Idiomatic, not literal** — it means "the island is fine, the page isn't" |
| `ui_error_body` | We just couldn't load it right now. Check your connection and we'll bring the island back. | **Must stay neutral** — never "something went wrong on our end". Apple rate-limits repeat sign-ins and returns its own failure before anything reaches us |
| `ui_error_reload` | Reload | |
| `ui_error_persist` | Keep happening? | Runs directly into the link below |
| `ui_error_report` | Report the problem | Link text; opens a mailto |

### 404 — 4

`ui_404_code` ("404" — do not translate), `ui_404_title`, `ui_404_body`, `ui_404_home`.
Copy carried over from the page this replaces.

### Cookie consent — 5

| Key | English | Context |
|---|---|---|
| `ui_cookie_text` | This site uses cookies for essential functionality and to track affiliate bookings. | Carried from the vanilla banner. **Legal-adjacent — have it checked, not just translated** |
| `ui_cookie_learn` | Learn more | Links to /privacy |
| `ui_cookie_accept` | Accept | |
| `ui_cookie_decline` | Decline | |
| `ui_cookie_label` | Cookie consent | `aria-label` on the region |

### Page metadata — 12

`ui_meta_{home,about,faq,privacy,terms,404}_{title,desc}` — the `<title>` and meta
description of each route.

**These are lower priority than they look.** Only English is prerendered, so search
engines only ever see the English metadata; translating them changes what a visitor sees
in their browser tab after the page has already loaded. If per-language URLs are ever
adopted (plan Q1), that changes and these become the first thing to translate.

### Homepage rails — 21, added in phase 2

| Key | English | Context |
|---|---|---|
| `ui_rail_previous` · `ui_rail_next` | Previous · Next | Accessible names of the rail's scroll chevrons |
| `ui_rail_top_recommendations` | Top Recommendations | Rail heading |
| `ui_rail_tours` | See Cyprus before you go | Rail heading. **Never renders today** — no 360° tours exist — so this is the lowest priority string in the file |
| `ui_rail_popular` | Popular at the moment | Rail heading. Deliberately *not* "trending" or "this week": nothing measures popularity, and the rail is a rotating slice of an editorial score. Do not translate it into something that claims recency |
| `ui_rail_food_wine` | Food & Wine Picks | Rail heading |
| `ui_rail_saved` | Saved Places | Rail heading, signed-in only |
| `ui_categories_title` | Categories | Section heading over the eleven interest tiles |
| `ui_home_ready` | Recommendations loaded | Visually hidden `role="status"`, announced once when the rails replace the skeleton |
| `ui_tour_badge` | 360° Tour | Pill on a tour card |
| `ui_trip_continue` | Continue | On the trip card. **Inert** — there is no trip surface on the web |
| `ui_trip_active` | Active trip | Pill on a trip that is running today |
| `ui_trip_day` | Day {current} of {total} | **Has placeholders.** `{current}` and `{total}` are substituted; put them where your language needs them, and keep both |
| `ui_trip_untitled` | Continue planning your trip | Fallback title when the trip row's name was blanked |
| `ui_trip_untitled_region` | Continue planning your trip to {region} | **Has a placeholder.** `{region}` is a translated destination name from the catalogue, e.g. "Ayia Napa & Protaras" |
| `ui_bwp_title` | Book with Pete | **Pete is a character name — do not translate it.** The app treats it the same way |
| `ui_bwp_lede` | Tell Pete what you need and get matched with the right local option | |
| `ui_bwp_question` | Where are you going? | |
| `ui_bwp_hint` | Choose one | **Changed from the design**, which says "Choose as many as apply". The API takes exactly one region, so the chips are single-select |
| `ui_bwp_continue` | Continue | Disabled — see below |
| `ui_bwp_unavailable` | Booking options aren't available on the web yet. | Sits under the disabled Continue. `affiliate_routes` is empty, so every possible answer today is "unavailable" |

### Explore — 14, added in phase 3

| Key | English | Context |
| --- | --- | --- |
| `ui_explore_title` | Explore Cyprus | The page's `<h1>`. Visually hidden — the filter rows are the visible top of the page — so it is read, not seen |
| `ui_explore_all_regions` · `ui_explore_all_interests` | All Regions · All Interests | The first chip in each filter row, the "no filter" state |
| `ui_explore_region_filter` · `ui_explore_interest_filter` | Filter by region · Filter by interest | Accessible names of the two chip rows. Never visible |
| `ui_explore_count` | {count} places | **Has a placeholder.** Shown when everything found is on screen |
| `ui_explore_count_partial` | Showing {shown} of {count} places | **Has two placeholders.** Shown while Load More still has more to give. Keep both, in whatever order your language needs |
| `ui_explore_load_more` | Load More | The button under the grid. Not infinite scroll — deliberately |
| `ui_explore_empty_title` | No {interest} in {region} | **Has two placeholders,** both filled with strings already in this file: an interest name and a translated destination name from the catalogue. This is a *true statement about Cyprus* — there are no beaches in the Troodos mountains — so it should read as a fact, not as an apology |
| `ui_explore_empty_title_any` | Nothing under {interest} yet | The same, with no region chosen |
| `ui_explore_empty_suggestion` | There is more to see under {interest} here. | **Has a placeholder.** Offers an interest that does have places in that region; the suggestion is computed from the catalogue, so it can never point at another dead end |
| `ui_explore_empty_untagged_title` | {interest} is not tagged on places yet | **A different empty state, about us and not about Cyprus.** `hidden_gems` reaches no CMS category, so it is empty everywhere. Saying "no hidden gems in Paphos" would be a lie; this says whose problem it is |
| `ui_explore_empty_untagged_body` | The other ten interests are. This one needs the places themselves to be tagged before it can show anything. | Follows the line above. "Ten" is a literal count of the other interests — if the vocabulary changes, this string changes |
| `ui_explore_clear` | Clear filters | |

### Place page — 11, added in phase 3

| Key | English | Context |
| --- | --- | --- |
| `ui_place_features` | Features | Heading over the badge chips. The CMS calls them badges; the page calls them features, because that is what the frame calls them and what they mean to a reader |
| `ui_place_about` | About {name} | **Has a placeholder.** `{name}` is the place's English name — place names are English on all 181 rows and are not translated |
| `ui_place_duration` | About {minutes} minutes | **Has a placeholder,** and "About" here means *approximately*, not *concerning* — a different word from `ui_place_about` in most languages |
| `ui_place_gallery` | Photos | Accessible name of the thumbnail strip |
| `ui_place_photo_of` | Photo {index} of {total} | **Has two placeholders.** The accessible name of one thumbnail |
| `ui_place_save` · `ui_place_saved` | Save this place · Saved | The heart button's two states. Signed-in only — `saved_places` has no policy for `anon`, so a signed-out visitor never sees it |
| `ui_place_save_failed` | We couldn't save this place. Please try again. | Under the button when the write fails |
| `ui_place_not_found_title` | That place is not here | A slug that does not resolve. Deliberately not "404" and not "Oops" |
| `ui_place_not_found_body` | The link may be out of date, or the place may have been withdrawn. Explore is a good place to start again. | Both causes are real: places are unpublished in Directus, and the page is also reachable by typo |
| `ui_place_not_found_cta` | Explore Cyprus | The link out. Same words as `ui_explore_title`, and they can stay the same words |

### Page metadata — 5 more, added in phase 3

| Key | English | Context |
| --- | --- | --- |
| `ui_meta_explore_title` | Explore Cyprus — CyprusWay | |
| `ui_meta_explore_desc` | Browse every place on CyprusWay by region and by what you like doing. | |
| `ui_meta_place_title` | {name} — CyprusWay | **Has a placeholder.** The `<title>` of all 181 prerendered place pages |
| `ui_meta_place_desc` | {name} — a place to visit in {region}, Cyprus. On CyprusWay. | **Has two placeholders.** Only used where the place has no `short_description`; where one exists, that is the meta description. Deliberately plain — inventing a superlative for a place nobody has written copy for would be worse than a flat sentence |
| `ui_meta_place_desc_any` | {name} — a place to visit in Cyprus. On CyprusWay. | The same, where the place has no region |

### Ask Pete — 29, added in phase 4

**Pete's own replies are not here, and will never be here.** They are model output. `mike`
reads `public.users.preferred_language` and instructs the model "Respond in {language}",
with all five of this site's languages in its own table — so a reply arrives already in the
reader's language, generated once, and there is no string to translate. The rule that
follows from that: **everything in this table is chrome around an answer nobody translated,
so the chrome has to be right.** If the interface is Polish and Pete answers in Polish, a
half-translated frame around it is more jarring than an English one.

Two related facts worth having in the same place. Pete also matches the language somebody
writes in, whatever their profile says, so a Greek question gets a Greek answer even on an
English interface. And since phase 4 the language switcher writes `preferred_language` for
a signed-in visitor — which is what makes the interface and Pete agree, and which also
changes the language of the app on their phone. The switcher says so.

| Key | English | Context |
| --- | --- | --- |
| `ui_pete_title` · `ui_pete_subtitle` | Ask Pete · Cyprus travel assistant | Page heading. **Pete is a character name — do not translate it**, the same rule `ui_bwp_title` follows |
| `ui_pete_greeting` | Hi! 👋 I am Pete — your local guide to Cyprus. What can I help with? | Client-side copy, never sent to the model. Shown only when the server confirmed an empty conversation — the thread is shared with the phone, so above a loaded one this would be a lie |
| `ui_pete_starter_1` · `ui_pete_starter_2` · `ui_pete_starter_3` | Best beach near me · What should I do tonight? · Know about Cyprus history or culture? | The three suggestion chips. **These are sent to Pete verbatim when pressed**, so they must read as a natural question in your language, not as a label |
| `ui_pete_counter` | {used} of {cap} today | **Has two placeholders.** `{used}` counts questions ASKED, not questions left — the frame's limit state reads "5 of 5" |
| `ui_pete_counter_label` | {used} of {cap} questions used today | The same, spelled out for a screen reader, because "4 of 5 today" alone does not say which number is which |
| `ui_pete_input_label` | Your question for Pete | Visually hidden label on the composer |
| `ui_pete_placeholder` | Ask Pete anything specific, e.g. travelling with a toddler, need wheelchair access, celebrating... | The examples matter more than the wording: they teach that specific questions work better. Adapt them if a direct translation reads oddly |
| `ui_pete_send` · `ui_pete_sending` | Send · Pete is answering | Accessible name of the send button, and the state while a request is out |
| `ui_pete_disabled_quota` | you have used today's questions | **A sentence fragment, deliberately** — it is appended to the send button's name after a dash, as "Send — you have used today's questions" |
| `ui_pete_said` · `ui_pete_you_said` | Pete said · You said | Visually hidden headings on every message, so a screen reader knows who is speaking without relying on which side of the column a bubble sits on |
| `ui_pete_open_place` | Open {name} | **Has a placeholder.** Accessible name of a place chip. `{name}` is a place name from the catalogue, already localised by the server |
| `ui_pete_signin_title` · `ui_pete_signin_body` · `ui_pete_signin_cta` | Pete needs a free account · Everything you save comes with you, on the web and in the app. · Create a free account | Replaces the composer for a signed-out visitor. `mike` refuses them outright, so this is the most common state this screen has |
| `ui_pete_err_quota` | That's all {cap} for today. Pete is back tomorrow — your question is still in the box. | **Has a placeholder,** and `{cap}` now comes from the server rather than from a constant, so the sentence cannot go stale if the cap changes. **Do not translate "tomorrow" into a time or an hour.** The reset is the Cyprus calendar day (migration 0047), and the interface names no hour on purpose — putting one in the copy would mean computing the next Cyprus midnight in the browser, which is the one thing the server sending `quota_day` exists to make unnecessary |
| `ui_pete_err_account` | Ask Pete needs a free account. Everything you have saved comes with you. | |
| `ui_pete_err_auth` | Your session expired. Sign in again to keep chatting. | |
| `ui_pete_err_invalid` | Pete couldn't read that one, so nothing was used. Your question is still in the box. | "Nothing was used" is load-bearing: the server refused this before spending a question, and saying so is what stops a benign refusal reading as breakage |
| `ui_pete_err_transport` | Couldn't reach Pete. Check your connection and try again. | |
| `ui_pete_err_server` | Pete is having trouble right now. Try again in a moment. | |
| `ui_pete_err_stream` | Pete stopped mid-answer. That one still counted, sorry. | Also load-bearing, in the other direction: the allowance is spent before the model is called, so this one really did cost a question. The apology is the honest part |
| `ui_language_shared` | Also changes the app | Under the language options, for a signed-in visitor. The switcher writes the shared profile row, so it changes Pete's language on their phone too — this line is the only warning |
| `ui_meta_askpete_title` | Ask Pete — CyprusWay | |
| `ui_meta_askpete_desc` | Ask a local guide about Cyprus — beaches, food, history and what to do tonight. | |

### Build My Trip — 78, added in phase 5

**Two things here are not translatable, and one of them is a new category for this file.**

`warnings[].message` from `trip-edit` is **server-authored English prose** — "day ends
21:17, after 20:00". It arrives with the response, is rendered as it stands, and is not in
this dictionary. It cannot be: the server composes each one per edit from values only it
holds. It is marked `lang="en"` where it renders. Pete's replies (phase 4) are also
untranslated, but they are at least *generated in the reader's language*; these are not.

The other is the stop sub-line, which is a CMS **category slug** with its hyphens replaced
("archaeological sites"). Stored trip elements carry no region, so the slug stands in where
the frame draws one — the same English-in-a-translated-frame situation as place names, and
consistent with it.

| Key | English | Context |
| --- | --- | --- |
| `ui_trip_setup_title` · `ui_trip_setup_sub` | Build My Trip · Plan a new trip | The setup screen. The frame prints the same subtitle on the *editor* screen, which is placeholder copy pasted from setup and is not used there |
| `ui_trip_signin_title` · `ui_trip_signin_body` | Trips need a free account · Your trips are the same on the web and in the app, so you can plan here and follow along there. | All three trip screens, signed out. The second sentence is the substantive one: a trip is one shared row, not a web copy |
| `ui_trip_name_label` · `ui_trip_name_placeholder` | Trip name · Enter trip name | |
| `ui_trip_region_label` | Select base destination | **Singular, though the frame's label is plural.** `base_location` is one text column |
| `ui_trip_dates_label` · `ui_trip_from` · `ui_trip_to` | Date range · From · To | |
| `ui_trip_span` | {count} days | **Has a placeholder** |
| `ui_trip_span_error` | A trip can be 1 to {max} days. | **Has a placeholder.** 31 is `trip-edit`'s structural cap, not a preference |
| `ui_trip_create` · `ui_trip_creating` · `ui_trip_create_failed` | Create a Trip · Creating… · That trip couldn't be created. Please try again. | |
| `ui_trip_list` · `ui_trip_map` | List · Map | The view toggle |
| `ui_trip_day_n` | Day {n} | **Has a placeholder** |
| `ui_trip_today` · `ui_trip_tomorrow` | Today · Tomorrow | Day-header tags. **The frames also draw "After Tomorrow"**, against dates that contradict it — placeholder sloppiness, not a spec, and there is deliberately no third label |
| `ui_trip_toggle_day` | Day {n} stops | Accessible name of the collapse control. Never visible |
| `ui_trip_remove_day` | Remove day {n} | **Has a placeholder** |
| `ui_trip_empty_day` | Nothing planned for this day yet. | An empty day is a real state — the server keeps it empty rather than inventing a lunch for it |
| `ui_trip_add_stops` · `ui_trip_add_day` | Add to Trip · Add Day | |
| `ui_trip_delete` | Delete Trip | Destructive; confirms first |
| `ui_trip_pdf` · `ui_trip_pdf_failed` | Print/Download PDF · That PDF couldn't be made. Please try again. | Rendered only for a premium account — the endpoint refuses everyone else with 403 |
| `ui_trip_move_up` · `ui_trip_move_down` | Move {name} earlier · Move {name} later | **Have a placeholder.** "Earlier" and "later" rather than "up" and "down": the list is a day and the axis is time, not the screen |
| `ui_trip_move_label` · `ui_trip_move_to_day` | Move to another day · Move to day {n} | |
| `ui_trip_remove_stop` | Remove {name} | **Has a placeholder** |
| `ui_trip_directions` · `ui_trip_directions_for` | Get Directions · Get directions to {name}, opens a map | Opens the reader's map site with the stop's stored coordinates. Nothing is routed and nothing is requested |
| `ui_trip_drive` · `ui_trip_walk` | Drive for {minutes} min · Walk for {minutes} min | **Have a placeholder.** These two are the *whole* travel vocabulary: the stored mode is `car` or `walking` and there is no third value. **Do not translate the frame's "Take a bus"** — there is no bus |
| `ui_trip_travel_pending` | Working out the times… | While a change is in flight. The previous number is never shown again once its neighbours have moved |
| `ui_trip_lunch` · `ui_trip_lunch_any` | Lunch break · Pick any spot nearby | Lunch is placed by the server; the second line is for a lunch with no specific restaurant |
| `ui_trip_saving` | Saving… | Announced to a screen reader, not drawn |
| `ui_trip_rename` · `ui_trip_rename_save` · `ui_trip_cancel` | Rename trip · Save name · Cancel | |
| `ui_trip_conflict` | This trip changed somewhere else — showing the latest version. | **The optimistic-concurrency failure.** Usually the same person's phone, so "somewhere else" rather than "someone else". Never retried silently — that would overwrite whatever won the race |
| `ui_trip_save_failed` · `ui_trip_auth_failed` · `ui_trip_gone` | That change couldn't be saved. · Your session expired. Sign in again to keep editing. · This trip no longer exists. | |
| `ui_trip_not_found_title` · `ui_trip_not_found_body` | That trip is not here · It may have been deleted, or the link may belong to another account. | The second clause matters: RLS makes "not yours" and "not there" the same answer, and the copy must not claim more than that |
| `ui_trip_delete_title` · `ui_trip_delete_body` · `ui_trip_deleted` · `ui_trip_delete_failed` | Delete this trip? · This cannot be undone, and it removes the trip from the app too. · Trip deleted. · That trip couldn't be deleted. | The "and in the app" half is the part a reader will not expect |
| `ui_trip_map_title` · `ui_trip_map_body` | The map is still to come · Your stops for the day are listed beside this, in order, with their times. | The placeholder panel: what is missing, and what stands in its place |
| `ui_trip_add_title` | Add to trip | Panel heading |
| `ui_trip_add_step_day` · `ui_trip_add_step_explore` | 1. Which day? · 2. What would you like to explore? | Numbered as the frame numbers them |
| `ui_trip_add_time_note` | Times are worked out for you — a new stop starts when the one before it ends. | **Stands where the frame draws a time picker.** It states the packing rule in one line rather than offering a control the server has no field for |
| `ui_trip_add_search` | Filter these places | **Deliberately not "Search".** It filters the list already on screen; catalogue-wide search is a different, parked thing |
| `ui_trip_add_all_interests` | All Interests | |
| `ui_trip_add_selected` | {count} selected | **Has a placeholder** |
| `ui_trip_add_cta` | Add to Trip | |
| `ui_trip_add_empty` | Nothing here matches those filters. | |
| `ui_trip_add_full` | That day is full — {max} stops is the most one day can hold. | **Has a placeholder.** 20 is a contract bound |
| `ui_trip_add_already` | Already on this day | The same place twice in one day is refused by the server, so the picker says so rather than letting it be chosen |
| `ui_trips_title` · `ui_trips_sub` | My Trips · Everything you have planned | |
| `ui_trips_new` | Build a new trip | |
| `ui_trips_empty_title` · `ui_trips_empty_body` | No trips yet · Build one and it appears here, and in the app. | |
| `ui_trips_days` | {count} days | **Has a placeholder** |
| `ui_trips_open` | Open {name} | **Has a placeholder.** Accessible name of a trip card |
| `ui_meta_buildtrip_title` · `ui_meta_buildtrip_desc` | Build My Trip — CyprusWay · Plan a Cyprus trip day by day — pick your base, your dates and your stops. | |
| `ui_meta_trips_title` · `ui_meta_trips_desc` | My Trips — CyprusWay · The trips you have planned with CyprusWay. | `/trips` is `noIndex`; this metadata is for the browser tab, not for a crawler |

---

### AI Trip Planner — 99, added in phase 6

The wizard at `/plan-trip`, the generation screen, the Premium explanation, and two strings
the trip editor gained with it.

**Reused rather than duplicated**, so they are already translated: `onb_i_*` (all eleven
interest chips), the region names (from the catalogue), `ui_trip_signin_title` /
`ui_trip_signin_body` / `ui_pete_signin_cta` (the signed-out panel), `ui_trip_dates_label` /
`ui_trip_from` / `ui_trip_to` / `ui_trip_span` / `ui_trip_span_error` (identical wording and
identical bounds to `/build-trip`), `ui_trip_region_label`, `ui_loading`.

**Two rules run through this block.** Every number that comes from data is a placeholder,
never written into the sentence — `{n}`, `{cap}`, `{max}`, `{date}`, `{built}`,
`{requested}`. And every failure that happened *after* the server spent one of the day's
three generations says so: "that attempt counted" is the difference between an honest
message and one that invites a second spend against a counter the reader cannot see.

| Key(s) | English | Note |
|---|---|---|
| `ui_plan_title` · `ui_plan_sub` | AI Trip Planner · Your Cyprus Travel Companion | The frame's own page title, kept |
| `ui_plan_steps_label` · `ui_plan_step_of` | Trip planner steps · Step {n} of {total} | **Have placeholders.** The second is read out, not drawn — five circles are not the only signal |
| `ui_plan_back` · `ui_plan_continue` · `ui_plan_skip` | Back · Continue · Skip | Skip appears on steps 1 and 4 only, the two where skipping can mean something |
| `ui_plan_prefs_title` · `ui_plan_prefs_sub` | How do you like to travel? · Pete uses this for every trip you plan, here and in the app. You can change it any time. | The sub-line is load-bearing: this step writes the shared profile row, so it changes the app too |
| `ui_plan_pace_label` · `ui_plan_pace_relaxed` · `ui_plan_pace_moderate` · `ui_plan_pace_packed` | Pace preference · Relaxed · Balanced · Packed | **"Balanced" is the stored value `moderate`.** The label is the design's and the value is the column's; translate the label |
| `ui_plan_morning_label` · `ui_plan_morning_early` · `ui_plan_morning_normal` · `ui_plan_morning_late` | Morning preference · Early riser · Normal · Late starter | Three, one per stored value. The app draws two and infers the third; the newer frames settle it |
| `ui_plan_prefs_failed` | Those preferences couldn't be saved. Please try again. | Blocks Continue: planning at the stored pace while the screen shows the chosen one would be worse |
| `ui_plan_dates_title` · `ui_plan_dates_sub` | When are you going? · Trips start tomorrow at the earliest, and can run up to {max} days. | **Has a placeholder.** 31 is a contract bound, not a preference |
| `ui_plan_dates_early` | Trips start tomorrow at the earliest — pick a later date. | The picker's `min` stops the mouse, not the keyboard; a typed "today" is a server 400 |
| `ui_plan_places_title` · `ui_plan_places_sub` | Where are you based, and what do you like? · Pete plans around one base and works outwards from it. | The base is **one** value, however plural the frame's label reads |
| `ui_plan_interests_label` | What do you want to do? | The frame's wording |
| `ui_plan_interests_count` · `ui_plan_interests_full` | {count} of {max} chosen · That's {max} — clear one to choose another. | **Have placeholders.** A sixth tag is refused by the server by name, so the cap is stated rather than only drawn as dimming |
| `ui_plan_party_title` · `ui_plan_party_sub` | Who is travelling? · Optional. It changes the kind of places Pete picks. | **Not the frame's "What do you want to book?"** — that heading belongs to a deleted frame and to Book with Pete |
| `ui_plan_party_solo` · `_couple` · `_family` · `_friends` | Solo · Couple · Family · Friends | |
| `ui_plan_party_solo_desc` · `_couple_desc` · `_family_desc` · `_friends_desc` | Flexible ideas, easy-to-visit places… · Scenic escapes, shared experiences… · Family-friendly places, simple days out… · Lively places, group activities… | The frame's four descriptions, verbatim |
| `ui_plan_children_label` · `ui_plan_children_under_5` · `ui_plan_children_age_5_12` · `ui_plan_children_teenagers` | How old are the children? · Under 5 · Ages 5–12 · Teenagers | Shown only for Family. Only "Under 5" changes anything server-side; the other two are collected because asking half a question is worse |
| `ui_plan_review_title` · `ui_plan_review_sub` | Ready to plan · Pete builds the whole trip in one go. You can change all of it afterwards. | |
| `ui_plan_review_where` · `_when` · `_days` · `_interests` · `_party` | Where · When · Days · Interests · Travelling | Summary labels |
| `ui_plan_review_party_none` · `ui_plan_review_party_profile` | No preference · Your usual travel style | Which one shows depends on whether the account has a stored traveller type. Skipping the step means two different things, and this says which |
| `ui_plan_create` | Create my trip | **The only control on this site that spends money.** Never reword it into something that sounds free |
| `ui_plan_duration_hint` | Usually 20 to 30 seconds. Sometimes longer. | Measured: median 22 s, worst 57.4 of fourteen. **Do not translate the frame's "about ten seconds" or the app's "about 15 seconds"** — both are under the median |
| `ui_plan_quota_known` · `ui_plan_quota_unknown` · `ui_plan_quota_none` · `ui_plan_quota_none_noday` | {n} of {cap} left today · Up to {cap} trips a day · That's all {cap} for today. More on {date}, Cyprus time. · That's all {cap} for today. More tomorrow, Cyprus time. | **Have placeholders.** Four forms, because the count is only sometimes knowable — the day a count belongs to is a Cyprus day the server owns, and this client never derives one. The last is a fallback for a 429 without `quota_day`, which no deployed RPC sends |
| `ui_plan_building` · `ui_plan_building_long` | Building your Cyprus route… · Still working — this one is taking longer than usual. | The frame draws the first. The second replaces it at 45 seconds |
| `ui_plan_fail_generation_title` · `_body` | Pete couldn't build this trip · Changing your dates, base or interests usually helps. | 422. **Counted** — the counted line below is appended to it |
| `ui_plan_fail_server_title` · `_body` | The planner could not finish · Nothing arrived, and no new trip appeared on your list. | 5xx, after the re-query looked. **Counted** |
| `ui_plan_fail_slow_title` · `_body` | This is taking longer than expected · Pete may still be working. If the plan finishes, it will be in My Trips. | Our own 120-second bound. **Conditional on purpose:** whether the server finishes after the client gives up is inferred, not measured, and this sentence is true either way. No retry is offered |
| `ui_plan_fail_offline_title` · `_body` | Couldn't reach the planner · Check your connection. Nothing was spent and no trip was created, so trying again is safe. | Shown only when the counter row is **measured** not to have moved, so "safe" is a statement about the row rather than a hope about the network |
| `ui_plan_fail_quota_title` | That's all for today | 429. Nothing was consumed — an over-cap call is refused without incrementing |
| `ui_plan_fail_invalid_title` · `_body` | Something in this trip did not make sense to the planner · Go back and check your dates, base and interests. | 400. A defect on our side, since everything is pre-validated, and logged as one |
| `ui_plan_fail_auth_title` · `_body` | Your session expired · Sign in again to plan a trip. | |
| `ui_plan_counted` · `ui_plan_counted_unknown` · `ui_plan_not_counted` · `ui_plan_counted_maybe` | That attempt counted — {n} of {cap} left today. · That attempt counted. · That attempt did not count. · We couldn't confirm whether that attempt counted. Check My Trips before trying again. | **Have placeholders.** The sentence that stops a second spend, in the three shapes a measurement can come back: moved, unmoved, unreadable. Kept separate from the bodies above so the two halves cannot drift apart |
| `ui_plan_recovered_title` · `_body` | Your trip was created · The connection dropped on the way back, but Pete finished the plan — and that generation is already counted. | Shown when the re-query found the row. **Never beside a retry** |
| `ui_plan_view_trip` · `ui_plan_check_trips` · `ui_plan_retry` · `ui_plan_change` | View your trip · Check My Trips · Try again · Change details | |
| `ui_plan_premium_title` · `ui_plan_premium_body` | Pete can plan the whole trip · Tell Pete your dates, where you are based and what you like… | **What most visitors see.** 25 accounts, one premium. The heading says what the feature is, not what the reader lacks |
| `ui_plan_premium_lead` | Trip planning is part of CyprusWay Premium, along with: | |
| `ui_plan_premium_gen` · `_gen_body` · `_pdf` · `_pdf_body` · `_pete` · `_pete_body` | {cap} planned trips a day… · Print or download any trip as a PDF… · Unlimited Ask Pete… | The three things premium measurably unlocks. **Has a placeholder** — the cap is the coded default (3), the one number on the page that is a claim rather than a reading. **Do not add tours** — zero exist — and do not restore "87 curated places": it is 181 published, 146 plannable, 37 restaurants |
| `ui_plan_premium_note` | Premium is not on sale on this site yet — there is nothing to buy here today. If your account already has Premium, sign in with it and the planner opens. | **No price, deliberately.** Nothing here can charge one. See the note below |
| `ui_plan_premium_alt` · `ui_plan_premium_alt_body` | Build a trip yourself · Free and unlimited. Pick your base and your dates, then add the places you want. | The thing that does work, offered instead of a dead button |
| `ui_plan_entry_title` · `ui_plan_entry_body` · `ui_plan_entry_cta` | Let Pete plan it for you · Give Pete your dates and your base and he builds the whole itinerary, day by day. · Open the AI Trip Planner | The card on `/build-trip` and `/trips`. There is no new navigation item |
| `ui_trip_short_title` · `ui_trip_short_body` | This trip came back short · Pete planned {built} of the {requested} days you asked for. Add the rest yourself, or plan again. | **Have placeholders.** The trip is real and usable, so the treatment is advisory rather than an error |
| `ui_meta_plantrip_title` · `ui_meta_plantrip_desc` | AI Trip Planner — CyprusWay · Let Pete plan your Cyprus trip day by day… | |

---

## Copy owed in English before anything is translated

Translating a placeholder produces five placeholders. These four want a decision first:

1. **`onb_signin_sub`** — "Sign in to pick up where you left off." Already translated into
   all five languages on the onboarding branch, but the line itself is flatter than the
   site's voice. Rewriting it means retranslating five strings, so decide before it goes
   any further.
2. **`ui_hero_sub`** — the Figma reads "Explore **87** hand-picked places…". 87 came from
   the placeholder; 181 places are published. The count is dropped for now, which leaves
   the sentence slightly limp. It wants either a real number from the `client_config` RPC
   or a rewrite that does not need one.
3. **`ui_error_report`** and `ui_menu_report` / `ui_menu_feedback` — all three point at
   `partners@cyprusway.eu`, which is the partnerships inbox, not support. A support
   address would change the copy as well as the link.
4. **`ui_nav_my_cyprusway`** — is "My CyprusWay" a product name that stays English in every
   language, or a phrase that gets translated? The app's answer should decide the web's.

5. **`ui_plan_premium_note`** — it says Premium is not on sale here, and names no price.
   That is deliberate: €4.99 one-time is the App Store product's price, the Stripe price is
   a secret that has never charged live money, and nothing on this site can sell it. If the
   Stripe rail ships, this sentence is replaced rather than edited — and the replacement
   decides whether a price appears at all. Translating it before then produces five
   sentences that have to be rewritten.
