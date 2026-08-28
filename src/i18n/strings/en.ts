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
