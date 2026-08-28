import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fetchPlaces, type Place } from '../../lib/places';
import { MissingCredentialsError } from '../../lib/supabase';
import { fetchSavedPlaceIds } from '../../lib/saved';
import { fetchTrips, type Trip } from '../../lib/trips';
import { useSession } from '../../lib/SessionProvider';
import { SAVED_PLACES_COUNT } from '../../lib/rails';
import { clearSeed, readSeed } from '../../lib/prerenderSeed';

export type HomeDataStatus = 'loading' | 'ready' | 'error' | 'misconfigured';

export interface HomeData {
  status: HomeDataStatus;
  places: Place[];
  savedPlaces: Place[];
  trips: Trip[];
  retry: () => void;
}

/**
 * The homepage's data.
 *
 * Starts `loading` on the server and on the client alike, so the prerendered markup and
 * the first client render agree — the prerendered page therefore contains the skeleton,
 * not the rails. The rails cannot be prerendered anyway: Top Recommendations depends on
 * the visitor's interests and Popular on their session seed, neither of which exists at
 * build time.
 *
 * **Unless the page came with a seed.** A prerendered place page carries its own row in the
 * HTML, so it starts `ready` with that one place and never shows a skeleton for content the
 * crawler can already see. See lib/prerenderSeed.ts. The fetch still runs — the seed is one
 * row, and the Popular rail needs the rest.
 *
 * Failure handling is deliberately asymmetric:
 *
 *  - **places fails → `error`.** Without places there is no homepage, so the full-page
 *    takeover is the honest answer.
 *  - **saved places or trips fail → logged, and that rail does not render.** They are two
 *    rails out of eight, both signed-in only, and losing the whole page because a trips
 *    read failed would be a worse outcome than losing the trips card. Same rule as the
 *    app: Postgres errors are logged, never rendered.
 */
export function useHomeData(): HomeData {
  const { user, status: sessionStatus } = useSession();
  const userId = user?.id ?? null;

  const [places, setPlaces] = useState<Place[]>(() => readSeed() ?? []);
  const [status, setStatus] = useState<HomeDataStatus>(() =>
    readSeed() ? 'ready' : 'loading',
  );
  const seeded = useRef(readSeed() != null);
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    /* A seeded page already has its content on screen; flipping to `loading` would replace
       the prerendered page with a skeleton for the length of one request. */
    if (!seeded.current) setStatus('loading');
    seeded.current = false;
    clearSeed();

    void (async () => {
      try {
        const rows = await fetchPlaces();
        if (cancelled) return;
        setPlaces(rows);
        setStatus('ready');
      } catch (error) {
        logRead('places', error);
        /* A configuration problem and a data outage look identical on the designed error
           page. They are not the same thing, and only one of them is fixable by the person
           looking at the screen. */
        if (!cancelled) setStatus(isCredentialsProblem(error) ? 'misconfigured' : 'error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    if (!userId) {
      setSavedIds([]);
      setTrips([]);
      return;
    }

    let cancelled = false;

    void (async () => {
      const [saved, trip] = await Promise.allSettled([
        fetchSavedPlaceIds(SAVED_PLACES_COUNT),
        fetchTrips(),
      ]);
      if (cancelled) return;

      if (saved.status === 'fulfilled') setSavedIds(saved.value);
      else logRead('saved_places', saved.reason);

      if (trip.status === 'fulfilled') setTrips(trip.value);
      else logRead('itineraries', trip.reason);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  /* Saved rows carry a place_id; the place itself comes from the one query already in
     memory. A saved place that is unpublished simply produces no card — the app's
     documented steady state, not a failure. */
  const savedPlaces = useMemo(() => {
    if (savedIds.length === 0) return [];
    const byId = new Map(places.map((place) => [place.id, place]));
    return savedIds.map((id) => byId.get(id)).filter((place): place is Place => place != null);
  }, [savedIds, places]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  /* The page is still resolving while the session is: a signed-in visitor's rails depend
     on their interests, and rendering the guest order first would visibly re-order. */
  const combined: HomeDataStatus =
    status === 'ready' && sessionStatus === 'resolving' ? 'loading' : status;

  return { status: combined, places, savedPlaces, trips, retry };
}

/* PostgrestError is a plain object, not an Error, so `String(error)` prints
   "[object Object]" and tells you nothing. Same shape as the app's logDbError: the code
   is the part that identifies the problem. Errors are logged, never rendered — the
   reader sees only the designed error state. */
/** Missing at construction, or rejected by the server once it got there. */
export function isCredentialsProblem(error: unknown): boolean {
  if (error instanceof MissingCredentialsError) return true;
  const message = (error as { message?: string } | null)?.message ?? '';
  return /invalid api key|jwt|apikey/i.test(message);
}

function logRead(scope: string, error: unknown): void {
  const e = error as { code?: string; message?: string; details?: string; hint?: string };
  const detail =
    error instanceof Error
      ? error.message
      : [e?.code ?? 'no-code', e?.message, e?.details, e?.hint].filter(Boolean).join(' | ');
  console.warn(`[home] ${scope} read failed: ${detail}`);
}
