import { Search } from 'lucide-react';
import { Link } from 'react-router';

import { useT } from '../../i18n/I18nProvider';
import { Icon } from '../ui/Icon';
import { Wordmark } from '../ui/Wordmark';
import { NavLabel } from './NavLabel';
import { FOOTER_ABOUT, FOOTER_DISCOVER, FOOTER_LEGAL } from './navigation';
import styles from './Footer.module.css';

/**
 * Figma node 3389-557, with the columns that have nowhere to point removed (plan Q6).
 *
 * The frame draws five columns and two store badges — about thirty-five links, of
 * which two resolve. Dropped rather than drawn:
 *
 *  - ABOUT as designed (Our Mission, How we work, Partners, Careers, Customer Service)
 *    names five pages that do not exist and are not planned. Replaced with the pages
 *    that do: About, FAQ and Contact.
 *  - LOCATIONS, SEGMENTS and CATEGORIES are taxonomy links into browse surfaces phase 1
 *    does not build.
 *  - the App Store and Google Play badges: both store URLs were measured as 404 on
 *    27 August. They come back when a listing exists.
 *
 * DISCOVER is kept and rendered inert, because it is the shape of the phase-2 product
 * and the footer's proportions depend on it.
 *
 * The copyright names Almisource LTD, from the existing five-language `footer_copyright`
 * string. The frame says "CyprusWay"; a copyright line names the legal entity.
 */
export function Footer() {
  const t = useT();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <Wordmark tone="light" />
            {/* The same string as the homepage H1 and the sign-up heading, by phase 1's
                ruling. See i18n/strings/en.ts for why it is no longer `onb_signup_title`. */}
            <p className={styles.tagline}>{t('ui_hero_title')}</p>
          </div>

          {/* Disabled: no client-callable search endpoint exists.
              TODO(contracts): search needs an endpoint or an honest substring filter. */}
          <div className={styles.search}>
            <input
              type="search"
              className={styles.searchInput}
              placeholder={t('ui_footer_search_placeholder')}
              disabled
              aria-label={`${t('ui_header_search')} — ${t('ui_coming_soon')}`}
            />
            <Icon as={Search} size={20} className={styles.searchIcon} />
          </div>
        </div>

        <div className={styles.columns}>
          <nav className={styles.column} aria-labelledby="cw-footer-discover">
            <h2 id="cw-footer-discover" className={styles.heading}>
              {t('ui_footer_discover')}
            </h2>
            <ul className={styles.list}>
              {FOOTER_DISCOVER.map((item) => (
                <li key={item.id}>
                  <NavLabel item={item} className={styles.linkLabel} />
                </li>
              ))}
            </ul>
          </nav>

          <nav className={styles.column} aria-labelledby="cw-footer-about">
            <h2 id="cw-footer-about" className={styles.heading}>
              {t('ui_footer_about_heading')}
            </h2>
            <ul className={styles.list}>
              {FOOTER_ABOUT.map((item) => (
                <li key={item.id}>
                  <NavLabel item={item} className={styles.linkLabel} />
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copyright}>{t('footer_copyright')}</p>
          <ul className={styles.legal}>
            {FOOTER_LEGAL.map((item) => (
              <li key={item.id}>
                <Link to={item.to ?? '/'} className={styles.legalLink}>
                  {t(item.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
