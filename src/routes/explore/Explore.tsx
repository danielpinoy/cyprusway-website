import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { X } from 'lucide-react';

import { Layout } from '../../components/shell/Layout';
import { PlaceCard } from '../../components/home/PlaceCard';
import { Button } from '../../components/ui/Button';
import { useI18n } from '../../i18n/I18nProvider';
import { INTEREST_SLUGS, interestLabelKey } from '../../contracts/interests';
import { isTravelerType, travelerLabelKey } from '../../contracts/travelerPools';
import { Icon } from '../../components/ui/Icon';
import {
  EXPLORE_PAGE_SIZE,
  filterPlaces,
  interestOptions,
  regionOptions,
} from '../../lib/explore';
import { explorePool } from '../../lib/rails';
import { useHomeData } from '../home/useHomeData';
import { ShellError } from '../home/ShellError';
import { MisconfiguredNotice } from '../home/MisconfiguredNotice';
import { ExploreEmpty } from './ExploreEmpty';
import { FilterRow, type FilterChoice } from './FilterRow';
import styles from './Explore.module.css';

/**
 * Explore — the browse grid.
 *
 * **The catalogue, not a ranking.** Every published place appears, whether or not it has a
 * prominence score, ordered by prominence with unscored places last. That is a different
 * rule from the homepage rails on purpose, and the reason is recorded in docs/PARKED.md so
 * it is not later "fixed" into consistency: requiring a score here would hide 37 tavernas,
 * 10 bars and 7 nightlife venues, every one of them unscored as well as unphotographed, and
 * would return Food and Nightlife to zero results.
 *
 * Filters live in the URL — `?region=paphos&interest=beach_coast` — so a filtered view is
 * linkable and survives a reload. Both single-select, both backend slugs, absent meaning all.
 * An unrecognised value is ignored rather than erroring.
 */
export default function Explore() {
  const { t, lang } = useI18n();
  const data = useHomeData();
  const [params, setParams] = useSearchParams();
  const [visible, setVisible] = useState(EXPLORE_PAGE_SIZE);
  const gridRef = useRef<HTMLUListElement>(null);
  const focusFrom = useRef<number | null>(null);

  const rawRegion = params.get('region');
  const rawInterest = params.get('interest');
  const rawWith = params.get('with');

  const places = useMemo(() => explorePool(data.places), [data.places]);

  /**
   * Both filters are validated before use — against the catalogue for a region, against the
   * vocabulary for an interest — so a stale or hand-edited link degrades to "all" rather
   * than to an empty grid with no explanation.
   *
   * **And neither is applied until the catalogue has loaded.** That is load-bearing, not
   * incidental. This page is prerendered once, with no query string, and the browser then
   * hydrates that same file at `?region=paphos&interest=beach_coast`. React does not patch
   * attribute mismatches it finds during hydration — it keeps what the server sent — and it
   * only writes an attribute again when its own model changes. So a chip whose `aria-pressed`
   * disagreed at that moment would stay wrong for the life of the page, silently, while every
   * later render insisted otherwise.
   *
   * Measured, in a real build under `wrangler dev`: the interest row said "All Interests" was
   * pressed while the grid showed five beaches, and clicking a chip did not move it. The
   * region row was correct by accident — it was already derived from the not-yet-loaded
   * catalogue, so it was null on both sides. Gating both on `ready` makes that deliberate.
   */
  const ready = data.status !== 'loading';
  const region = useMemo(
    () => (ready && places.some((p) => p.regionSlug === rawRegion) ? rawRegion : null),
    [ready, places, rawRegion],
  );
  const interest = useMemo(
    () => (ready && INTEREST_SLUGS.some((s) => s === rawInterest) ? rawInterest : null),
    [ready, rawInterest],
  );
  /* Same validation and the same `ready` gate as the other two: a stale or hand-edited
     `?with=` degrades to "all travellers" rather than to an empty grid, and nothing is
     applied before the catalogue has loaded — the hydration rule this page already
     carries, which applies identically to a third axis. */
  const travelerType = useMemo(
    () => (ready && isTravelerType(rawWith) ? rawWith : null),
    [ready, rawWith],
  );

  const regions = useMemo(
    () => regionOptions(places, interest, lang, travelerType),
    [places, interest, lang, travelerType],
  );
  const interests = useMemo(
    () => interestOptions(places, region, travelerType),
    [places, region, travelerType],
  );
  const results = useMemo(
    () => filterPlaces(places, { region, interest, travelerType }),
    [places, region, interest, travelerType],
  );

  useEffect(() => {
    setVisible(EXPLORE_PAGE_SIZE);
  }, [region, interest, travelerType]);

  /* Load More moves focus to the first newly added card, so a keyboard user continues from
     where the list grew rather than being returned to the top of the page. */
  useEffect(() => {
    const index = focusFrom.current;
    if (index == null) return;
    focusFrom.current = null;
    const card = gridRef.current?.children[index]?.querySelector('a');
    if (card instanceof HTMLElement) card.focus();
  }, [visible]);

  function select(key: 'region' | 'interest' | 'with', value: string | null) {
    const next = new URLSearchParams(params);
    if (value == null) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: false });
  }

  if (import.meta.env.DEV && data.status === 'misconfigured') {
    return <MisconfiguredNotice onRetry={data.retry} />;
  }
  if (data.status === 'error' || data.status === 'misconfigured') {
    return <ShellError onReload={data.retry} />;
  }

  const regionChoices: FilterChoice[] = [
    { value: null, label: t('ui_explore_all_regions') },
    ...regions.map((r) => ({ value: r.slug, label: r.name, count: r.count })),
  ];

  const interestChoices: FilterChoice[] = [
    { value: null, label: t('ui_explore_all_interests') },
    ...interests.map((option) => ({
      value: option.slug,
      label: t(interestLabelKey(option.slug)),
      count: option.count,
    })),
  ];

  const shown = results.slice(0, visible);
  const loading = data.status === 'loading';

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.inner}>
          <h1 className="cw-visually-hidden">{t('ui_explore_title')}</h1>

          <div className={styles.filters}>
            <FilterRow
              label={t('ui_explore_region_filter')}
              choices={regionChoices}
              selected={region}
              onSelect={(value) => select('region', value)}
            />
            <FilterRow
              label={t('ui_explore_interest_filter')}
              choices={interestChoices}
              selected={interest}
              onSelect={(value) => select('interest', value)}
            />
          </div>

          {/* The traveller filter, as one dismissible pill rather than a third chip row.
              See ExploreFilters.travelerType for the measurement behind that. */}
          {travelerType && (
            <p className={styles.pill}>
              <span>
                {t('ui_traveller_current', { type: t(travelerLabelKey(travelerType)) })}
              </span>
              <button
                type="button"
                className={styles.pillClear}
                onClick={() => select('with', null)}
                aria-label={t('ui_traveller_clear')}
              >
                <Icon as={X} size={14} />
              </button>
            </p>
          )}

          <div className={styles.summary}>
            <p className={styles.count} role="status">
              {loading
                ? t('ui_loading')
                : results.length === shown.length
                  ? t('ui_explore_count', { count: results.length })
                  : t('ui_explore_count_partial', {
                      shown: shown.length,
                      count: results.length,
                    })}
            </p>
          </div>

          {loading ? (
            <ul className={styles.grid} aria-busy="true">
              {Array.from({ length: EXPLORE_PAGE_SIZE }, (_, i) => (
                <li key={i} className={styles.skeleton} aria-hidden="true" />
              ))}
            </ul>
          ) : results.length === 0 ? (
            <ExploreEmpty
              places={places}
              region={region}
              interest={interest}
              travelerType={travelerType}
              onClear={() => setParams(new URLSearchParams(), { replace: false })}
              onPickInterest={(value) => select('interest', value)}
            />
          ) : (
            <>
              <ul className={styles.grid} ref={gridRef}>
                {shown.map((place) => (
                  <li key={place.id}>
                    <PlaceCard place={place} size="grid" />
                  </li>
                ))}
              </ul>

              {shown.length < results.length && (
                <div className={styles.more}>
                  <Button
                    variant="dark"
                    onClick={() => {
                      focusFrom.current = shown.length;
                      setVisible((n) => n + EXPLORE_PAGE_SIZE);
                    }}
                  >
                    {t('ui_explore_load_more')}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
