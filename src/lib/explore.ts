import { INTEREST_SLUGS, type InterestSlug } from '../contracts/interests';
import { categoriesForInterests } from '../contracts/interestCategories';
import { matchesTravelerType, type TravelerType } from '../contracts/travelerPools';
import type { Place } from './places';
import type { LanguageCode } from '../i18n/languages';
import { localised } from './places';

/**
 * Explore's filtering, as pure functions over the catalogue already in memory.
 *
 * There is no per-filter round trip: the single 181-row fetch the homepage already makes
 * feeds this too, so changing a chip is instant and works offline once loaded.
 *
 * The interest filter goes through `interestCategories.ts` — the same map Top
 * Recommendations uses, not a second one. If it needs changing it changes there, and it is
 * recorded in docs/PARKED.md as a taxonomy call that belongs on the server.
 */

export const EXPLORE_PAGE_SIZE = 20;

export interface ExploreFilters {
  region: string | null;
  interest: string | null;
  /**
   * The traveller type, from `?with=`.
   *
   * A THIRD AXIS BUT NOT A THIRD CHIP ROW, and the measurement is why. Traveller ×
   * interest is **20 of 44 cells empty** — solo × local_food 0, couple × beach_coast 0,
   * friends × nature_trails 0, and `hidden_gems` 0 for all four because it maps to nothing
   * by design — before a region is even chosen. A row of five chips beside the existing
   * eleven would invite combining axes that mostly produce the empty state, on a page whose
   * two rows already overflow at common widths (`FilterRow`'s own note).
   *
   * So it is set elsewhere — the chooser, the footer's four links, a shared URL — and shown
   * here as one dismissible pill. Explore looks exactly as it did for anyone who has not
   * set a type, which is every visitor who has not been through the chooser.
   */
  travelerType: TravelerType | null;
}

export interface RegionOption {
  slug: string;
  name: string;
  count: number;
}

export interface InterestOption {
  slug: InterestSlug;
  /** How many places this chip would show, given the region currently selected. */
  count: number;
  /** True when the interest reaches no CMS category at all, not merely no places.
   *  `hidden_gems` is the only one today, and it needs different empty copy. */
  unmapped: boolean;
}

function matchesRegion(place: Place, region: string | null): boolean {
  return region == null || place.regionSlug === region;
}

function matchesInterest(place: Place, interest: string | null): boolean {
  if (interest == null) return true;
  const wanted = categoriesForInterests([interest]);
  return place.categorySlug != null && wanted.has(place.categorySlug);
}

export function filterPlaces(places: readonly Place[], filters: ExploreFilters): Place[] {
  return places.filter(
    (place) =>
      matchesRegion(place, filters.region) &&
      matchesInterest(place, filters.interest) &&
      (filters.travelerType == null || matchesTravelerType(place, filters.travelerType)),
  );
}

/**
 * The region chips, derived from the catalogue rather than hardcoded — `destination` carries
 * `{slug, name}` in all five languages, so the labels are translated for free and a seventh
 * region appearing in Directus needs no code change.
 *
 * Counts respect the interest currently selected, so the pair always describes what a click
 * would actually do.
 */
export function regionOptions(
  places: readonly Place[],
  interest: string | null,
  lang: LanguageCode,
  travelerType: TravelerType | null = null,
): RegionOption[] {
  const seen = new Map<string, RegionOption>();
  for (const place of places) {
    if (!place.regionSlug) continue;
    if (!seen.has(place.regionSlug)) {
      seen.set(place.regionSlug, {
        slug: place.regionSlug,
        name: localised(place.regionName, lang),
        count: 0,
      });
    }
    /* The traveller filter counts too: a chip saying "Paphos 17" while the grid shows 4
       would be describing a click that does not happen. */
    if (
      matchesInterest(place, interest) &&
      (travelerType == null || matchesTravelerType(place, travelerType))
    ) {
      (seen.get(place.regionSlug) as RegionOption).count += 1;
    }
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The interest chips, in the fixed vocabulary order, each with the number of places it would
 * show under the region currently selected.
 *
 * The count is shown rather than the chip being disabled. A disabled chip hides that the
 * category exists at all, which is the wrong message: someone who cares about nightlife
 * should be able to see that we know the category exists and are not there yet. The number
 * also degrades correctly as the region narrows — "Beaches 0" with Troodos selected explains
 * itself before the click.
 */
export function interestOptions(
  places: readonly Place[],
  region: string | null,
  travelerType: TravelerType | null = null,
): InterestOption[] {
  return INTEREST_SLUGS.map((slug) => {
    const wanted = categoriesForInterests([slug]);
    return {
      slug,
      unmapped: wanted.size === 0,
      count: places.filter(
        (place) =>
          matchesRegion(place, region) &&
          (travelerType == null || matchesTravelerType(place, travelerType)) &&
          place.categorySlug != null &&
          wanted.has(place.categorySlug),
      ).length,
    };
  });
}

/**
 * When a filter pair returns nothing, the most useful thing to offer is an interest that
 * does have places in the region the person picked. Computed from the same catalogue, so it
 * can never suggest something that is also empty.
 */
export function suggestInterestForRegion(
  places: readonly Place[],
  region: string | null,
  exclude: string | null,
): InterestSlug | null {
  const ranked = interestOptions(places, region)
    .filter((option) => option.slug !== exclude && option.count > 0)
    .sort((a, b) => b.count - a.count);
  return ranked[0]?.slug ?? null;
}
