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
export function PlaceCard({
  place,
  size,
  select,
  priority = false,
}: {
  place: Place;
  size: PlaceCardSize;
  /**
   * Present on the trip picker, absent everywhere else.
   *
   * The same card does two jobs — navigate, or be chosen — and they are the same card:
   * one photograph, one no-photo fallback, one set of measured contrast annotations. A
   * second component would be a copy of the fallback treatment, which is the part most
   * likely to drift.
   */
  select?: { selected: boolean; disabled?: boolean; onToggle: () => void } | undefined;
  /**
   * True only for the four Top Recommendations cards. The desktop LCP element lives in
   * that rail (measured 30 Aug 2026: LCP 1224 ms, ~39% of it the photo's own fetch -
   * docs/PERF-MEASUREMENT-2026-08-30.md), and a lazy image cannot be requested until
   * layout proves it visible, at the lowest network priority. Everything below the fold
   * stays lazy, which is the treatment's whole value - so this must never be set on a
   * card inside a rail that renders more than its first screenful.
   */
  priority?: boolean;
}) {
  const { lang } = useI18n();

  const region = localised(place.regionName, lang);
  const category = localised(place.categoryName, lang);
  const slot = SLOTS[size];

  const label = region ? `${place.name}, ${region}` : place.name;
  const className = [
    styles.card,
    styles[size],
    place.heroUrl ? '' : styles.noPhoto,
    select?.selected ? styles.selected : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (select) {
    return (
      <button
        type="button"
        className={className}
        aria-pressed={select.selected}
        aria-label={label}
        disabled={select.disabled ?? false}
        onClick={select.onToggle}
      >
        <Body place={place} slot={slot} region={region} category={category} priority={priority} />
      </button>
    );
  }

  return (
    <Link to={`/place/${place.slug}`} className={className} aria-label={label}>
      <Body place={place} slot={slot} region={region} category={category} priority={priority} />
    </Link>
  );
}

/** The card's contents, shared by the link and the selectable button so the no-photo
 *  fallback and its measured treatment exist once. */
function Body({
  place,
  slot,
  region,
  category,
  priority,
}: {
  place: Place;
  slot: { width: number; height: number };
  region: string;
  category: string;
  priority: boolean;
}) {
  const CategoryGlyph = categoryIcon(place.categorySlug);
  return (
    <>
      {place.heroUrl ? (
        <img
          className={styles.photo}
          src={directusImageUrl(place.heroUrl, slot)}
          srcSet={directusImageSrcSet(place.heroUrl, slot)}
          width={slot.width}
          height={slot.height}
          alt=""
          /* All 26 homepage images used to leave at Low priority within ~2 ms of each
             other, against an origin whose per-image spread was 423-1040 ms - so the LCP
             card queued behind twenty-two images nobody could see. Priority cards jump
             that queue; every other card keeps lazy/Low. Measured 30 Aug 2026. */
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
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
    </>
  );
}
