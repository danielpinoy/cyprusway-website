import { Heart, Menu, Search } from 'lucide-react';
import { Link } from 'react-router';

import { useT } from '../../i18n/I18nProvider';
import { initialsFor } from '../../lib/auth';
import { useSession } from '../../lib/SessionProvider';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Wordmark } from '../ui/Wordmark';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NavLabel } from './NavLabel';
import { PRIMARY_NAV } from './navigation';
import styles from './Header.module.css';

/**
 * Figma nodes 3388-379 (guest) and the signed-in variant on 3390-8530.
 *
 * Guest: search, then a gold Sign In. Signed-in: saved-places heart, search, avatar.
 * Two things the design assumes and the backend does not have:
 *
 *  - the avatar is a photo. `users` has no avatar column (20 columns, measured), so
 *    initials stand in. TODO(contracts): avatar needs a column or a storage convention.
 *  - search has no endpoint. Both vector RPCs are service_role-only since migration
 *    0028; the only client-reachable option is a substring filter. It renders
 *    disabled rather than accepting text and doing nothing.
 *    TODO(contracts): search needs an endpoint or an honest substring filter.
 *
 * The drawer needs an opener, and the frames show none. The avatar is it for a
 * signed-in visitor — that is where Settings and Log out live — and a menu glyph for
 * a guest. One control, two presentations.
 */
export function Header({ onOpenMenu }: { onOpenMenu: () => void }) {
  const t = useT();
  const { user, openAuth } = useSession();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand} aria-label={t('ui_header_home')}>
          <Wordmark tone="light" compact />
        </Link>

        <nav className={styles.nav} aria-label={t('ui_nav_primary')}>
          {PRIMARY_NAV.map((item) => (
            <NavLabel key={item.id} item={item} className={styles.navItem} />
          ))}
        </nav>

        <div className={styles.actions}>
          {/* Hidden below 640px, where the drawer carries both — see Header.module.css. */}
          <span className={styles.wideOnly}>
            <LanguageSwitcher tone="light" />
          </span>

          {user && (
            <span
              className={`${styles.inertIcon} ${styles.wideOnly}`}
              role="img"
              aria-label={`${t('ui_header_saved')} — ${t('ui_coming_soon')}`}
            >
              <Icon as={Heart} size={22} />
            </span>
          )}

          <button
            type="button"
            className={`${styles.iconButton} ${styles.wideOnly}`}
            disabled
            aria-label={`${t('ui_header_search')} — ${t('ui_coming_soon')}`}
          >
            <Icon as={Search} size={22} />
          </button>

          {!user && (
            <Button variant="primary" className={styles.signIn} onClick={() => openAuth('signup')}>
              {t('ui_header_signin')}
            </Button>
          )}

          <button
            type="button"
            className={user ? styles.avatar : styles.iconButton}
            onClick={onOpenMenu}
            aria-label={user ? t('ui_header_account') : t('ui_header_menu_open')}
            aria-haspopup="dialog"
          >
            {user ? <span aria-hidden="true">{initialsFor(user)}</span> : <Icon as={Menu} size={22} />}
          </button>
        </div>
      </div>
    </header>
  );
}
