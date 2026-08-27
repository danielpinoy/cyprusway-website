import { MapPin } from 'lucide-react';

import { useI18n } from '../../i18n/I18nProvider';
import { directusImageSrcSet, directusImageUrl } from '../../lib/directusImage';
import { localised, type Place } from '../../lib/places';
import { Icon } from '../ui/Icon';
import styles from './SavedPlaceCard.module.css';

const SLOT = { width: 68, height: 68 };

/** The circular saved-place card from the signed-in frame. Non-interactive, like every
 *  other card in phase 2. */
export function SavedPlaceCard({ place }: { place: Place }) {
  const { lang } = useI18n();
  const region = localised(place.regionName, lang);
  const category = localised(place.categoryName, lang);

  return (
    <article className={styles.card}>
      {place.heroUrl ? (
        <img
          className={styles.photo}
          src={directusImageUrl(place.heroUrl, SLOT)}
          srcSet={directusImageSrcSet(place.heroUrl, SLOT)}
          width={68}
          height={68}
          alt=""
          loading="lazy"
        />
      ) : (
        <span className={styles.photoFallback} aria-hidden="true">
          {category.slice(0, 1) || '·'}
        </span>
      )}

      {category && <span className={styles.tag}>{category}</span>}
      <h3 className={styles.name}>{place.name}</h3>
      {region && (
        <p className={styles.region}>
          <Icon as={MapPin} size={12} />
          <span>{region}</span>
        </p>
      )}
    </article>
  );
}
