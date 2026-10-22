import { useState } from 'react';
import { UserX } from 'lucide-react';

import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { useI18n } from '../i18n/I18nProvider';
import { getSession } from '../lib/auth';
import { useSession } from '../lib/SessionProvider';
import { ContentPage } from './ContentPage';
import prose from './content/prose.module.css';
import styles from './DeleteAccount.module.css';

/**
 * cyprusway.eu/delete-account (W1b of the account build; legal-risk fixes, phase 2,
 * 22 Oct 2026). The web page Google Play asks for and the privacy policy's section 8
 * names: a signed-in person deletes the account here with ONE call to the
 * `account-delete` edge function, exactly as the app does — the function deletes the
 * account the session token names, so no user id travels in the request, and the body
 * is the function's contract and nothing else (an unknown key is refused).
 *
 * Apple sign-ins answer `apple_token_required`: Apple must confirm the revocation, and
 * only the app's native "Confirm with Apple" can hand over that token. The page says so
 * and sends those people to the app or to email. Guests exist only in the app.
 *
 * Prerendered like /trips: the first render reads no session, so a crawler gets the
 * title, the explanation and the sign-in panel.
 */

const DELETE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/account-delete`;

type State = 'idle' | 'busy' | 'done' | 'apple' | 'failed';

export default function DeleteAccount() {
  const { t } = useI18n();
  const { user, status: sessionStatus, openAuth, signOut } = useSession();
  const [agreed, setAgreed] = useState(false);
  const [state, setState] = useState<State>('idle');

  const resolving = sessionStatus === 'resolving';
  const signedOut = !resolving && !user;

  async function onDelete() {
    if (state === 'busy') return;
    setState('busy');
    try {
      const session = await getSession();
      if (!session) {
        setState('failed');
        return;
      }
      const response = await fetch(DELETE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirm: 'delete', source: 'web' }),
      });
      const body = (await response.json().catch(() => null)) as { status?: string } | null;
      if (response.ok && body?.status === 'deleted') {
        /* The account is gone; the session this browser holds is dead. Drop it before the
           page re-renders, and show the one closing line. */
        await signOut().catch(() => undefined);
        setState('done');
        return;
      }
      if (response.ok && body?.status === 'apple_token_required') {
        setState('apple');
        return;
      }
      setState('failed');
    } catch (error) {
      console.warn('[delete-account] request failed:', error);
      setState('failed');
    }
  }

  return (
    <ContentPage>
      <div className={prose.prose}>
        <h1>{t('ui_delete_title')}</h1>
        <p>{t('ui_delete_intro')}</p>

        {state === 'done' ? (
          <div className={styles.panel} role="status">
            <div className={styles.copy}>
              <p className={styles.panelTitle}>{t('ui_delete_done_title')}</p>
              <p className={styles.panelBody}>{t('ui_delete_done_body')}</p>
            </div>
          </div>
        ) : signedOut ? (
          <div className={styles.panel}>
            <span className={styles.mark} aria-hidden="true">
              <Icon as={UserX} size={24} />
            </span>
            <div className={styles.copy}>
              <p className={styles.panelTitle}>{t('ui_delete_signin_title')}</p>
              <p className={styles.panelBody}>{t('ui_delete_signin_body')}</p>
            </div>
            <Button variant="primary" onClick={() => openAuth('signin')}>
              {t('ui_delete_signin_cta')}
            </Button>
          </div>
        ) : user ? (
          <div className={styles.panel}>
            <div className={styles.copy}>
              {state === 'apple' ? (
                <>
                  <p className={styles.panelTitle}>{t('ui_delete_apple_title')}</p>
                  <p className={styles.panelBody}>{t('ui_delete_apple_body')}</p>
                </>
              ) : (
                <>
                  <p className={styles.panelTitle}>
                    {t('ui_delete_signed_in_as', { email: user.email ?? '' })}
                  </p>
                  <label className={styles.check}>
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(event) => setAgreed(event.target.checked)}
                      disabled={state === 'busy'}
                    />
                    <span>{t('ui_delete_confirm')}</span>
                  </label>
                  {state === 'failed' ? (
                    <p className={styles.panelBody} role="alert">
                      {t('ui_delete_failed')}
                    </p>
                  ) : null}
                </>
              )}
            </div>
            {state !== 'apple' ? (
              <Button variant="dark" onClick={onDelete} disabled={!agreed || state === 'busy'}>
                {state === 'busy' ? t('ui_delete_busy') : t('ui_delete_button')}
              </Button>
            ) : null}
          </div>
        ) : null}

        <p>{t('ui_delete_guest_note')}</p>
      </div>
    </ContentPage>
  );
}
