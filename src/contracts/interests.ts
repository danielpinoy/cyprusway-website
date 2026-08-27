import type { TranslationKey } from '../i18n/dictionary';

/**
 * The eleven interest slugs.
 *
 * TODO(contracts): replaced by the client_config RPC. Until that exists this list is
 * a fourth hand-maintained copy — the app's `interestTags.ts`, `trip-generate`'s
 * `VALID_INTEREST_TAGS`, migration 0019, and this. The database CHECK constraint is
 * what enforces it: a wrong value throws Postgres 23514 and the write fails, so drift
 * is loud on write and silent on labels.
 *
 * There is no `villages` and no `water_sports` — neither exists. `petes_picks` is not
 * a profile interest.
 *
 * The label comes from the dictionary keyed by slug, so rewording a label cannot
 * desynchronise it from the constraint.
 */

export const INTEREST_SLUGS = [
  'beach_coast',
  'ancient_ruins',
  'local_food',
  'wine_villages',
  'nature_trails',
  'nightlife',
  'adventure',
  'culture_art',
  'kid_friendly',
  'hidden_gems',
  'churches_monasteries',
] as const;

export type InterestSlug = (typeof INTEREST_SLUGS)[number];

export function interestLabelKey(slug: InterestSlug): TranslationKey {
  return `onb_i_${slug}` as TranslationKey;
}

/** 24px circular thumbnails, kept from the onboarding branch. */
export function interestImage(slug: InterestSlug): string {
  return `/images/interests/${slug}.png`;
}
