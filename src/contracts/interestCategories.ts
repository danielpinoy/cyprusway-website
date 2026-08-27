import type { InterestSlug } from './interests';

/**
 * Interest slug → CMS category slugs.
 *
 * TODO(contracts): replaced by `places_sync.interest_tags` (or a mapping table) and the
 * client_config RPC. Until one of those exists this file is the only place the two
 * vocabularies meet, anywhere.
 *
 * ---------------------------------------------------------------------------
 * READ THIS BEFORE EDITING — this is a fifth copy and a new invention.
 *
 * The interest vocabulary already exists in four places: the app's `interestTags.ts`,
 * `trip-generate`'s VALID_INTEREST_TAGS, migration 0019's CHECK constraint, and this
 * repo's `interests.ts`. Those four are kept honest by the database: a wrong slug throws
 * 23514 on the profile write and a 400 on generation. Loud, immediate, unmissable.
 *
 * THIS map has no such backstop. It is a judgement about what each interest *means* in
 * terms of the 18 CMS categories, and nothing anywhere validates it. Nobody else holds a
 * copy, so nothing can disagree with it loudly — it can only disagree silently.
 *
 * The failure to watch for: **the app decides Adventure includes nature trails, or that
 * waterparks are not family-friendly, and nothing tells either side.** A person then sees
 * one set of places under "Adventure" in the app and a different set on the web, with no
 * error anywhere. Measured 28 Aug 2026: `waterparks` is deliberately in both `adventure`
 * and `kid_friendly` here — that is exactly the kind of call that will be made differently
 * elsewhere.
 *
 * If you are here because the two surfaces disagree: the fix is not to edit this file to
 * match. It is to move the mapping to the server, delete this file, and read the tags off
 * the place row.
 *
 * **Two categories are reachable by no interest**, both on purpose:
 * `viewpoints-landmarks` (10 places, 8 renderable) and nothing at all for `hidden_gems`.
 * Places in an unreachable category are not invisible — they still surface through the
 * prominence backfill, Popular and Food & Wine. They just cannot be *personalised* to.
 * ---------------------------------------------------------------------------
 *
 * Used to ORDER, never to filter. Top Recommendations fills in rounds — one card per
 * interest per round, strongest first — and then backfills from the full pool, so a bad or
 * missing mapping degrades to the plain prominence order rather than to an empty rail.
 * That matters more than it sounds: measured 28 Aug, six of the eleven interests have
 * fewer than four places that are scored AND photographed, so filtering would have shown
 * those users a rail of backfill and called it personalisation. See lib/rails.ts.
 */
export const INTEREST_CATEGORIES: Readonly<Record<InterestSlug, readonly string[]>> = {
  beach_coast: ['beaches'],
  ancient_ruins: ['archaeological-sites', 'historical-sites', 'castles-fortifications'],
  local_food: ['tavernas'],
  wine_villages: ['villages'],
  /* `viewpoints-landmarks` was here and was removed on 28 Aug. It is not Nature & Hiking:
     the category holds Limassol Marina, the Ayia Napa Sculpture Park and the Edro III
     shipwreck. It was also doing real damage — it is 4 of the 8 highest-prominence places,
     so claiming it made `nature_trails` swallow the editorial head and a three-interest
     rail came out looking identical to the signed-out one. Deliberately not moved to
     another interest: if it belongs anywhere that is a taxonomy call for the server. */
  nature_trails: ['nature-trails'],
  nightlife: ['nightlife', 'bars'],
  adventure: ['adventure-parks', 'waterparks'],
  culture_art: ['museums'],
  kid_friendly: [
    'indoor-playgrounds',
    'amusement-parks',
    'animal-parks',
    'parks-playgrounds',
    'waterparks',
  ],
  /* Deliberately unmapped. No CMS category means "hidden gem", and the nearest proxy —
     low prominence — is the opposite of what a recommendations rail should surface.
     A user who picks only this gets the plain prominence order, which is honest.
     Do not invent a mapping here; if Hidden Gems is to mean something, it needs to mean
     it on the place row. */
  hidden_gems: [],
  churches_monasteries: ['monasteries-churches'],
};

/** The category slugs any of the given interests reaches. */
export function categoriesForInterests(interests: readonly string[]): ReadonlySet<string> {
  const out = new Set<string>();
  for (const interest of interests) {
    const categories = INTEREST_CATEGORIES[interest as InterestSlug];
    if (categories) for (const category of categories) out.add(category);
  }
  return out;
}
