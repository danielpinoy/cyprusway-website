import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import { useT } from '../../i18n/I18nProvider';
import { Button } from '../ui/Button';
import styles from './CookieBanner.module.css';

/**
 * Rebuilt from js/cookie-consent.js, not dropped.
 *
 * The scope did not mention it, but it is live on every page today, the site is EU
 * facing, and the copy explicitly mentions affiliate tracking — removing a visible
 * consent mechanism in a rebuild is a compliance regression, not a simplification.
 *
 * Same storage key and same 365-day decision as the vanilla banner, so anyone who has
 * already answered is not asked again after the rebuild.
 *
 * Noted and deliberately unchanged: the banner gates nothing. No script is loaded or
 * withheld on the answer, in the old implementation or this one. Making consent
 * actually gate something is separate work.
 */

const STORAGE_KEY = 'cw_cookie_consent';
const EXPIRY_DAYS = 365;

interface StoredConsent {
  accepted: boolean;
  expires: string;
}

function hasValidConsent(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<StoredConsent>;
    if (typeof parsed.expires !== 'string') return false;
    return new Date(parsed.expires) > new Date();
  } catch {
    return false;
  }
}

function storeConsent(accepted: boolean): void {
  const expires = new Date();
  expires.setDate(expires.getDate() + EXPIRY_DAYS);
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ accepted, expires: expires.toISOString() } satisfies StoredConsent),
    );
  } catch {
    /* Storage blocked. The banner reappears next visit, which is the safe direction. */
  }
}

export function CookieBanner() {
  const t = useT();
  /* Hidden on the first render so the prerendered HTML and the first client render
     agree; the stored decision is read after mount. */
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hasValidConsent()) setVisible(true);
  }, []);

  if (!visible) return null;

  function answer(accepted: boolean) {
    storeConsent(accepted);
    setVisible(false);
  }

  return (
    <div className={styles.banner} role="region" aria-label={t('ui_cookie_label')}>
      <p className={styles.text}>
        {t('ui_cookie_text')}{' '}
        <Link to="/privacy" className={styles.link}>
          {t('ui_cookie_learn')}
        </Link>
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.decline} onClick={() => answer(false)}>
          {t('ui_cookie_decline')}
        </button>
        <Button variant="primary" onClick={() => answer(true)}>
          {t('ui_cookie_accept')}
        </Button>
      </div>
    </div>
  );
}
