# Translation queue — phase 1

The React shell introduces strings the vanilla dictionary never had. They ship in English
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

## The queue — 62 keys, English only

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
| `ui_hero_ask_unavailable` | Ask Pete is not available on the web yet. | Appended to that input's accessible name |
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
