import { MapPin } from 'lucide-react';

import { useI18n } from '../../i18n/I18nProvider';
import { directusImageSrcSet, directusImageUrl } from '../../lib/directusImage';
import { localised, type Place } from '../../lib/places';
import { Icon } from '../ui/Icon';
import styles from './PlaceCard.module.css';

/**
 * The place card, in the two sizes the frames use: 282×300 for Top Recommendations and
 * 180×251 for the smaller rails.
 *
 * **Non-interactive, and visibly so.** The place detail page has no Figma frame and is
 * being handled separately, so there is nowhere to go: the card is an `<article>`, not a
 * link or a button — no pointer cursor, no hover lift, not in the tab order. The frame's
 * ↗ open badge is not drawn, because it is an affordance for an action that does not
 * exist. A dead click is worse than an honest static card.
 *
 * **Two text slots, one field.** The frame's large card carries an editorial headline
 * ("Explore Crystal-Clear Waters") above the place name. There is no such field: a place
 * has `name`, an EditorJS `description`, and a `short_description` that is a full
 * sentence. The top slot therefore carries the **category name**, which is real data and
 * already translated into all five languages, and mirrors what the small card does with
 * its category pill.
 *
 * **The gradient is one navy, not the frame's per-card tint.** The design tints each
 * card to suit its photograph (#099ebf on one, warm browns and greens on others). That
 * cannot be derived at runtime, and legibility must not depend on which photograph the
 * CMS happens to return — see the contrast note in PlaceCard.module.css.
 */
export function PlaceCard({ place, size }: { place: Place; size: 'large' | 'small' }) {
  const { lang } = useI18n();

  const region = localised(place.regionName, lang);
  const category = localised(place.categoryName, lang);
  const slot = size === 'large' ? { width: 282, height: 300 } : { width: 180, height: 251 };

  return (
    <article className={`${styles.card} ${size === 'large' ? styles.large : styles.small}`}>
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
      ) : (
        /* The place is real even without a photograph, so it gets a designed tile rather
           than being filtered out — the one rail where this happens is Food & Wine, whose
           37 tavernas have no images at all. Deliberately not a grey box: that reads as a
           load failure, which would be a lie about a place that exists. */
        <span className={styles.fallback} aria-hidden="true">
          <span className={styles.fallbackMark}>{category.slice(0, 1) || '·'}</span>
        </span>
      )}

      <div className={styles.scrim} aria-hidden="true" />

      <div className={styles.body}>
        {category && <p className={styles.category}>{category}</p>}

        <div className={styles.footer}>
          {region && (
            <p className={styles.region}>
              <Icon as={MapPin} size={12} />
              <span>{region}</span>
            </p>
          )}
          <h3 className={styles.name}>{place.name}</h3>
        </div>
      </div>
    </article>
  );
}
