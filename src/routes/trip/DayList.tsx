import { useId } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Car,
  ExternalLink,
  Footprints,
  MapPin,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react';

import { Icon } from '../../components/ui/Icon';
import { useI18n } from '../../i18n/I18nProvider';
import { directusImageSrcSet, directusImageUrl } from '../../lib/directusImage';
import { localised, type LocalisedName } from '../../lib/places';
import type { TripElement } from '../../lib/tripEdit';
import { formatDayHeading, formatTime, relativeDayKey } from '../../lib/tripDates';
import type { EditorDay } from './useTripEditor';
import styles from './DayList.module.css';

const DISC = { width: 64, height: 64 };

/** Stops only. Lunch is server-derived and is drawn separately. */
function isStop(element: TripElement): boolean {
  return element.type === 'poi' && typeof element.place_id === 'number';
}

function usableCoords(element: TripElement): { lat: number; lng: number } | null {
  const { lat, lng } = element;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

export function DayList({
  days,
  categoryNames,
  collapsed,
  onToggleDay,
  onMoveStop,
  onMoveStopToDay,
  onRemoveStop,
  onRemoveDay,
}: {
  days: readonly EditorDay[];
  /** Localised primary-category name by place id, from the catalogue (see Trip.tsx). */
  categoryNames: ReadonlyMap<number, LocalisedName>;
  collapsed: ReadonlySet<number>;
  onToggleDay: (key: number) => void;
  onMoveStop: (dayIndex: number, poiIndex: number, direction: -1 | 1) => void;
  onMoveStopToDay: (dayIndex: number, poiIndex: number, toDay: number) => void;
  onRemoveStop: (dayIndex: number, poiIndex: number) => void;
  onRemoveDay: (dayIndex: number) => void;
}) {
  return (
    <ol className={styles.days}>
      {days.map((day, dayIndex) => (
        <li key={day.key}>
          <Day
            day={day}
            dayIndex={dayIndex}
            dayCount={days.length}
            categoryNames={categoryNames}
            collapsed={collapsed.has(day.key)}
            onToggle={() => onToggleDay(day.key)}
            onMoveStop={onMoveStop}
            onMoveStopToDay={onMoveStopToDay}
            onRemoveStop={onRemoveStop}
            onRemoveDay={onRemoveDay}
          />
        </li>
      ))}
    </ol>
  );
}

function Day({
  day,
  dayIndex,
  dayCount,
  categoryNames,
  collapsed,
  onToggle,
  onMoveStop,
  onMoveStopToDay,
  onRemoveStop,
  onRemoveDay,
}: {
  day: EditorDay;
  dayIndex: number;
  dayCount: number;
  categoryNames: ReadonlyMap<number, LocalisedName>;
  collapsed: boolean;
  onToggle: () => void;
  onMoveStop: (dayIndex: number, poiIndex: number, direction: -1 | 1) => void;
  onMoveStopToDay: (dayIndex: number, poiIndex: number, toDay: number) => void;
  onRemoveStop: (dayIndex: number, poiIndex: number) => void;
  onRemoveDay: (dayIndex: number) => void;
}) {
  const { t, lang } = useI18n();
  const panelId = useId();
  const number = dayIndex + 1;

  const heading = formatDayHeading(day.date, lang);
  const tag = relativeDayKey(day.date);
  const stops = day.pois.filter(isStop);

  return (
    <section className={styles.day}>
      <header className={styles.dayHead}>
        <div className={styles.dayText}>
          {heading && <p className={styles.dayDate}>{heading}</p>}
          <p className={styles.dayNumber}>
            {t('ui_trip_day_n', { n: number })}
            {tag && (
              <span className={styles.tag}>
                {tag === 'today' ? t('ui_trip_today') : t('ui_trip_tomorrow')}
              </span>
            )}
          </p>
        </div>

        <div className={styles.dayActions}>
          {dayCount > 1 && (
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => onRemoveDay(dayIndex)}
              aria-label={t('ui_trip_remove_day', { n: number })}
            >
              <Icon as={Trash2} size={16} />
            </button>
          )}
          {/* A real disclosure: the button owns the state and names the region it
              controls, so the chevron is decoration rather than the only signal. */}
          <button
            type="button"
            className={styles.disc}
            aria-expanded={!collapsed}
            aria-controls={panelId}
            onClick={onToggle}
          >
            <span className="cw-visually-hidden">
              {t('ui_trip_toggle_day', { n: number })}
            </span>
            <Icon as={collapsed ? ChevronUp : ChevronDown} size={16} />
          </button>
        </div>
      </header>

      <div id={panelId} hidden={collapsed}>
        {stops.length === 0 ? (
          <p className={styles.empty}>{t('ui_trip_empty_day')}</p>
        ) : (
          <ol className={styles.stops}>
            {day.pois.map((element, elementIndex) => {
              if (element.type === 'lunch') {
                /* Hidden while the day is pending: lunch position is server-derived and
                   may have moved, so showing where it used to be would be a guess. */
                const after = day.pois.slice(elementIndex + 1).find(isStop);
                return day.pending ? null : (
                  <li key={`lunch-${elementIndex}`}>
                    <LunchRow element={element} nextName={after?.name?.trim() || null} />
                  </li>
                );
              }
              if (!isStop(element)) return null;

              const stopIndex = stops.indexOf(element);
              const next = day.pois.slice(elementIndex + 1).find(isStop);

              return (
                <li key={`${element.place_id}-${elementIndex}`}>
                  <StopRow
                    element={element}
                    categoryName={
                      typeof element.place_id === 'number'
                        ? categoryNames.get(element.place_id) ?? null
                        : null
                    }
                    pending={day.pending}
                    canMoveUp={stopIndex > 0}
                    canMoveDown={stopIndex < stops.length - 1}
                    dayCount={dayCount}
                    dayIndex={dayIndex}
                    onMoveUp={() => onMoveStop(dayIndex, stopIndex, -1)}
                    onMoveDown={() => onMoveStop(dayIndex, stopIndex, 1)}
                    onMoveToDay={(toDay) => onMoveStopToDay(dayIndex, stopIndex, toDay)}
                    onRemove={() => onRemoveStop(dayIndex, stopIndex)}
                  />
                  {next && <TravelRow element={element} pending={day.pending} />}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

function StopRow({
  element,
  categoryName,
  pending,
  canMoveUp,
  canMoveDown,
  dayCount,
  dayIndex,
  onMoveUp,
  onMoveDown,
  onMoveToDay,
  onRemove,
}: {
  element: TripElement;
  /** The catalogue's name for the stop's category, or null while it loads / if the place is gone. */
  categoryName: LocalisedName | null;
  pending: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  dayCount: number;
  dayIndex: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveToDay: (toDay: number) => void;
  onRemove: () => void;
}) {
  const { t, lang } = useI18n();
  const name = element.name?.trim() || t('ui_trip_lunch');
  const coords = usableCoords(element);

  return (
    <div className={styles.stop}>
      {/* Reorder is chevrons plus a move-to-day control, not drag. The frames draw a drag
          handle and define no drag semantics, and a hand-rolled drag gesture is its own
          pass — the same call the app made, and its optimistic machinery is drag-ready. */}
      <div className={styles.reorder}>
        <button
          type="button"
          className={styles.iconButton}
          disabled={!canMoveUp || pending}
          onClick={onMoveUp}
          aria-label={t('ui_trip_move_up', { name })}
        >
          <Icon as={ChevronUp} size={14} />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          disabled={!canMoveDown || pending}
          onClick={onMoveDown}
          aria-label={t('ui_trip_move_down', { name })}
        >
          <Icon as={ChevronDown} size={14} />
        </button>
      </div>

      {element.hero_image_url ? (
        <img
          className={styles.disc64}
          src={directusImageUrl(element.hero_image_url, DISC)}
          srcSet={directusImageSrcSet(element.hero_image_url, DISC)}
          width={DISC.width}
          height={DISC.height}
          alt=""
          loading="lazy"
        />
      ) : (
        <span className={`${styles.disc64} ${styles.discEmpty}`} aria-hidden="true">
          <Icon as={MapPin} size={18} />
        </span>
      )}

      <div className={styles.stopBody}>
        <p className={styles.stopName} lang="en">
          {name}
        </p>
        {/* The frame's sub-line is a region; a stored element carries none, so the
            category stands in. Its NAME comes from the catalogue row — "Viewpoints &
            Landmarks", localised — because the stored element holds only the slug, and a
            slug de-hyphenated under a capitalise lost the ampersand. The slug is the
            fallback while the names load or if the place has left the catalogue. */}
        {(categoryName || element.category) && (
          <p
            className={categoryName ? styles.stopSubName : styles.stopSub}
            lang={categoryName ? undefined : 'en'}
          >
            {categoryName
              ? localised(categoryName, lang)
              : (element.category ?? '').replace(/-/g, ' ')}
          </p>
        )}
        {/* The model's one-line tip.
         *
         * **This is the only text generation adds to a trip.** A generated stop carries a
         * sentence here; a stop added by hand carries `""` (measured: 0 of 3 POIs on the
         * one hand-built trip in the database). Phase 5 rendered none of it, which made a
         * generated trip indistinguishable from a manual one — the whole of what was paid
         * for, dropped on the floor. Phase 6's brief called it, and it is four lines.
         *
         * Trimmed, so a manual `""` renders nothing rather than an empty paragraph.
         *
         * NO `lang` ATTRIBUTE, deliberately. The note is written by the model in the
         * profile's `preferred_language` at generation time, and **the row does not record
         * which language that was** — `generation_params.user_profile_snapshot` carries
         * pace, interests, considerations, morning and traveller type, and no language
         * (`trip-generate/index.ts:1030-1036`). Inheriting the page language is right for
         * everyone who has not switched languages since generating, and asserting a
         * specific one would be a guess wearing a fact's clothes. See BACKEND-HANDOFF §6.
         *
         * It renders through a pending day, unlike everything else in this row: times and
         * legs are re-derived by the server on every edit and must not show a stale
         * number, but a note belongs to the stop and `trip-edit` returns it untouched. */}
        {element.notes?.trim() && <p className={styles.stopNote}>{element.notes.trim()}</p>}
        <div className={styles.stopActions}>
          {coords && (
            <a
              className={styles.action}
              href={`https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`}
              target="_blank"
              rel="noreferrer"
              aria-label={t('ui_trip_directions_for', { name })}
            >
              <Icon as={ExternalLink} size={12} />
              <span>{t('ui_trip_directions')}</span>
            </a>
          )}
          {dayCount > 1 && (
            <label className={styles.action}>
              <span className="cw-visually-hidden">{t('ui_trip_move_label')}</span>
              <select
                className={styles.select}
                value=""
                disabled={pending}
                onChange={(event) => {
                  const target = Number(event.target.value);
                  if (Number.isInteger(target)) onMoveToDay(target);
                }}
              >
                <option value="">{t('ui_trip_move_label')}</option>
                {Array.from({ length: dayCount }, (_, i) => i)
                  .filter((i) => i !== dayIndex)
                  .map((i) => (
                    <option key={i} value={i}>
                      {t('ui_trip_move_to_day', { n: i + 1 })}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <button
            type="button"
            className={styles.action}
            disabled={pending}
            onClick={onRemove}
            aria-label={t('ui_trip_remove_stop', { name })}
          >
            <Icon as={Trash2} size={12} />
          </button>
        </div>
      </div>

      <p className={styles.time}>
        {pending ? (
          <span className={styles.pending} aria-label={t('ui_trip_travel_pending')}>
            &hellip;
          </span>
        ) : (
          formatTime(element.start_time, lang)
        )}
      </p>
    </div>
  );
}

/**
 * The lunch row — and where the lunch is.
 *
 * The scheduler spends the travel to the NEXT stop before lunch: the leg drawn on the stop
 * above is the leg to the stop below, lunch begins when that travel ends, and the next stop
 * begins when lunch ends with no travel of its own. Measured on the first generated trip,
 * every day: Kato Paphos ends 12:00, leg 4 min, lunch 12:04–13:34, Paphos Castle 13:34.
 * So a venue-less lunch is AT the next stop, and the sub-line says so. Without it the
 * layout — a leg row above "Lunch break", nothing between lunch and the stop — read as a
 * missing leg, which is what the first review reported. The line is true under the model
 * and turns the gap into the explanation.
 */
function LunchRow({ element, nextName }: { element: TripElement; nextName: string | null }) {
  const { t, lang } = useI18n();
  return (
    <div className={styles.stop}>
      <div className={styles.reorder} />
      <span className={`${styles.disc64} ${styles.discEmpty}`} aria-hidden="true">
        <Icon as={UtensilsCrossed} size={18} />
      </span>
      <div className={styles.stopBody}>
        <p className={styles.stopName}>{element.name?.trim() || t('ui_trip_lunch')}</p>
        {/* `stopSubName`, not `stopSub`: the latter capitalises every word, which is for a
            de-hyphenated slug and would turn this sentence into title case. */}
        {element.place_id == null && (
          <p className={styles.stopSubName}>
            {nextName ? t('ui_trip_lunch_near', { name: nextName }) : t('ui_trip_lunch_any')}
          </p>
        )}
      </div>
      <p className={styles.time}>{formatTime(element.start_time, lang)}</p>
    </div>
  );
}

/**
 * The leg between two stops.
 *
 * Minutes and mode, and nothing else — that is the whole of what the server stores.
 * `travel_mode` is `"car" | "walking"`; there is no bus in the enum and no distance
 * anywhere in the payload, so the frame's "Take a bus" and "3km away from last location"
 * have nothing behind them. Deriving kilometres from the stored coordinates would ship
 * straight-line distance as road distance, which the app measured at a median 1.46× and
 * called a lie. See docs/PARKED.md.
 */
function TravelRow({ element, pending }: { element: TripElement; pending: boolean }) {
  const { t } = useI18n();

  if (pending) {
    return (
      <p className={styles.travel}>
        <span className={styles.pending}>{t('ui_trip_travel_pending')}</span>
      </p>
    );
  }

  const minutes = element.travel_to_next_min;
  if (typeof minutes !== 'number' || !Number.isFinite(minutes)) return null;

  const walking = element.travel_mode === 'walking';
  return (
    <p className={styles.travel}>
      <Icon as={walking ? Footprints : Car} size={18} className={styles.travelIcon} />
      <span>
        {walking ? t('ui_trip_walk', { minutes }) : t('ui_trip_drive', { minutes })}
      </span>
    </p>
  );
}
