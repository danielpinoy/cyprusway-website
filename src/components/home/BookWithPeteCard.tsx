import { useId, useState } from 'react';

import { useI18n } from '../../i18n/I18nProvider';
import { localised, type Place } from '../../lib/places';
import { BOOKING_REGIONS, type BookingRegion } from '../../contracts/bookingRegions';
import styles from './BookWithPeteCard.module.css';

/**
 * Book with Pete — the card, without the call.
 *
 * The `book-with-pete-route` contract is completely clear from source, and the function is
 * live and CORS-open. The card is what does not work, four ways over:
 *
 *  1. It collects **one of four** required fields. `booking_type`, the subtype and the
 *     hotel preference have no input anywhere in the design.
 *  2. Its chips are not the region vocabulary. The frame shows *Pafos, Ayia Napa, Larnaka,
 *     Limassol, Paralimni, Not Sure*; the backend's six slugs are *paphos, limassol,
 *     larnaka, famagusta, troodos, nicosia*. "Ayia Napa" and "Paralimni" are both
 *     `famagusta`, "Not Sure" is not a region, and Troodos and Nicosia are missing.
 *  3. It says "Choose as many as apply". The API takes exactly one region.
 *  4. **Every call returns `unavailable / no_active_route` today** — verified live against
 *     three valid requests. `affiliate_routes` is empty, so a fully wired card would show
 *     "we have no option for that" to every visitor for every input.
 *
 * So the chips are real and single-select against the six true slugs, and Continue is
 * disabled with the reason stated. The request shape and the three-outcome handling are
 * written up in docs/PARKED.md, ready to switch on when routes are authored.
 *
 * TODO(contracts): the region list is duplicated from `_shared/regions.ts` in the backend
 * repo; it belongs in the client_config RPC.
 */
export function BookWithPeteCard({ places }: { places: readonly Place[] }) {
  const { lang, t } = useI18n();
  const headingId = useId();
  const [selected, setSelected] = useState<BookingRegion | null>(null);

  /* Region display names come from the catalogue, where `destination.name` carries all
     five languages — so the labels are translated without a hardcoded map, and
     `famagusta` reads "Ayia Napa & Protaras" exactly as the app labels it. */
  const labels = new Map<string, string>();
  for (const place of places) {
    if (place.regionSlug && !labels.has(place.regionSlug)) {
      labels.set(place.regionSlug, localised(place.regionName, lang));
    }
  }

  return (
    <section className={styles.card} aria-labelledby={headingId}>
      <div className={styles.body}>
        <h2 id={headingId} className={styles.title}>
          {t('ui_bwp_title')}
        </h2>
        <p className={styles.lede}>{t('ui_bwp_lede')}</p>

        <h3 className={styles.question}>{t('ui_bwp_question')}</h3>
        <p className={styles.hint}>{t('ui_bwp_hint')}</p>

        <ul className={styles.chips}>
          {BOOKING_REGIONS.map((slug) => (
            <li key={slug}>
              <button
                type="button"
                className={styles.chip}
                aria-pressed={selected === slug}
                onClick={() => setSelected((current) => (current === slug ? null : slug))}
              >
                {labels.get(slug) ?? slug}
              </button>
            </li>
          ))}
        </ul>

        <button type="button" className={styles.continue} disabled>
          {t('ui_bwp_continue')}
        </button>
        <p className={styles.unavailable} role="note">
          {t('ui_bwp_unavailable')}
        </p>
      </div>

      <img
        className={styles.pete}
        src="/images/pete.webp"
        alt=""
        width={560}
        height={745}
        loading="lazy"
      />
    </section>
  );
}
