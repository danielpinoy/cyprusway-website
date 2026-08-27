import { useI18n } from '../../i18n/I18nProvider';
import { directusImageSrcSet, directusImageUrl } from '../../lib/directusImage';
import { localised, type Place } from '../../lib/places';
import type { Trip } from '../../lib/trips';
import styles from './ContinueTripCard.module.css';

const SLOT = { width: 208, height: 130 };

/**
 * "Continue your trip" / "Continue planning".
 *
 * Read-only: entry 44 records that `itinerary_data` is client-written with nothing
 * validating it, and names a web client as the trigger to move those rules server-side.
 * Nothing here writes.
 *
 * **Continue is inert.** There is no trip surface on the web, so the button has nowhere
 * to go. Same treatment as the header's pending navigation: reduced emphasis, out of the
 * tab order, and the reason in the accessibility tree rather than only in the opacity.
 *
 * The "Day X of Y" pill hides when today matches no `days[].date`, exactly as the app's
 * card does — and "today" is the device-local date for the reason given in lib/trips.ts.
 */
export function ContinueTripCard({
  trip,
  places,
}: {
  trip: Trip;
  places: readonly Place[];
}) {
  const { lang, t } = useI18n();

  const regionName = trip.regionSlug
    ? localised(
        places.find((place) => place.regionSlug === trip.regionSlug)?.regionName ?? {},
        lang,
      )
    : '';

  /* `name` is NOT NULL with a default, so this composes only for rows whose name was
     blanked — and it reproduces the frame's own copy. */
  const title =
    trip.name ??
    (regionName ? t('ui_trip_untitled_region', { region: regionName }) : t('ui_trip_untitled'));

  return (
    <article className={styles.card}>
      <div className={styles.body}>
        <h3 className={styles.title}>{title}</h3>

        {trip.isActive && (
          <p className={styles.meta}>
            <span className={styles.dot} aria-hidden="true" />
            <span>{t('ui_trip_active')}</span>
            {trip.dayNumber != null && trip.dayCount > 0 && (
              <span className={styles.day}>
                {t('ui_trip_day', { current: trip.dayNumber, total: trip.dayCount })}
              </span>
            )}
          </p>
        )}

        <span className={styles.continue}>
          {t('ui_trip_continue')}
          <span className="cw-visually-hidden">{` — ${t('ui_coming_soon')}`}</span>
        </span>
      </div>

      {trip.coverUrl && (
        <img
          className={styles.cover}
          src={directusImageUrl(trip.coverUrl, SLOT)}
          srcSet={directusImageSrcSet(trip.coverUrl, SLOT)}
          width={SLOT.width}
          height={SLOT.height}
          alt=""
          loading="lazy"
        />
      )}
    </article>
  );
}
