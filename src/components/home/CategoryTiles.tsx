import { useId } from 'react';

import { useT } from '../../i18n/I18nProvider';
import {
  INTEREST_SLUGS,
  interestImage,
  interestLabelKey,
} from '../../contracts/interests';
import styles from './CategoryTiles.module.css';

/**
 * The eleven interest tags as tiles.
 *
 * Reuses phase 1's vocabulary rather than redefining it — the slugs come from
 * `contracts/interests.ts`, which the live CHECK constraint enforces, and the labels from
 * the `onb_i_*` dictionary keys, already translated into all five languages.
 *
 * **Flat, with no background photograph.** The frame draws each tile as a photo under a
 * veil so heavy the photograph is barely perceptible — the tiles read as cream cards with
 * navy text. There is also nowhere to source the photographs from: these are interests,
 * and interests have no place membership (see docs/PARKED.md). A flat tile is within a
 * few percent of the drawn design and costs no assets, no licensing question and no
 * taxonomy decision.
 *
 * The small round thumbnail is phase 1's existing 48px interest image, already shipped for
 * the onboarding chips. Reusing it recovers some of the design's imagery for free and ties
 * this rail visually to the screen where the same eleven words were chosen.
 *
 * Non-interactive, like every other card in phase 2: there is no browse surface behind a
 * category yet.
 */
export function CategoryTiles() {
  const t = useT();
  const headingId = useId();

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.title}>
        {t('ui_categories_title')}
      </h2>

      <ul className={styles.grid}>
        {INTEREST_SLUGS.map((slug) => (
          <li key={slug} className={styles.tile}>
            <img
              className={styles.mark}
              src={interestImage(slug)}
              alt=""
              width={32}
              height={32}
              loading="lazy"
            />
            <span className={styles.label}>{t(interestLabelKey(slug))}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
