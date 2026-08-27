import { useI18n } from '../../i18n/I18nProvider';
import { directusImageSrcSet, directusImageUrl } from '../../lib/directusImage';
import { localised, type Place } from '../../lib/places';
import styles from './TourCard.module.css';

const SLOT = { width: 384, height: 210 };

/**
 * "See Cyprus before you go" — a 360 degree tour card.
 *
 * **This never renders today.** `virtual_tour` is null on 181 of 181 published places, so
 * the rail's query returns nothing and the whole section is omitted. Built properly
 * anyway, so the day a tour row lands the rail appears with no code change.
 *
 * Deliberately not filled with placeholder cards: a card promising a tour that does not
 * exist is a broken promise above the fold, and a different thing from a missing photo —
 * the tour IS the product here.
 *
 * No play control, because the tour player does not exist on the web either.
 */
export function TourCard({ place }: { place: Place }) {
  const { lang, t } = useI18n();
  const region = localised(place.regionName, lang);

  return (
    <article className={styles.card}>
      {place.heroUrl && (
        <img
          className={styles.photo}
          src={directusImageUrl(place.heroUrl, SLOT)}
          srcSet={directusImageSrcSet(place.heroUrl, SLOT)}
          width={SLOT.width}
          height={SLOT.height}
          alt=""
          loading="lazy"
        />
      )}
      <div className={styles.scrim} aria-hidden="true" />
      <div className={styles.body}>
        <span className={styles.badge}>{t('ui_tour_badge')}</span>
        <div>
          <h3 className={styles.name}>{place.name}</h3>
          {region && <p className={styles.region}>{region}</p>}
        </div>
      </div>
    </article>
  );
}
