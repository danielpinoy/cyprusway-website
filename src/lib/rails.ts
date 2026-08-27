import { categoriesForInterests } from '../contracts/interestCategories';
import type { Place } from './places';

/**
 * How each rail is derived from the one query. Pure functions, no React, no network —
 * so the rules are readable in one place and testable without a browser.
 *
 * Every count and rank band below was measured against the live catalogue on
 * 28 August 2026. They are TODO(contracts) values: a client_config RPC should eventually
 * own how many cards a rail holds and which band it draws from.
 */

/** Cards in each rail, from the Figma frames. */
export const TOP_RECOMMENDATIONS_COUNT = 4;
export const POPULAR_COUNT = 6;
export const FOOD_WINE_COUNT = 6;
export const TOURS_COUNT = 3;
export const SAVED_PLACES_COUNT = 4;

/**
 * Popular draws from ranks 9–30 of the renderable pool — 22 candidates today.
 *
 * Rank 9 starts below the four cards a signed-out Top Recommendations takes, and rank 30
 * is where prominence has fallen from 95.9 to 84.5 — still comfortably notable.
 *
 * **The band alone no longer guarantees no overlap, and that is a deliberate change.**
 * The original plan leaned on disjoint rank ranges precisely to avoid exclusion logic that
 * could fall out of sync. That worked while Top Recommendations only ever took the head.
 * It does not survive interest-aware ranking: someone who picks culture_art gets their
 * best museum, which may sit at rank 40 — or at rank 15, inside this band. So Popular now
 * takes the ids Top already used and skips them. One filter, computed from the same render,
 * so there is nothing to keep in sync.
 *
 * TODO(contracts): the band is a stand-in for a popularity signal that does not exist.
 * There is no view counter, no save counter and no curated flag; `prominence` is an
 * editorial importance score. Ruled deliberate, not placeholder — see docs/PARKED.md.
 */
export const POPULAR_BAND_START = 8; // inclusive, 0-based → rank 9
export const POPULAR_BAND_END = 30; // exclusive, 0-based → rank 30

/**
 * Published AND prominence-scored AND hero-bearing — 72 of 181 places today.
 *
 * The hero filter follows the app's own ruling: "a photo card without a photo has no
 * designed state, so the filter IS the placeholder." Food & Wine Picks is the one rail
 * that deliberately does not use this pool.
 */
export function renderablePool(places: readonly Place[]): Place[] {
  return places.filter((place) => place.prominence != null && place.heroUrl != null);
}

/**
 * Top Recommendations — one card per interest before a second card for any interest.
 *
 * ## Why this is not the simpler thing
 *
 * Filtering was the original specification, and it does not survive contact with the
 * catalogue: six of the eleven interests have fewer than four places that are both scored
 * and photographed — `local_food` 0 of 37, `nightlife` 0 of 17, `kid_friendly` 2 of 33 —
 * so a filter would show those users a rail made entirely of backfill.
 *
 * The first replacement was a stable partition: matches to the front, prominence order
 * preserved. It was **too weak to see**, and that was measured against the live catalogue,
 * not guessed. For a person who picked ancient_ruins + nature_trails + beach_coast, three
 * interests reach six of the eighteen categories, which already covers five of the six
 * highest-prominence places — so the re-rank displaced exactly one card and produced
 * **zero beaches**, despite `beaches` being the largest renderable pool of any interest
 * (18 places). Nissi Beach lost its place to a prominence tie broken by row id.
 *
 * ## What it does instead
 *
 * Each interest gets a queue of its places in prominence order. The rail is filled in
 * rounds: every interest contributes at most one card per round, and within a round the
 * strongest candidate goes first. Then it backfills from the pool.
 *
 * The properties that matter:
 *
 *  - **Every interest that has anything to show appears**, as long as there are slots. A
 *    beach lover sees a beach.
 *  - **A weak interest contributes one card, not four.** The round structure bounds it.
 *  - **It still cannot produce an empty or short rail.** Interests with no renderable
 *    places contribute nothing and the backfill covers the rest, so `nightlife` alone —
 *    or `hidden_gems`, which maps to nothing on purpose — degrades to the plain prominence
 *    order rather than to two cards.
 *  - **A place can be reached by two interests** (`waterparks` is in both `adventure` and
 *    `kid_friendly`); it is taken once, by whichever round reaches it first.
 */
export interface RankedPlace {
  place: Place;
  /** The interest that put it here, or null when it came from the prominence backfill. */
  viaInterest: string | null;
  /** 1-based round, or null for backfill. Only used by the dev inspector. */
  round: number | null;
}

export function rankTopRecommendations(
  pool: readonly Place[],
  interests: readonly string[],
  count: number = TOP_RECOMMENDATIONS_COUNT,
): RankedPlace[] {
  const queues: { interest: string; places: Place[] }[] = [];

  for (const interest of interests) {
    const wanted = categoriesForInterests([interest]);
    if (wanted.size === 0) continue;
    const places = pool.filter((p) => p.categorySlug != null && wanted.has(p.categorySlug));
    if (places.length > 0) queues.push({ interest, places });
  }

  const picked: RankedPlace[] = [];
  const taken = new Set<number>();
  const cursors = new Map<string, number>();

  for (let round = 1; picked.length < count && queues.length > 0; round += 1) {
    /* Each interest offers its next unused place; the strongest offer goes first. Pool
       order is prominence order, so an earlier index is a stronger candidate. */
    const offers: { interest: string; place: Place; rank: number }[] = [];

    for (const queue of queues) {
      let cursor = cursors.get(queue.interest) ?? 0;
      while (cursor < queue.places.length && taken.has((queue.places[cursor] as Place).id)) {
        cursor += 1;
      }
      cursors.set(queue.interest, cursor);
      const place = queue.places[cursor];
      if (place) offers.push({ interest: queue.interest, place, rank: pool.indexOf(place) });
    }

    if (offers.length === 0) break;
    offers.sort((a, b) => a.rank - b.rank);

    for (const offer of offers) {
      if (picked.length >= count) break;
      if (taken.has(offer.place.id)) continue;
      taken.add(offer.place.id);
      cursors.set(offer.interest, (cursors.get(offer.interest) ?? 0) + 1);
      picked.push({ place: offer.place, viaInterest: offer.interest, round });
    }
  }

  /* Backfill in prominence order. Also the whole answer when there are no interests, or
     when none of them reaches anything renderable. */
  for (const place of pool) {
    if (picked.length >= count) break;
    if (taken.has(place.id)) continue;
    taken.add(place.id);
    picked.push({ place, viaInterest: null, round: null });
  }

  return picked;
}

export function topRecommendations(
  pool: readonly Place[],
  interests: readonly string[],
): Place[] {
  return rankTopRecommendations(pool, interests).map((r) => r.place);
}

/**
 * The Popular band, before shuffling.
 *
 * `exclude` is whatever Top Recommendations took. Skipping rather than back-filling the
 * band keeps the candidates strictly inside ranks 9–30: with a typical three-interest
 * selection the band loses one or two candidates out of 22, which is ample for six cards.
 */
export function popularBand(pool: readonly Place[], exclude: ReadonlySet<number>): Place[] {
  return pool
    .slice(POPULAR_BAND_START, POPULAR_BAND_END)
    .filter((place) => !exclude.has(place.id));
}

/**
 * See Cyprus before you go.
 *
 * `virtual_tour` is null on 181 of 181 published places, so this returns nothing today
 * and the section renders nothing. Built properly so the rail appears with no code change
 * the day a tour row lands.
 */
export function tourPlaces(places: readonly Place[]): Place[] {
  return places.filter((place) => place.hasTour && place.heroUrl != null).slice(0, TOURS_COUNT);
}

/**
 * Food & Wine Picks.
 *
 * TODO(contracts): the category list is a client-side reading of the rail's name.
 *
 * The one rail that does not use the renderable pool, because its places are real even
 * without a photograph. Ordered by prominence with unscored places last, which today
 * yields six photographed wine villages: measured 28 Aug, `villages` is 9 places with
 * 9 heroes and 9 scores, while `tavernas` is 37 places with **0 heroes and 0 scores**.
 * The fallback tile is therefore built but unused here until the pool runs short — it is
 * needed regardless for Popular, whose band holds 5 heroless places out of 22.
 */
export const FOOD_WINE_CATEGORIES = ['villages', 'tavernas'] as const;

export function foodAndWine(places: readonly Place[]): Place[] {
  const categories: readonly string[] = FOOD_WINE_CATEGORIES;
  return places
    .filter((place) => place.categorySlug != null && categories.includes(place.categorySlug))
    .sort(byProminenceNullsLast)
    .slice(0, FOOD_WINE_COUNT);
}

/** Prominence descending, unscored last, `id` breaking ties deterministically. */
function byProminenceNullsLast(a: Place, b: Place): number {
  if (a.prominence == null && b.prominence == null) return a.id - b.id;
  if (a.prominence == null) return 1;
  if (b.prominence == null) return -1;
  if (a.prominence !== b.prominence) return b.prominence - a.prominence;
  return a.id - b.id;
}
