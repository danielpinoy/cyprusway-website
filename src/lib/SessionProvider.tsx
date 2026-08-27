import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';

import {
  clearAuthParams,
  getSession,
  hasStoredSession,
  readAuthParams,
  signOut as signOutRequest,
} from './auth';
import { fetchOnboardingCompleted } from './profile';
import { getSupabase } from './supabase';

/**
 * The one async dependency phase 1 has, and the thing the loading and error frames
 * are wired to.
 *
 *   idle      no session and no auth parameters — a normal visitor. Nothing is
 *             fetched, the Supabase chunk is never requested.
 *   resolving the return leg or a stored session is being resolved — the command
 *             centre renders its skeletons (Figma 3562-24665).
 *   ready     resolved. `user` is null for a guest, set for a signed-in visitor.
 *   error     the shell could not be resolved — the full-page takeover
 *             (Figma 3558-21474).
 *
 * The four return-leg cases from the brief map onto this as:
 *   1. no session, no auth params            -> idle
 *   2. session, onboarding_completed false    -> ready + the interests screen
 *   3. session, onboarding_completed true     -> ready, nothing shown
 *   4. an auth error came back                -> ready + the card's error banner
 *
 * Nothing here can reach the sign-up card. It is only opened by an explicit trigger
 * or ?mode=signup — structurally, not by a guard — because that path is how an
 * existing paying user ends up creating a duplicate account.
 */

export type SessionStatus = 'idle' | 'resolving' | 'ready' | 'error';

export type AuthMode = 'signin' | 'signup';

interface SessionValue {
  status: SessionStatus;
  user: User | null;
  /** Set when the OAuth round trip itself failed; drives the card's error banner. */
  authFailed: boolean;
  /** True between resolving a session and the interests write succeeding. */
  needsOnboarding: boolean;
  openAuth: (mode: AuthMode) => void;
  closeAuth: () => void;
  authMode: AuthMode | null;
  completeOnboarding: () => void;
  signOut: () => Promise<void>;
  retry: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  /* Always 'idle' on the first render, on the server and the client alike, because
     that is what the prerendered markup contains. Anything else would be a hydration
     mismatch on every page. The probe below runs after mount. */
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [user, setUser] = useState<User | null>(null);
  const [authFailed, setAuthFailed] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [attempt, setAttempt] = useState(0);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    /* Read the URL before anything constructs the client: detectSessionInUrl strips
       these parameters during initialisation, so this is the only safe moment. */
    const params = readAuthParams();

    if (params.hasError) {
      clearAuthParams();
      setAuthFailed(true);
      setAuthMode('signin');
      setStatus('ready');
      return;
    }

    if (!params.hasCode && !hasStoredSession()) {
      setStatus('idle');
      return;
    }

    let cancelled = false;
    setStatus('resolving');

    void (async () => {
      try {
        const session = await getSession();

        if (cancelled) return;

        if (!session) {
          if (params.hasCode) {
            /* A code came back but produced no session. That is a failure, not a new
               visitor — show the banner, never the sign-up card. */
            clearAuthParams();
            setAuthFailed(true);
            setAuthMode('signin');
          }
          setStatus('ready');
          return;
        }

        clearAuthParams();

        /* A failed profile read is a shell-load failure, not an auth rejection, so it
           surfaces as the page's error state rather than the card's banner. Either
           way it never falls through to onboarding. */
        const completed = await fetchOnboardingCompleted(session.user.id);
        if (cancelled) return;

        setUser(session.user);
        setNeedsOnboarding(!completed);
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  /* Keep the header honest after a sign-out or a token refresh. Only subscribed once
     the client exists, so a visitor who never signs in never creates one. */
  useEffect(() => {
    if (status === 'idle') return;

    let subscription: { unsubscribe: () => void } | null = null;
    try {
      const result = getSupabase().auth.onAuthStateChange((_event, session) => {
        if (!mounted.current) return;
        setUser(session?.user ?? null);
        if (!session) setNeedsOnboarding(false);
      });
      subscription = result.data.subscription;
    } catch {
      /* Missing credentials already surfaced through the bootstrap above. */
    }

    return () => subscription?.unsubscribe();
  }, [status]);

  const openAuth = useCallback((mode: AuthMode) => {
    setAuthFailed(false);
    setAuthMode(mode);
  }, []);

  const closeAuth = useCallback(() => {
    setAuthMode(null);
    setAuthFailed(false);
  }, []);

  const completeOnboarding = useCallback(() => {
    setNeedsOnboarding(false);
  }, []);

  const signOut = useCallback(async () => {
    await signOutRequest();
    setUser(null);
    setNeedsOnboarding(false);
  }, []);

  const retry = useCallback(() => {
    setStatus('idle');
    setAttempt((n) => n + 1);
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      status,
      user,
      authFailed,
      needsOnboarding,
      authMode,
      openAuth,
      closeAuth,
      completeOnboarding,
      signOut,
      retry,
    }),
    [
      status,
      user,
      authFailed,
      needsOnboarding,
      authMode,
      openAuth,
      closeAuth,
      completeOnboarding,
      signOut,
      retry,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}
