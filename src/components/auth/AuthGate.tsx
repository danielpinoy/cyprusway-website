import { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';

import { useSession } from '../../lib/SessionProvider';
import { Modal } from '../ui/Modal';
import { AuthCard } from './AuthCard';
import { InterestsScreen } from './InterestsScreen';

const TITLE_ID = 'cw-auth-title';

/**
 * Dev-only preview, so the two cards can be reviewed against Figma 3558-19485 and
 * 3558-19871 without completing a real OAuth round trip — which is what blocked
 * visual verification of the interests screen on the vanilla branch.
 *
 * `?card=interests` renders against a stub user, so the chips, the disabled-until-one
 * rule and the layout are all real; pressing the button fails into the error banner,
 * because there is no session to write with. That is the honest behaviour, not a mock.
 * Stripped from production builds.
 */
function useCardPreview(): 'signin' | 'signup' | 'interests' | null {
  const [preview, setPreview] = useState<'signin' | 'signup' | 'interests' | null>(null);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const value = new URLSearchParams(window.location.search).get('card');
    if (value === 'signin' || value === 'signup' || value === 'interests') setPreview(value);
  }, []);

  return preview;
}

const PREVIEW_USER = { id: 'preview' } as User;

/** Which card is up. One object per change of card, so the exit can hold the last one. */
type Card = { kind: 'interests'; user: User } | { kind: 'auth'; mode: 'signin' | 'signup' };

/**
 * Owns which of the two cards is on screen.
 *
 * The interests screen outranks the auth card: someone who has just come back from a
 * provider has a session, so there is nothing to sign in to.
 *
 * `?mode=signin` / `?mode=signup` make the card linkable without a second page. It is
 * read after the return leg has had its turn, so a deep link can never override a
 * real OAuth response.
 */
export function AuthGate() {
  const { status, user, needsOnboarding, authMode, authFailed, openAuth, closeAuth, completeOnboarding } =
    useSession();
  const [interestsDismissed, setInterestsDismissed] = useState(false);
  const preview = useCardPreview();

  /* Consumed once. Without this, closing the card re-runs the effect — `authMode` going
     back to null is a dependency change — it reads ?mode= again and immediately reopens
     the card, so Escape and the close button do nothing on a deep link. */
  const modeApplied = useRef(false);

  useEffect(() => {
    if (status === 'resolving') return;
    if (modeApplied.current) return;
    if (authMode || needsOnboarding) return;

    modeApplied.current = true;

    const mode = new URLSearchParams(window.location.search).get('mode');
    if (mode === 'signin' || mode === 'signup') openAuth(mode);
  }, [status, authMode, needsOnboarding, openAuth]);

  const showInterests =
    (preview === 'interests' || (Boolean(user) && needsOnboarding)) && !interestsDismissed;
  const interestsUser = user ?? (preview === 'interests' ? PREVIEW_USER : null);
  const cardMode = authMode ?? (preview === 'signin' || preview === 'signup' ? preview : null);

  /* Memoised on its inputs so its identity only changes when the card does — the effect
     below keys on it, and a fresh object every render would re-run that effect every
     render. `user` is the provider's state object and is stable between session changes. */
  const card = useMemo<Card | null>(() => {
    if (showInterests && interestsUser) return { kind: 'interests', user: interestsUser };
    if (cardMode) return { kind: 'auth', mode: cardMode };
    return null;
  }, [showInterests, interestsUser, cardMode]);

  /* The card that was last up, kept so the exit has something to fade out. Two Modals
     used to be mounted and unmounted here as the card changed, which meant the surface
     left the document in the same frame it closed and nothing could animate. Now there is
     one Modal, it stays mounted from its first open (see useKeepMounted), and while
     `card` is null it renders the last card, inert, for the 200 ms the exit takes. This
     is data — which card — not a closing phase; no timer decides when it ends. */
  const [lastCard, setLastCard] = useState<Card | null>(null);
  useEffect(() => {
    if (card) setLastCard(card);
  }, [card]);

  const shown = card ?? lastCard;
  if (!shown) return null;

  return (
    <Modal
      open={card !== null}
      size={shown.kind === 'interests' ? 'interests' : 'auth'}
      labelledBy={TITLE_ID}
      onClose={shown.kind === 'interests' ? () => setInterestsDismissed(true) : closeAuth}
    >
      {shown.kind === 'interests' ? (
        <InterestsScreen
          user={shown.user}
          titleId={TITLE_ID}
          /* No browse surface exists, so saving closes the card and leaves the visitor
             on the command centre, signed in — with Top Recommendations re-ranked by the
             selection they just made, without a refetch. */
          onSaved={(selected) => completeOnboarding([...selected])}
        />
      ) : (
        <AuthCard mode={shown.mode} titleId={TITLE_ID} initialError={authFailed} />
      )}
    </Modal>
  );
}
