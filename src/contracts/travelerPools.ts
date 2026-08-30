import { Heart, PartyPopper, User, Users, type LucideIcon } from 'lucide-react';

import type { Place } from '../lib/places';
import type { TranslationKey } from '../i18n/dictionary';

/**
 * The four traveller types, and the badge pool behind each.
 *
 * TODO(contracts): replaced by the `client_config` RPC, with `interestCategories.ts`.
 * Until that exists this is a client-side taxonomy with no database backstop — but a
 * **smaller claim than that file makes**, and the difference is worth stating. An
 * interest → CMS-category map is entirely invented on the client. A traveller pool is
 * three-quarters read: `badges` lives on the place row, the slugs below are the curator's
 * own, and `users.traveler_type` carries a CHECK of exactly these four values, so a fifth
 * is a Postgres 23514 at write time rather than a silent miss. **The only invented part is
 * the friends union** — see below.
 *
 * SPELLING. Identifiers and this filename mirror the app's `lib/travelerTypes.ts` and the
 * `traveler_type` column — one L, because that is the schema's name and a reader comparing
 * the two clients should see the same word. User-facing copy uses the site's British
 * English ("Perfect for solo travellers"); the two are allowed to differ and the rail's
 * headings say so.
 *
 * **TWO COPIES MUST AGREE.** The app holds an identical definition in
 * `cyprusway-app/src/lib/travelerTypes.ts`. If a pool changes it changes in both, or the
 * clients disagree about what "Friends" contains — recorded in docs/PARKED.md beside the
 * interest map for the same reason.
 */

export const TRAVELER_TYPES = ['solo', 'couple', 'family', 'friends'] as const;

export type TravelerType = (typeof TRAVELER_TYPES)[number];

/** Narrows a URL parameter or a nullable column. */
export function isTravelerType(value: unknown): value is TravelerType {
  return typeof value === 'string' && (TRAVELER_TYPES as readonly string[]).includes(value);
}

interface Pool {
  badges: readonly string[];
  categories: readonly string[];
}

/**
 * A pool is an OR across badge slugs and category slugs.
 *
 * Counts measured against the live catalogue on 30 August 2026 — the same request
 * `fetchPlaces()` makes, so these are the numbers the filter actually sees:
 * **solo-friendly 28 · romantic 15 · family-friendly 78 · lively-busy 20**, and the friends
 * union 31 distinct.
 *
 * THE FRIENDS UNION IS THE ONE INVENTED PART, and it is a no-op on the homepage. The app
 * added `bars` and `nightlife` so its twelve-card rail did not run short. Measured here:
 * the union adds **11 places over `lively-busy`, of which 0 are scored, 0 photographed and
 * 0 plannable** — so the six-card rail is identical either way, and the union changes only
 * Explore's count (31 rather than 20). It is kept because Explore is a catalogue rather
 * than a ranking — the rule `explorePool` defends, that requiring a score there "would
 * return Food and Nightlife to zero results" — and seventeen bars and clubs are genuinely
 * what a group of friends is browsing for.
 */
const POOLS: Record<TravelerType, Pool> = {
  solo: { badges: ['solo-friendly'], categories: [] },
  couple: { badges: ['romantic'], categories: [] },
  family: { badges: ['family-friendly'], categories: [] },
  friends: { badges: ['lively-busy'], categories: ['bars', 'nightlife'] },
};

export function matchesTravelerType(place: Place, type: TravelerType): boolean {
  const pool = POOLS[type];
  return (
    place.badges.some((badge) => pool.badges.includes(badge.slug)) ||
    (place.categorySlug != null && pool.categories.includes(place.categorySlug))
  );
}

/**
 * Type → glyph, in the same shape as `categoryIcons.ts` and for the same reason: the two
 * surfaces that draw these cards — the planner's party step and the My CyprusWay chooser —
 * must not pick different icons for the same word. Solo and Couple are the frame's own
 * Lucide glyphs; Family and Friends are the nearest Lucide pair to the frame's two Material
 * Symbols, chosen the way the app chose them and noted there so a designer can audit it.
 */
export const TRAVELER_ICONS: Record<TravelerType, LucideIcon> = {
  solo: User,
  couple: Heart,
  family: Users,
  friends: PartyPopper,
};

/** The card label — "Solo", "Couple" — reused from the planner's party step, which asks
 *  the same question with the same four words. One vocabulary, not two. */
export function travelerLabelKey(type: TravelerType): TranslationKey {
  return `ui_plan_party_${type}` as TranslationKey;
}

/** The card's one-line description, likewise the planner's. */
export function travelerDescriptionKey(type: TravelerType): TranslationKey {
  return `ui_plan_party_${type}_desc` as TranslationKey;
}

/** "Perfect for solo travellers" — the rail's heading. British spelling, unlike the app's
 *  "travelers": the site writes "travellers" (`about_p1`) and "personalised" throughout,
 *  and a US spelling here would be its first. A deliberate divergence, not a typo. */
export function travelerRailHeadingKey(type: TravelerType): TranslationKey {
  return `ui_traveller_rail_${type}` as TranslationKey;
}
