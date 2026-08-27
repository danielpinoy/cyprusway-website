import { useState } from 'react';

import { useT } from '../../i18n/I18nProvider';
import { signInWithProvider, type Provider } from '../../lib/auth';
import type { AuthMode } from '../../lib/SessionProvider';
import { Button } from '../ui/Button';
import { Wordmark } from '../ui/Wordmark';
import { ErrorBanner } from './ErrorBanner';
import { AppleMark, GoogleMark } from './ProviderMarks';
import styles from './AuthCard.module.css';

/**
 * One card, two copy states.
 *
 * Google and Apple only. There is no email field, no password field, no "or" divider
 * and no form buttons — the Figma frame predates that decision and still draws them.
 * Sign-in and sign-up are the same action, because signInWithOAuth creates the account
 * if it does not exist; the modes differ only in what the card says.
 */
export function AuthCard({
  mode,
  titleId,
  initialError,
}: {
  mode: AuthMode;
  titleId: string;
  initialError: boolean;
}) {
  const t = useT();
  const [pending, setPending] = useState<Provider | null>(null);
  const [failed, setFailed] = useState(initialError);

  const isSignin = mode === 'signin';

  async function start(provider: Provider) {
    if (pending) return;
    setPending(provider);
    setFailed(false);
    try {
      await signInWithProvider(provider);
      /* Success means the browser is navigating away. The button stays pending so
         nothing looks clickable in the meantime. */
    } catch {
      setPending(null);
      setFailed(true);
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <Wordmark tone="dark" />
        <h2 id={titleId} className={styles.title}>
          {t(isSignin ? 'onb_signin_title' : 'onb_signup_title')}
        </h2>
        {isSignin && <p className={styles.subtitle}>{t('onb_signin_sub')}</p>}
      </div>

      <div className={styles.actions}>
        <ErrorBanner message={failed ? t('onb_err_signin') : null} />

        <Button
          variant="provider"
          fullWidth
          disabled={pending !== null}
          onClick={() => void start('google')}
        >
          <GoogleMark />
          <span>{pending === 'google' ? t('onb_pending') : t('onb_google')}</span>
        </Button>

        <Button
          variant="provider"
          fullWidth
          disabled={pending !== null}
          onClick={() => void start('apple')}
        >
          <AppleMark />
          <span>{pending === 'apple' ? t('onb_pending') : t('onb_apple')}</span>
        </Button>
      </div>
    </div>
  );
}
