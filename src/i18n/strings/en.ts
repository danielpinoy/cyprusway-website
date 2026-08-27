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
  ui_hero_ask_unavailable: 'Ask Pete is not available on the web yet.',
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

  /* --- Page metadata (<title> and meta description) ---------------------- */
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
