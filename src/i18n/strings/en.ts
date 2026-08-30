/* Strings the React build introduces that the vanilla dictionary never had —
 * the Figma shell, the loading and error states, the cookie banner, page metadata.
 *
 * English only. The other four locales in this directory are intentionally empty:
 * translations are real work and are not invented here. Every key below is listed in
 * docs/TRANSLATION-QUEUE.md with the context a translator needs.
 *
 * Where the design's string already exists in the ported dictionary it is NOT
 * duplicated here — the component uses the ported key. Notably: the hero H1 is
 * `onb_signup_title`, "Ask Pete" is `nav_ap`, the footer's category names are
 * `onb_i_*`, the location names are `nav_paphos` and friends, and the copyright is
 * `footer_copyright` (which names Almisource LTD, the legal entity — the Figma's
 * "CyprusWay" is wrong for a copyright line).
 */

export const stringsEn = {
  /* --- Chrome ----------------------------------------------------------- */
  ui_skip_to_content: 'Skip to content',
  ui_language: 'Language',
  ui_coming_soon: 'Coming soon',

  /* --- Header ----------------------------------------------------------- */
  ui_nav_explore: 'Explore Now',
  ui_nav_my_cyprusway: 'My CyprusWay',
  ui_nav_tours: '360° Tours',
  ui_nav_build_trip: 'Build My Trip',
  ui_header_search: 'Search',
  ui_header_saved: 'Saved places',
  ui_header_account: 'Your account',
  ui_header_menu_open: 'Open menu',
  ui_header_menu_close: 'Close menu',
  ui_header_signin: 'Sign In',
  ui_header_home: 'CyprusWay home',
  ui_nav_primary: 'Main navigation',

  /* --- Hero -------------------------------------------------------------
     The Figma sub-copy reads "Explore 87 hand-picked places…". 87 came from the
     placeholder; 181 places are published. Rather than ship a wrong number or
     hardcode one the client_config RPC will supply, the count is dropped. */
  ui_hero_sub:
    "Explore hand-picked places, get personalised guidance from Pete, and build a day-by-day trip around the Cyprus you want to experience.",
  ui_hero_ask_placeholder: 'Ask me anything...',
  ui_hero_explore_title: 'Explore Now',
  ui_hero_explore_desc: 'Browse hand-picked places right away. No questions asked.',
  ui_hero_my_title: 'My CyprusWay',
  ui_hero_my_desc: "Tell us who you're travelling with, and we'll shape Cyprus around you.",

  /* --- Overlay menu ------------------------------------------------------ */
  ui_menu_title: 'Menu',
  ui_menu_search_placeholder: 'Search anything in Cyprus',
  ui_menu_book_pete: 'Book with Pete',
  ui_menu_my_trips: 'My Trips',
  ui_menu_saved_places: 'Saved Places',
  ui_menu_settings: 'Settings',
  ui_menu_logout: 'Log out',
  ui_menu_feedback: 'Give feedback',
  ui_menu_report: 'Report a problem',

  /* --- Footer ------------------------------------------------------------ */
  ui_footer_search_placeholder: 'Find places and experiences in Cyprus',
  ui_footer_discover: 'Discover',
  ui_footer_about_heading: 'About',
  ui_footer_faq: 'FAQ',

  /* --- Command centre states -------------------------------------------- */
  ui_loading: 'Loading',
  ui_error_title: 'Cyprus is still there',
  ui_error_body:
    "We just couldn't load it right now. Check your connection and we'll bring the island back.",
  ui_error_reload: 'Reload',
  ui_error_persist: 'Keep happening?',
  ui_error_report: 'Report the problem',

  /* --- 404 — copy carried from the page it replaces ---------------------- */
  ui_404_code: '404',
  ui_404_title: 'Page not found',
  ui_404_body: "The page you're looking for doesn't exist or has been moved.",
  ui_404_home: 'Take me home',

  /* --- Cookie consent ---------------------------------------------------- */
  ui_cookie_text:
    'This site uses cookies for essential functionality and to track affiliate bookings.',
  ui_cookie_learn: 'Learn more',
  ui_cookie_accept: 'Accept',
  ui_cookie_decline: 'Decline',
  ui_cookie_label: 'Cookie consent',


  /* --- Homepage rails (phase 2) ------------------------------------------ */
  ui_rail_previous: 'Previous',
  ui_rail_next: 'Next',
  ui_rail_top_recommendations: 'Top Recommendations',
  ui_rail_tours: 'See Cyprus before you go',
  ui_rail_popular: 'Popular at the moment',
  ui_rail_food_wine: 'Food & Wine Picks',
  ui_rail_saved: 'Saved Places',
  ui_categories_title: 'Categories',
  ui_home_ready: 'Recommendations loaded',
  ui_tour_badge: '360° Tour',

  /* --- Continue your trip ------------------------------------------------- */
  ui_trip_continue: 'Continue',
  ui_trip_active: 'Active trip',
  /* {current} and {total} are substituted; word order is the translator's to choose. */
  ui_trip_day: 'Day {current} of {total}',
  ui_trip_untitled: 'Continue planning your trip',
  ui_trip_untitled_region: 'Continue planning your trip to {region}',

  /* --- Book with Pete ----------------------------------------------------- */
  ui_bwp_title: 'Book with Pete',
  ui_bwp_lede: 'Tell Pete what you need and get matched with the right local option',
  ui_bwp_question: 'Where are you going?',
  /* The frame says "Choose as many as apply". The API takes exactly one region, so the
     chips are single-select and the hint says so. */
  ui_bwp_hint: 'Choose one',
  ui_bwp_continue: 'Continue',
  ui_bwp_unavailable: "Booking options aren't available on the web yet.",


  /* --- Explore (phase 3) -------------------------------------------------- */
  ui_explore_title: 'Explore Cyprus',
  ui_explore_all_regions: 'All Regions',
  ui_explore_all_interests: 'All Interests',
  ui_explore_region_filter: 'Filter by region',
  ui_explore_interest_filter: 'Filter by interest',
  ui_explore_count: '{count} places',
  ui_explore_count_partial: 'Showing {shown} of {count} places',
  ui_explore_load_more: 'Load More',
  /* Two empty states, for two different reasons — see ExploreEmpty.tsx. */
  ui_explore_empty_title: 'No {interest} in {region}',
  ui_explore_empty_title_any: 'Nothing under {interest} yet',
  ui_explore_empty_suggestion: 'There is more to see under {interest} here.',
  ui_explore_empty_untagged_title: '{interest} is not tagged on places yet',
  ui_explore_empty_untagged_body:
    'The other ten interests are. This one needs the places themselves to be tagged before it can show anything.',
  ui_explore_clear: 'Clear filters',

  /* --- Place page (phase 3) ----------------------------------------------- */
  ui_place_features: 'Features',
  ui_place_about: 'About {name}',
  ui_place_duration: 'About {minutes} minutes',
  ui_place_gallery: 'Photos',
  ui_place_photo_of: 'Photo {index} of {total}',
  ui_place_save: 'Save this place',
  ui_place_saved: 'Saved',
  ui_place_save_failed: "We couldn't save this place. Please try again.",
  ui_place_not_found_title: 'That place is not here',
  ui_place_not_found_body:
    "The link may be out of date, or the place may have been withdrawn. Explore is a good place to start again.",
  ui_place_not_found_cta: 'Explore Cyprus',

  /* --- Metadata for the new routes ---------------------------------------- */
  ui_meta_explore_title: 'Explore Cyprus — CyprusWay',
  ui_meta_explore_desc:
    'Browse hand-picked places across Cyprus by region and by what you are interested in.',

  /* --- Page metadata (<title> and meta description) ---------------------- */
  /* --- Ask Pete (phase 4) --------------------------------------------------- */
  ui_pete_title: 'Ask Pete',
  ui_pete_subtitle: 'Cyprus travel assistant',
  /* Client-side copy. Never sent to the model, never persisted, and rendered only when
     the server confirmed an empty history — above a loaded thread it would be a lie. */
  ui_pete_greeting: 'Hi! 👋 I am Pete — your local guide to Cyprus. What can I help with?',
  ui_pete_starter_1: 'Best beach near me',
  ui_pete_starter_2: 'What should I do tonight?',
  ui_pete_starter_3: 'Know about Cyprus history or culture?',
  /* {used} counts questions ASKED, not left: the frame's limit state reads "5 of 5". */
  ui_pete_counter: '{used} of {cap} today',
  ui_pete_counter_label: '{used} of {cap} questions used today',
  ui_pete_input_label: 'Your question for Pete',
  ui_pete_placeholder:
    'Ask Pete anything specific, e.g. travelling with a toddler, need wheelchair access, celebrating...',
  ui_pete_send: 'Send',
  ui_pete_sending: 'Pete is answering',
  ui_pete_disabled_quota: "you have used today's questions",
  ui_pete_said: 'Pete said',
  ui_pete_you_said: 'You said',
  /* The visible chip is a bare place name; "Ayia Napa" alone does not say it is a link
     to a page. */
  ui_pete_open_place: 'Open {name}',
  ui_pete_signin_title: 'Pete needs a free account',
  ui_pete_signin_body: 'Everything you save comes with you, on the web and in the app.',
  ui_pete_signin_cta: 'Create a free account',
  /* One per typed code the function returns. mike's own error strings name internal
     steps and are never rendered. None offers a retry: the allowance is spent before
     OpenAI is called, so a retry would spend a second one on the same question. */
  ui_pete_err_quota:
    "That's all {cap} for today. Pete is back tomorrow — your question is still in the box.",
  ui_pete_err_account: 'Ask Pete needs a free account. Everything you have saved comes with you.',
  ui_pete_err_auth: 'Your session expired. Sign in again to keep chatting.',
  ui_pete_err_invalid:
    "Pete couldn't read that one, so nothing was used. Your question is still in the box.",
  ui_pete_err_transport: "Couldn't reach Pete. Check your connection and try again.",
  ui_pete_err_server: 'Pete is having trouble right now. Try again in a moment.',
  ui_pete_err_stream: 'Pete stopped mid-answer. That one still counted, sorry.',
  /* The language switcher writes preferred_language for a signed-in visitor, and the
     control has to say so — it changes Pete's language on their phone too. */
  ui_language_shared: 'Also changes the app',
  ui_meta_askpete_title: 'Ask Pete — CyprusWay',
  ui_meta_askpete_desc:
    'Ask a local guide about Cyprus — beaches, food, history and what to do tonight.',
  /* --- Build My Trip (phase 5) ----------------------------------------------- */
  ui_trip_setup_title: 'Build My Trip',
  ui_trip_setup_sub: 'Plan a new trip',
  ui_trip_signin_title: 'Trips need a free account',
  ui_trip_signin_body:
    'Your trips are the same on the web and in the app, so you can plan here and follow along there.',
  ui_trip_name_label: 'Trip name',
  ui_trip_name_placeholder: 'Enter trip name',
  /* Singular: `base_location` is one text column, whatever the frame's plural label says. */
  ui_trip_region_label: 'Select base destination',
  ui_trip_dates_label: 'Date range',
  ui_trip_from: 'From',
  ui_trip_to: 'To',
  ui_trip_span: '{count} days',
  ui_trip_span_error: 'A trip can be 1 to {max} days.',
  ui_trip_create: 'Create a Trip',
  ui_trip_creating: 'Creating…',
  ui_trip_create_failed: "That trip couldn't be created. Please try again.",
  /* --- the editor --- */
  ui_trip_list: 'List',
  ui_trip_map: 'Map',
  ui_trip_day_n: 'Day {n}',
  ui_trip_today: 'Today',
  ui_trip_tomorrow: 'Tomorrow',
  ui_trip_toggle_day: 'Day {n} stops',
  ui_trip_remove_day: 'Remove day {n}',
  ui_trip_empty_day: 'Nothing planned for this day yet.',
  ui_trip_add_stops: 'Add to Trip',
  ui_trip_add_day: 'Add Day',
  ui_trip_delete: 'Delete Trip',
  ui_trip_pdf: 'Print/Download PDF',
  ui_trip_pdf_failed: "That PDF couldn't be made. Please try again.",
  ui_trip_move_up: 'Move {name} earlier',
  ui_trip_move_down: 'Move {name} later',
  ui_trip_move_to_day: 'Move to day {n}',
  ui_trip_move_label: 'Move to another day',
  ui_trip_remove_stop: 'Remove {name}',
  /* An outbound link to the device's map app, built from the stop's stored coordinates.
     Nothing is routed here and nothing is requested. */
  ui_trip_directions: 'Get Directions',
  ui_trip_directions_for: 'Get directions to {name}, opens a map',
  /* Minutes and mode are the whole of what the server stores for a leg. */
  ui_trip_drive: 'Drive for {minutes} min',
  ui_trip_walk: 'Walk for {minutes} min',
  ui_trip_travel_pending: 'Working out the times…',
  ui_trip_lunch: 'Lunch break',
  ui_trip_lunch_any: 'Pick any spot nearby',
  ui_trip_saving: 'Saving…',
  ui_trip_rename: 'Rename trip',
  ui_trip_rename_save: 'Save name',
  ui_trip_cancel: 'Cancel',
  /* The optimistic-concurrency guard fired. Never a silent retry — that would overwrite
     whatever won the race, which is the one thing the guard exists to prevent. */
  ui_trip_conflict: 'This trip changed somewhere else — showing the latest version.',
  /* One per outcome. They used to be one string, which made a 409 and a client-side
     refusal look identical when they need opposite responses from the reader. */
  ui_trip_save_failed: "That change couldn't be saved. Something went wrong on our side — please try again.",
  ui_trip_offline: "That change couldn't be saved — it never reached us. Check your connection and try again.",
  ui_trip_blocked: "That change couldn't be saved, and nothing was sent. Reload the trip and try again.",
  ui_trip_auth_failed: 'Your session expired. Sign in again to keep editing.',
  ui_trip_gone: 'This trip no longer exists.',
  ui_trip_not_found_title: 'That trip is not here',
  ui_trip_not_found_body:
    'It may have been deleted, or the link may belong to another account.',
  ui_trip_delete_title: 'Delete this trip?',
  ui_trip_delete_body: 'This cannot be undone, and it removes the trip from the app too.',
  ui_trip_deleted: 'Trip deleted.',
  ui_trip_delete_failed: "That trip couldn't be deleted.",
  /* --- the map placeholder --- */
  ui_trip_map_title: 'The map is still to come',
  ui_trip_map_body:
    'Your stops for the day are listed beside this, in order, with their times.',
  /* --- add to trip --- */
  ui_trip_add_title: 'Add to trip',
  ui_trip_add_step_day: '1. Which day?',
  ui_trip_add_step_explore: '2. What would you like to explore?',
  /* Why there is no time to choose. The server packs the day: an added stop starts when
     the one before it ends, plus the travel between them. */
  ui_trip_add_time_note: 'Times are worked out for you — a new stop starts when the one before it ends.',
  ui_trip_add_search: 'Filter these places',
  ui_trip_add_all_interests: 'All Interests',
  ui_trip_add_selected: '{count} selected',
  ui_trip_add_cta: 'Add to Trip',
  ui_trip_add_empty: 'Nothing here matches those filters.',
  ui_trip_add_full: 'That day is full — {max} stops is the most one day can hold.',
  ui_trip_add_already: 'Already on this day',
  /* --- the hub --- */
  ui_trips_title: 'My Trips',
  ui_trips_sub: 'Everything you have planned',
  ui_trips_new: 'Build a new trip',
  ui_trips_empty_title: 'No trips yet',
  ui_trips_empty_body: 'Build one and it appears here, and in the app.',
  ui_trips_days: '{count} days',
  ui_trips_open: 'Open {name}',
  /* --- AI Trip Planner (phase 6) --------------------------------------------
     The wizard at /plan-trip, its five steps, the generation screen and the
     Premium explanation most visitors will see instead of any of it.

     Two rules run through this block. Numbers that come from data are always
     placeholders, never written into the sentence: {n}, {cap}, {max}, {date},
     {built}, {requested}. And every failure that happened after the server
     consumed the day's allowance says so — "that attempt counted" is the
     difference between an honest message and one that invites a second spend
     against a counter the reader cannot see. */
  ui_plan_title: 'AI Trip Planner',
  ui_plan_sub: 'Your Cyprus Travel Companion',
  ui_plan_steps_label: 'Trip planner steps',
  ui_plan_step_of: 'Step {n} of {total}',
  ui_plan_back: 'Back',
  ui_plan_continue: 'Continue',
  ui_plan_skip: 'Skip',
  /* --- step 1: the two preferences that live on the profile, not on the request --- */
  ui_plan_prefs_title: 'How do you like to travel?',
  ui_plan_prefs_sub:
    'Pete uses this for every trip you plan, here and in the app. You can change it any time.',
  ui_plan_pace_label: 'Pace preference',
  /* "Balanced" is the frame's word; the stored value is `moderate`. The label is the
     design's and the value is the column's, and they are allowed to differ. */
  ui_plan_pace_relaxed: 'Relaxed',
  ui_plan_pace_moderate: 'Balanced',
  ui_plan_pace_packed: 'Packed',
  ui_plan_morning_label: 'Morning preference',
  ui_plan_morning_early: 'Early riser',
  ui_plan_morning_normal: 'Normal',
  ui_plan_morning_late: 'Late starter',
  ui_plan_prefs_failed: "Those preferences couldn't be saved. Please try again.",
  /* --- step 2: dates --- */
  ui_plan_dates_title: 'When are you going?',
  ui_plan_dates_sub:
    'Trips start tomorrow at the earliest, and can run up to {max} days.',
  /* --- step 3: base destination and interests --- */
  ui_plan_places_title: 'Where are you based, and what do you like?',
  ui_plan_places_sub: 'Pete plans around one base and works outwards from it.',
  ui_plan_interests_label: 'What do you want to do?',
  ui_plan_interests_count: '{count} of {max} chosen',
  ui_plan_interests_full: "That's {max} — clear one to choose another.",
  /* --- step 4: who is travelling --- */
  /* Not the frame's "What do you want to book?", which belongs to a deleted frame and to
     Book with Pete. The heading is written from the body. */
  ui_plan_party_title: 'Who is travelling?',
  ui_plan_party_sub: 'Optional. It changes the kind of places Pete picks.',
  ui_plan_party_solo: 'Solo',
  ui_plan_party_solo_desc:
    'Flexible ideas, easy-to-visit places and experiences that work well on your own.',
  ui_plan_party_couple: 'Couple',
  ui_plan_party_couple_desc:
    'Scenic escapes, shared experiences and places that feel special together.',
  ui_plan_party_family: 'Family',
  ui_plan_party_family_desc:
    'Family-friendly places, simple days out and experiences for different ages.',
  ui_plan_party_friends: 'Friends',
  ui_plan_party_friends_desc:
    'Lively places, group activities and memorable experiences to enjoy together.',
  ui_plan_children_label: 'How old are the children?',
  ui_plan_children_under_5: 'Under 5',
  ui_plan_children_age_5_12: 'Ages 5–12',
  ui_plan_children_teenagers: 'Teenagers',
  /* --- step 5: review, and the one button that spends a generation --- */
  ui_plan_review_title: 'Ready to plan',
  ui_plan_review_sub: 'Pete builds the whole trip in one go. You can change all of it afterwards.',
  ui_plan_review_where: 'Where',
  ui_plan_review_when: 'When',
  ui_plan_review_days: 'Days',
  ui_plan_review_interests: 'Interests',
  ui_plan_review_party: 'Travelling',
  /* Shown when step 4 was skipped AND the profile carries no traveller type — which is
     almost every account on this site. It says what will happen, not what was chosen. */
  ui_plan_review_party_none: 'No preference',
  ui_plan_review_party_profile: 'Your usual travel style',
  ui_plan_create: 'Create my trip',
  /* Measured: median 22 s, worst 57.4 s of fourteen. NOT the paywall frame's "about ten
     seconds" and not the app's "about 15 seconds" — both are below the median. */
  ui_plan_duration_hint: 'Usually 20 to 30 seconds. Sometimes longer.',
  /* Three forms, because the count is only sometimes knowable. See lib/tripGenerate.ts:
     the day a count belongs to is a Cyprus calendar day the server owns, so before this
     session has seen one, the number is a floor rather than a fact. */
  ui_plan_quota_known: '{n} of {cap} left today',
  ui_plan_quota_unknown: 'Up to {cap} trips a day',
  ui_plan_quota_none: "That's all {cap} for today. More on {date}, Cyprus time.",
  /* --- generating --- */
  ui_plan_building: 'Building your Cyprus route…',
  ui_plan_building_long: 'Still working — this one is taking longer than usual.',
  /* --- the outcomes. Every one of these says whether the attempt counted. --- */
  ui_plan_fail_generation_title: "Pete couldn't build this trip",
  ui_plan_fail_generation_body:
    'Changing your dates, base or interests usually helps.',
  ui_plan_fail_server_title: 'The planner could not finish',
  ui_plan_fail_server_body: 'Nothing arrived, and no new trip appeared on your list.',
  ui_plan_fail_slow_title: 'This is taking longer than expected',
  ui_plan_fail_slow_body:
    'Pete may still be working. If the plan finishes, it will be in My Trips.',
  ui_plan_fail_offline_title: "Couldn't reach the planner",
  ui_plan_fail_offline_body:
    'We checked — no trip was created, so trying again is safe.',
  ui_plan_fail_quota_title: "That's all for today",
  ui_plan_fail_invalid_title: 'Something in this trip did not make sense to the planner',
  ui_plan_fail_invalid_body: 'Go back and check your dates, base and interests.',
  ui_plan_fail_auth_title: 'Your session expired',
  ui_plan_fail_auth_body: 'Sign in again to plan a trip.',
  /* The counted line, appended to the failures above that landed after the server spent
     the allowance. Separate from the body so the two halves cannot drift apart. */
  ui_plan_counted: 'That attempt counted — {n} of {cap} left today.',
  ui_plan_counted_unknown: 'That attempt counted.',
  ui_plan_recovered_title: 'Your trip was created',
  ui_plan_recovered_body:
    'The connection dropped on the way back, but Pete finished the plan — and that generation is already counted.',
  ui_plan_view_trip: 'View your trip',
  ui_plan_check_trips: 'Check My Trips',
  ui_plan_retry: 'Try again',
  ui_plan_change: 'Change details',
  /* --- the Premium explanation: what a free account gets, and it is the common path ---
     Written from what premium measurably unlocks. Not from the paywall frame, whose four
     claims are all false — see docs/PARKED.md. No price: nothing on this site can charge
     one. No button: there is nothing to buy. */
  ui_plan_premium_title: 'Pete can plan the whole trip',
  ui_plan_premium_body:
    'Tell Pete your dates, where you are based and what you like, and he builds a complete day-by-day plan — real places from the CyprusWay catalogue, grouped by area, with lunch and travel time worked in. It arrives in your trips, ready to edit.',
  ui_plan_premium_lead: 'Trip planning is part of CyprusWay Premium, along with:',
  ui_plan_premium_gen: 'Three planned trips a day',
  ui_plan_premium_gen_body:
    'Each one a full itinerary you can reorder, add to and trim.',
  ui_plan_premium_pdf: 'Print or download any trip as a PDF',
  ui_plan_premium_pdf_body: 'The whole plan on paper, for the car.',
  ui_plan_premium_pete: 'Unlimited Ask Pete',
  ui_plan_premium_pete_body: 'No daily limit on questions.',
  ui_plan_premium_note:
    'Premium is not on sale on this site yet — there is nothing to buy here today. If your account already has Premium, sign in with it and the planner opens.',
  ui_plan_premium_alt: 'Build a trip yourself',
  ui_plan_premium_alt_body:
    'Free and unlimited. Pick your base and your dates, then add the places you want.',
  /* --- the entry cards on /build-trip and /trips --- */
  ui_plan_entry_title: 'Let Pete plan it for you',
  ui_plan_entry_body:
    'Give Pete your dates and your base and he builds the whole itinerary, day by day.',
  ui_plan_entry_cta: 'Open the AI Trip Planner',
  /* --- the editor's built-short notice (phase 5's DayList) --- */
  ui_trip_short_title: 'This trip came back short',
  ui_trip_short_body:
    'Pete planned {built} of the {requested} days you asked for. Add the rest yourself, or plan again.',
  ui_meta_plantrip_title: 'AI Trip Planner — CyprusWay',
  ui_meta_plantrip_desc:
    'Let Pete plan your Cyprus trip day by day — your dates, your base, and a full itinerary you can edit.',
  ui_meta_buildtrip_title: 'Build My Trip — CyprusWay',
  ui_meta_buildtrip_desc:
    'Plan a Cyprus trip day by day — pick your base, your dates and your stops.',
  ui_meta_trips_title: 'My Trips — CyprusWay',
  ui_meta_trips_desc: 'The trips you have planned with CyprusWay.',
  ui_meta_place_title: '{name} — CyprusWay',
  /* The standfirst is the description on every place that has one; these two carry the
     rest. Deliberately plain: a fabricated superlative for a place nobody has written
     copy for would be worse than a flat sentence. */
  ui_meta_place_desc: '{name} — a place to visit in {region}, Cyprus. On CyprusWay.',
  ui_meta_place_desc_any: '{name} — a place to visit in Cyprus. On CyprusWay.',
  ui_meta_home_title: 'CyprusWay — Discover Cyprus',
  ui_meta_home_desc:
    'Step inside Cyprus before you arrive with immersive 360° tours and guided narration.',
  ui_meta_about_title: 'About — CyprusWay',
  ui_meta_about_desc: 'A travel companion for the island we love.',
  ui_meta_faq_title: 'FAQ — CyprusWay',
  ui_meta_faq_desc: 'Answers about booking, languages, coverage and how CyprusWay works.',
  ui_meta_privacy_title: 'Privacy Policy — CyprusWay',
  ui_meta_privacy_desc: 'How CyprusWay collects, uses and protects your personal data.',
  ui_meta_terms_title: 'Terms of Service — CyprusWay',
  ui_meta_terms_desc: 'The terms that govern your use of CyprusWay.',
  ui_meta_404_title: 'Page not found — CyprusWay',
  ui_meta_404_desc: "The page you're looking for doesn't exist or has been moved.",
} as const;

export type UiKey = keyof typeof stringsEn;
