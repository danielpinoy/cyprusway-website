import { useState, type ReactNode } from 'react';
import { Outlet } from 'react-router';

import { useT } from '../../i18n/I18nProvider';
import { useDocumentHead } from '../../routes/useDocumentHead';
import { AuthGate } from '../auth/AuthGate';
import { CookieBanner } from './CookieBanner';
import { Footer } from './Footer';
import { Header } from './Header';
import { MobileMenu } from './MobileMenu';
import styles from './Layout.module.css';

/** Header, drawer, footer, cookie banner and the auth cards — everything every page
 *  has. Takes children rather than only an Outlet so the home route can compose it
 *  around its own states while the error takeover replaces it entirely. */
export function Layout({ children }: { children: ReactNode }) {
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);

  useDocumentHead();

  return (
    <div className={styles.shell}>
      <a href="#main" className="cw-skip-link">
        {t('ui_skip_to_content')}
      </a>

      <Header onOpenMenu={() => setMenuOpen(true)} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main id="main" className={styles.main}>
        {children}
      </main>

      <Footer />
      <CookieBanner />
      <AuthGate />
    </div>
  );
}

/** Route element for everything that is just a page inside the shell. */
export function LayoutRoute() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
