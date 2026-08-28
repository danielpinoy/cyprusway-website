import { MapPin } from 'lucide-react';
import { Link } from 'react-router';

import { useI18n } from '../../i18n/I18nProvider';
import { categoryIcon } from '../../contracts/categoryIcons';
import { directusImageSrcSet, directusImageUrl } from '../../lib/directusImage';
import { localised, type Place } from '../../lib/places';
import { Icon } from '../ui/Icon';
import styles from './PlaceCard.module.css';

export type PlaceCardSize = 'large' | 'small' | 'grid';

const SLOTS: Record<PlaceCardSize, { width: number; height: number }> = {
  large: { width: 282, height: 300 },
  small: { width: 180, height: 251 },
  grid: { width: 240, height: 251 },
};

/**
 * The place card, in three sizes: 282×300 for Top Recommendations, 180×251 for the smaller
 * rails, and a column-filling variant for Explore's grid (220×251 at the 1200 breakpoint).
 *
 * **It is a link now.** Phase 2 rendered it as an inert `<article>` because the place page
 * did not exist; that treatment is gone, along with `cursor: default`. Its accessible name
 * is the place name and its region, so a screen reader's link list reads "Nissi Beach, Ayia
 * Napa & Protaras" rather than twenty links called "Beaches".
 *
 * ## The card without a photograph
 *
 * 108 of 181 published places have no image at all, so this is not an edge case — filter
 * Explore to Food and every card on screen is one. Phase 2's treatment, a gradient with the
 * category's initial as a large watermark, was designed for one or two cards inside a rail
 * and does not survive twenty at once: identical tiles read as a rendering failure precisely
 * because they are identical.
 *
 * So the fallback card carries **the words instead of the picture** — the place's
 * `short_description`, which every unphotographed place has and which is exactly card-sized
 * (median 166 characters, longest 192). Each tile then differs, and differs usefully: three
 * lines about the pelican that has lived at the restaurant since 1967 tell a browser more
 * than a stock photograph of a taverna would. It reads as an editorial card, which is what
 * it is.
 */
export function PlaceCard({ place, size }: { place: Place; size: PlaceCardSize }) {
  const { lang } = useI18n();

  const region = localised(place.regionName, lang);
  const category = localised(place.categoryName, lang);
  const slot = SLOTS[size];
  const CategoryGlyph = categoryIcon(place.categorySlug);

  const label = region ? `${place.name}, ${region}` : place.name;

  return (
    <Link
      to={`/place/${place.slug}`}
      className={`${styles.card} ${styles[size]} ${place.heroUrl ? '' : styles.noPhoto}`}
      aria-label={label}
    >
      {place.heroUrl ? (
        <img
          className={styles.photo}
          src={directusImageUrl(place.heroUrl, slot)}
          srcSet={directusImageSrcSet(place.heroUrl, slot)}
          width={slot.width}
          height={slot.height}
          alt=""
          loading="lazy"
          decoding="async"
        />
      ) : null}

      {place.heroUrl && <div className={styles.scrim} aria-hidden="true" />}

      <div className={styles.body}>
        <p className={styles.category}>
          {!place.heroUrl && <Icon as={CategoryGlyph} size={16} className={styles.categoryIcon} />}
          <span>{category}</span>
        </p>

        {/* Only on a card with no photograph: the space the image would have taken.
            lang="en" because `translations` carries English on all 181 rows and nothing
            else — a screen reader should switch voice rather than read English with the
            interface language's phonemes. A no-op when the interface is English. */}
        {!place.heroUrl && place.short && (
          <p className={styles.blurb} lang="en">
            {place.short}
          </p>
        )}

        <div className={styles.footer}>
          {region && (
            <p className={styles.region}>
              <Icon as={MapPin} size={12} />
              <span>{region}</span>
            </p>
          )}
          <h3 className={styles.name} lang="en">
            {place.name}
          </h3>
        </div>
      </div>
    </Link>
  );
}
