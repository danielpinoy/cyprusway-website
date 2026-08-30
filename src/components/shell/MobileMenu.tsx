import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';

import { useT } from '../../i18n/I18nProvider';
import { displayNameFor } from '../../lib/auth';
import { useSession } from '../../lib/SessionProvider';
import { Icon } from '../ui/Icon';
import { useDialog, useKeepMounted } from '../ui/useDialog';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NavLabel } from './NavLabel';
import { MENU_NAV, MENU_SIGNOUT } from './navigation';
import styles from './MobileMenu.module.css';

/* Q13: no support address exists yet. partners@cyprusway.eu is the only inbox on the
   site and is used here and on the error page until one does. Stays on copy owed. */
const FEEDBACK_MAILTO = 'mailto:partners@cyprusway.eu?subject=CyprusWay%20feedback';
const REPORT_MAILTO = 'mailto:partners@cyprusway.eu?subject=CyprusWay%20problem%20report';

/**
 * The overlay drawer, Figma node 3562-23804.
 *
 * Anchored with `inset-inline-end`, so it enters from the right in LTR and the left in
 * RTL, matching the mirrored frame 3558-20716 without a direction branch in the code.
 *
 * It slides — 200 ms in, 200 ms out — which phase 1's plan specified and phase 1 did not
 * build (docs/PARKED.md, "Plans and comments assert intentions as facts"). The mechanics
 * are the motion convention's and live in the stylesheet: the portal stays mounted after
 * its first open so the exit has something to animate, `data-open` drives the styles,
 * `@starting-style` gives the enter its off-canvas start, and a discrete `display`
 * transition holds the exit until it is done. No timer and no closing state. The one
 * direction branch is in CSS, on `[dir='rtl']`, and it is the sign of the slide.
 *
 * `useDialog` is unchanged and its timing is what makes the focus trap safe: it focuses on
 * the `open` flip, and because the slide is a transform the panel is already at its final
 * layout position on that first frame — `offsetParent` is set, the items are found, and
 * focus lands on an element that is where it will be. On close the hook restores focus to
 * the trigger on the same flip, while the panel is still sliding out and already `inert`.
 *
 * Not built from the frame: the "Continue your trip" card at the bottom, which needs
 * itinerary data phase 1 does not load, and the PRO badge on Book with Pete, which the
 * 14 Aug audit recorded as inverted.
 */
export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const { user, signOut } = useSession();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const mounted = useKeepMounted(open);

  useDialog(panelRef, { open, dismissible: true, onClose });

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={styles.overlay}
      data-open={open ? 'true' : 'false'}
      inert={!open}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={styles.panel}
      >
        <h2 id={titleId} className="cw-visually-hidden">
          {t('ui_menu_title')}
        </h2>

        <div className={styles.top}>
          {/* Disabled, like every other search on the site: there is no client-callable
              search endpoint. TODO(contracts): needs an endpoint or a substring filter. */}
          <div className={styles.search}>
            <input
              type="search"
              className={styles.searchInput}
              placeholder={t('ui_menu_search_placeholder')}
              disabled
              aria-label={`${t('ui_header_search')} — ${t('ui_coming_soon')}`}
            />
            <Icon as={Search} size={18} className={styles.searchIcon} />
          </div>

          <button type="button" className={styles.close} onClick={onClose} aria-label={t('ui_header_menu_close')}>
            <Icon as={X} size={20} />
          </button>
        </div>

        {user && <p className={styles.identity}>{displayNameFor(user)}</p>}

        <nav aria-labelledby={titleId}>
          <ul className={styles.list}>
            {MENU_NAV.map((item) => (
              <li key={item.id} className={styles.row}>
                <NavLabel item={item} showIcon className={styles.rowLabel} onNavigate={onClose} />
              </li>
            ))}

            {user && (
              <li className={styles.row}>
                <button
                  type="button"
                  className={`${styles.rowLabel} ${styles.rowButton}`}
                  onClick={() => {
                    onClose();
                    void signOut();
                  }}
                >
                  {MENU_SIGNOUT.icon && <Icon as={MENU_SIGNOUT.icon} size={20} />}
                  <span>{t(MENU_SIGNOUT.labelKey)}</span>
                </button>
              </li>
            )}
          </ul>
        </nav>

        <div className={styles.footer}>
          <LanguageSwitcher tone="light" />
          <div className={styles.footerLinks}>
            <a href={FEEDBACK_MAILTO} className={styles.footerLink}>
              {t('ui_menu_feedback')}
            </a>
            <a href={REPORT_MAILTO} className={styles.footerLink}>
              {t('ui_menu_report')}
            </a>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
