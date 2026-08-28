import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { PlaceCard } from '../../components/home/PlaceCard';
import { useDialog } from '../../components/ui/useDialog';
import { useI18n } from '../../i18n/I18nProvider';
import { interestLabelKey } from '../../contracts/interests';
import { categoriesForInterests } from '../../contracts/interestCategories';
import { interestOptions } from '../../lib/explore';
import { fetchPlaces, localised, type Place } from '../../lib/places';
import { MAX_STOPS_PER_DAY } from '../../lib/trips';
import styles from './AddToTrip.module.css';

/**
 * Add to trip — Figma `3429-16644`.
 *
 * **The frame's per-day time chip is not here.** `trip-edit` takes POIs by id only; the
 * deployed function refuses anything else with *"stops are sent by place_id only; times,
 * legs and lunch are server-derived"*. Where a stop lands is the packing rule: an appended
 * stop starts when the one before it ends, plus the leg between them. The app hit the same
 * conflict and resolved it the same way — in the contract's favour — and rather than draw a
 * control that cannot be honoured, the panel says in one line what happens instead.
 *
 * **The catalogue is filtered to `plannable`.** `trip-edit` refuses a NEW stop at an
 * unplannable place, and 35 of the 181 published places are unplannable. Filtering here
 * makes `place_not_plannable` unreachable rather than something to handle — measured:
 * 146 plannable, every one with coordinates.
 *
 * **The search box is a client-side substring filter.** The frame's placeholder says
 * "Search places and experiences in Cyprus", which is the catalogue-wide semantic search
 * that has no client-reachable endpoint and stays parked. This filters a list already in
 * memory, which is a different thing wearing the same word, and is what the app does here.
 */
export function AddToTrip({
  open,
  onClose,
  days,
  initialDay,
  existingByDay,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  days: number;
  initialDay: number;
  /** place_ids already on each day, so a duplicate cannot be chosen — the contract
   *  refuses the same place twice in one day (R6). */
  existingByDay: readonly (readonly number[])[];
  onAdd: (dayIndex: number, placeIds: number[]) => void;
}) {
  const { t, lang } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const [dayIndex, setDayIndex] = useState(initialDay);
  const [interest, setInterest] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [failed, setFailed] = useState(false);

  useDialog(panelRef, { open, dismissible: true, onClose });

  /* The catalogue is fetched when the panel first opens, not with the trip: a visitor who
     never adds a stop never pays for it. */
  useEffect(() => {
    if (!open || places !== null) return;
    let cancelled = false;
    void fetchPlaces()
      .then((rows) => {
        if (!cancelled) setPlaces(rows.filter((place) => place.plannable));
      })
      .catch((error) => {
        console.warn('[trip] catalogue read failed:', error);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, places]);

  useEffect(() => {
    if (open) {
      setDayIndex(initialDay);
      setSelected([]);
    }
  }, [open, initialDay]);

  const interests = useMemo(() => interestOptions(places ?? [], null), [places]);

  const existing = useMemo(
    () => new Set(existingByDay[dayIndex] ?? []),
    [existingByDay, dayIndex],
  );

  const room = Math.max(0, MAX_STOPS_PER_DAY - (existingByDay[dayIndex]?.length ?? 0));

  const results = useMemo(() => {
    const wanted = interest ? categoriesForInterests([interest]) : null;
    const needle = query.trim().toLowerCase();
    return (places ?? []).filter((place) => {
      if (wanted && (place.categorySlug == null || !wanted.has(place.categorySlug))) {
        return false;
      }
      if (!needle) return true;
      const region = localised(place.regionName, lang).toLowerCase();
      return place.name.toLowerCase().includes(needle) || region.includes(needle);
    });
  }, [places, interest, query, lang]);

  if (!open || typeof document === 'undefined') return null;

  function toggle(id: number) {
    setSelected((previous) =>
      previous.includes(id)
        ? previous.filter((value) => value !== id)
        : previous.length >= room
          ? previous
          : [...previous, id],
    );
  }

  return createPortal(
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={styles.panel}
      >
        <header className={styles.head}>
          <h2 id={titleId} className={styles.title}>
            {t('ui_trip_add_title')}
          </h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label={t('onb_close')}>
            <Icon as={X} size={20} />
          </button>
        </header>

        <div className={styles.scroll}>
          <fieldset className={styles.step}>
            <legend className={styles.stepTitle}>{t('ui_trip_add_step_day')}</legend>
            <ul className={styles.dayList}>
              {Array.from({ length: days }, (_, index) => (
                <li key={index}>
                  <button
                    type="button"
                    className={styles.dayButton}
                    aria-pressed={dayIndex === index}
                    onClick={() => setDayIndex(index)}
                  >
                    {t('ui_trip_day_n', { n: index + 1 })}
                  </button>
                </li>
              ))}
            </ul>
            {/* In place of the frame's time chip. */}
            <p className={styles.note}>{t('ui_trip_add_time_note')}</p>
            {room === 0 && (
              <p className={styles.full} role="status">
                {t('ui_trip_add_full', { max: MAX_STOPS_PER_DAY })}
              </p>
            )}
          </fieldset>

          <fieldset className={styles.step}>
            <legend className={styles.stepTitle}>{t('ui_trip_add_step_explore')}</legend>
            <ul className={styles.chips}>
              <li>
                <button
                  type="button"
                  className={styles.chip}
                  aria-pressed={interest === null}
                  onClick={() => setInterest(null)}
                >
                  {t('ui_trip_add_all_interests')}
                </button>
              </li>
              {interests.map((option) => (
                <li key={option.slug}>
                  <button
                    type="button"
                    className={styles.chip}
                    aria-pressed={interest === option.slug}
                    onClick={() => setInterest(option.slug)}
                  >
                    {t(interestLabelKey(option.slug))}
                  </button>
                </li>
              ))}
            </ul>

            <label className={styles.searchLabel} htmlFor="cw-trip-filter">
              <span className="cw-visually-hidden">{t('ui_trip_add_search')}</span>
              <input
                id="cw-trip-filter"
                type="search"
                className={styles.search}
                value={query}
                placeholder={t('ui_trip_add_search')}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </fieldset>

          {failed ? (
            <p className={styles.empty}>{t('ui_error_body')}</p>
          ) : places === null ? (
            <p className={styles.empty}>{t('ui_loading')}</p>
          ) : results.length === 0 ? (
            <p className={styles.empty}>{t('ui_trip_add_empty')}</p>
          ) : (
            <ul className={styles.grid}>
              {results.map((place) => {
                const already = existing.has(place.id);
                const chosen = selected.includes(place.id);
                return (
                  <li key={place.id}>
                    <PlaceCard
                      place={place}
                      size="grid"
                      select={{
                        selected: chosen,
                        disabled: already || (!chosen && selected.length >= room),
                        onToggle: () => toggle(place.id),
                      }}
                    />
                    {already && <p className={styles.already}>{t('ui_trip_add_already')}</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className={styles.foot}>
          <p className={styles.count} role="status">
            {t('ui_trip_add_selected', { count: selected.length })}
          </p>
          <Button
            variant="primary"
            fullWidth
            disabled={selected.length === 0}
            onClick={() => {
              onAdd(dayIndex, selected);
              onClose();
            }}
          >
            {t('ui_trip_add_cta')}
          </Button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
