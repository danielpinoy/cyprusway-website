import { useEffect, useState } from 'react';

import { INTEREST_CATEGORIES } from '../../contracts/interestCategories';
import { categoriesForInterests } from '../../contracts/interestCategories';
import { rankTopRecommendations, renderablePool } from '../../lib/rails';
import type { Place } from '../../lib/places';
import styles from './RankInspector.module.css';

/**
 * `?debug=rank` — what the Top Recommendations sort actually received, and what it did
 * with it. Dev-only; stripped from production builds.
 *
 * This exists because the first version of the ranking looked broken from the outside and
 * was not: a three-interest selection produced a rail with no beaches in it, and the only
 * way to tell "the interests never arrived" from "the interests arrived and the mechanism
 * is too weak" was to read card titles and guess. Both are one-line fixes and they are
 * completely different bugs. Now the page can say which.
 */
export function useRankDebug(): boolean {
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    setOn(new URLSearchParams(window.location.search).get('debug') === 'rank');
  }, []);

  return on;
}

export function RankInspector({
  places,
  interests,
}: {
  places: readonly Place[];
  interests: readonly string[];
}) {
  const pool = renderablePool(places);
  const ranked = rankTopRecommendations(pool, interests);
  const wanted = categoriesForInterests(interests);

  const perInterest = interests.map((interest) => {
    const categories = INTEREST_CATEGORIES[interest as keyof typeof INTEREST_CATEGORIES];
    const matches = categories
      ? pool.filter((p) => p.categorySlug != null && categories.includes(p.categorySlug))
      : [];
    return { interest, categories: categories ?? null, matches };
  });

  const unknown = interests.filter(
    (i) => !(i in INTEREST_CATEGORIES),
  );

  return (
    <aside className={styles.panel}>
      <h2 className={styles.heading}>Top Recommendations — rank debug</h2>

      <dl className={styles.facts}>
        <dt>interests received</dt>
        <dd>{interests.length === 0 ? '(none — signed out, or empty profile)' : JSON.stringify(interests)}</dd>
        <dt>categories wanted</dt>
        <dd>{wanted.size === 0 ? '(none)' : [...wanted].join(', ')}</dd>
        <dt>renderable pool</dt>
        <dd>
          {pool.length} of {places.length} published (scored AND hero-bearing)
        </dd>
        {unknown.length > 0 && (
          <>
            <dt className={styles.warn}>slugs with no entry in the map</dt>
            <dd className={styles.warn}>{unknown.join(', ')}</dd>
          </>
        )}
      </dl>

      <table className={styles.table}>
        <caption>Per interest</caption>
        <thead>
          <tr>
            <th>interest</th>
            <th>mapped categories</th>
            <th>renderable</th>
            <th>its best</th>
          </tr>
        </thead>
        <tbody>
          {perInterest.map(({ interest, categories, matches }) => (
            <tr key={interest} className={matches.length === 0 ? styles.warn : undefined}>
              <td>{interest}</td>
              <td>{categories == null ? 'NOT IN MAP' : categories.length === 0 ? '(unmapped on purpose)' : categories.join(', ')}</td>
              <td>{matches.length}</td>
              <td>{matches[0] ? `${matches[0].name} (${matches[0].prominence})` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className={styles.table}>
        <caption>What the rail shows, and why</caption>
        <thead>
          <tr>
            <th>#</th>
            <th>place</th>
            <th>category</th>
            <th>prominence</th>
            <th>pool rank</th>
            <th>picked by</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((entry, index) => (
            <tr key={entry.place.id}>
              <td>{index + 1}</td>
              <td>{entry.place.name}</td>
              <td>{entry.place.categorySlug}</td>
              <td>{entry.place.prominence}</td>
              <td>{pool.indexOf(entry.place) + 1}</td>
              <td>
                {entry.viaInterest
                  ? `${entry.viaInterest}, round ${entry.round}`
                  : 'prominence backfill'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </aside>
  );
}
