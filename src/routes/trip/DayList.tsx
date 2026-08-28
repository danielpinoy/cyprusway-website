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
  collapsed,
  onToggleDay,
  onMoveStop,
  onMoveStopToDay,
  onRemoveStop,
  onRemoveDay,
}: {
  days: readonly EditorDay[];
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
                return day.pending ? null : (
                  <li key={`lunch-${elementIndex}`}>
                    <LunchRow element={element} />
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
            category slug stands in — English, like the place names beside it. */}
        {element.category && (
          <p className={styles.stopSub}>{element.category.replace(/-/g, ' ')}</p>
        )}
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

function LunchRow({ element }: { element: TripElement }) {
  const { t, lang } = useI18n();
  return (
    <div className={styles.stop}>
      <div className={styles.reorder} />
      <span className={`${styles.disc64} ${styles.discEmpty}`} aria-hidden="true">
        <Icon as={UtensilsCrossed} size={18} />
      </span>
      <div className={styles.stopBody}>
        <p className={styles.stopName}>{element.name?.trim() || t('ui_trip_lunch')}</p>
        {element.place_id == null && <p className={styles.stopSub}>{t('ui_trip_lunch_any')}</p>}
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
