import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { useT } from '../../i18n/I18nProvider';
import type { TranslationKey } from '../../i18n/dictionary';
import { scrollByInline } from '../../lib/dir';
import { Icon } from '../ui/Icon';
import styles from './Rail.module.css';

/**
 * A titled horizontal rail.
 *
 * Keyboard: the scroller is `role="group"` with a name and `tabindex="0"`, so it is
 * reachable and arrow-key scrollable. WCAG 2.1.1 requires a scrollable region to be
 * keyboard-operable whether or not its contents are — which mattered most in phase 2, when
 * the cards deliberately were not. They are links now. The chevrons are real buttons on top
 * of the scroller, not instead of it.
 *
 * Direction: scrolling goes through `scrollByInline`, never `scrollLeft` arithmetic,
 * which is signed inconsistently across engines under RTL.
 *
 * **No "View All".** The frames put one on every rail heading, and phase 2 first rendered
 * it inert with a "Coming soon" note — five times on one screen, alongside the header's
 * five pending nav items and the hero's two option cards. Repeating the same apology
 * twelve times is worse than not making the offer: the rail already scrolls to show
 * everything it has, and nothing is hidden behind the missing link.
 *
 * Explore arrived in phase 3 and they have still not come back, because only some of them
 * can point at it honestly — Food & Wine and Popular can, Top Recommendations is a
 * personalised ranking that no Explore URL reproduces. See docs/PARKED.md.
 */
export function Rail({
  titleKey,
  children,
  scrollBy = 306,
}: {
  titleKey: TranslationKey;
  children: ReactNode;
  /** One card plus its gap, so a press advances by exactly one card. */
  scrollBy?: number;
}) {
  const t = useT();
  const headingId = useId();
  const scroller = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  const measure = useCallback(() => {
    const el = scroller.current;
    if (el) setOverflowing(el.scrollWidth > el.clientWidth + 1);
  }, []);

  useEffect(() => {
    measure();
    const el = scroller.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <section className={styles.rail} aria-labelledby={headingId}>
      <div className={styles.head}>
        <h2 id={headingId} className={styles.title}>
          {t(titleKey)}
        </h2>
      </div>

      <div className={styles.track}>
        {/* Only offered when there is something off-screen to reach. */}
        {overflowing && (
          <button
            type="button"
            className={`${styles.chevron} ${styles.chevronStart}`}
            aria-label={t('ui_rail_previous')}
            onClick={() => scroller.current && scrollByInline(scroller.current, -scrollBy)}
          >
            <Icon as={ChevronLeft} size={20} />
          </button>
        )}

        <div
          ref={scroller}
          className={styles.scroller}
          role="group"
          aria-labelledby={headingId}
          tabIndex={0}
        >
          {children}
        </div>

        {overflowing && (
          <button
            type="button"
            className={`${styles.chevron} ${styles.chevronEnd}`}
            aria-label={t('ui_rail_next')}
            onClick={() => scroller.current && scrollByInline(scroller.current, scrollBy)}
          >
            <Icon as={ChevronRight} size={20} />
          </button>
        )}
      </div>
    </section>
  );
}
