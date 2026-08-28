import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchTrip, MAX_STOPS_PER_DAY, MAX_TRIP_DAYS } from '../../lib/trips';
import { daysBetween, parseIso } from '../../lib/tripDates';
import { currentAccessToken } from '../../lib/askPete';
import {
  saveTrip,
  type EditDay,
  type EditFailure,
  type EditOutcome,
  type TripDay,
  type TripElement,
  type TripWarning,
} from '../../lib/tripEdit';

/**
 * The trip editor's state and its one endpoint.
 *
 * Every mutation is optimistic — a reorder has to feel instant — and then canonical: the
 * whole document goes to `trip-edit`, and its response REPLACES local state. The server
 * owns times, travel and lunch; this hook owns order and intent and nothing else. It
 * carries no scheduling constants: no pace caps, no morning thresholds, no lunch rules.
 * The two bounds it does carry (31 days, 20 stops) are request-shape bounds from the
 * contract, not knowledge about how a day is built.
 */

export interface EditorDay {
  /** Stable local identity — survives reorders, renumbering and saves. */
  key: number;
  /**
   * The stored `day_number` this day derives from; null = added locally and not yet
   * materialised. Re-baselined to its position after every successful save, because the
   * response days ARE the stored trip at that point.
   */
  source: number | null;
  /** Server-derived. Null on a never-saved day; the caller computes one for display. */
  date: string | null;
  pois: TripElement[];
  /**
   * True from local mutation until the canonical days land. A pending day's times and
   * travel rows render as pending, NEVER their old numbers: a leg whose neighbours just
   * changed must not show its previous value as though it were still true, and this
   * client cannot compute a replacement — the honest fallback is straight-line distance,
   * which the app measured at a median 1.46× the road distance and called a lie.
   */
  pending: boolean;
}

/**
 * One per outcome, because they need different things from the reader.
 *
 * They used to collapse into a single "That change couldn't be saved", which told nobody
 * anything: a 409 wants "look at what is on screen now", a dropped connection wants
 * "try again", and a client-side refusal wants "reload" — and the last one is a fault on
 * this side that must be logged rather than blamed on the network.
 */
export type EditorNotice =
  | { kind: 'conflict' }
  | { kind: 'offline' }
  | { kind: 'server' }
  | { kind: 'blocked' }
  | { kind: 'auth' }
  | { kind: 'gone' };

export interface EditorState {
  days: EditorDay[];
  name: string | null;
  tripStart: string | null;
  tripEnd: string | null;
  updatedAt: string;
  saving: boolean;
  warnings: TripWarning[];
  notice: EditorNotice | null;
}

/**
 * How long the token read in front of a send may take before the save gives up on it.
 *
 * `getSession()` goes to the network when the token needs refreshing, so it is the second
 * await in the save loop that can hang, and it hangs the same way the send does: `saving`
 * is a ref, and every mutation made while it is true only sets `queued` and returns. One
 * await that never settles therefore leaves the trip in "Saving…" for as long as it is
 * open and silently swallows every edit after it. Shorter than the send's own timeout
 * because this is not the work, it is the thing in front of the work.
 */
const TOKEN_TIMEOUT_MS = 8_000;

/**
 * Consecutive `transport` failures to ride out before an edit is reverted, and the step
 * between them — 0.7s, then 1.4s, so a blip costs about two seconds and an outage still
 * resolves inside the person's patience.
 */
const TRANSPORT_RETRIES = 2;
const RETRY_BACKOFF_MS = 700;

/** Distinguishable from any value the promise could resolve to, including null. */
const TIMED_OUT = Symbol('timed-out');

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | typeof TIMED_OUT> {
  return Promise.race([
    promise,
    new Promise<typeof TIMED_OUT>((resolve) => {
      setTimeout(() => resolve(TIMED_OUT), ms);
    }),
  ]);
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

let nextKey = 1;

function toEditorDays(days: readonly TripDay[]): EditorDay[] {
  return days.map((day, index) => {
    nextKey += 1;
    return {
      key: nextKey,
      source: index + 1,
      date: typeof day.date === 'string' ? day.date : null,
      pois: Array.isArray(day.pois) ? day.pois : [],
      pending: false,
    };
  });
}

/** Elements that go up in the payload: real POIs with an integer id. Lunch is
 *  server-derived and is never sent back. */
function payloadPois(pois: readonly TripElement[]): { place_id: number }[] {
  return pois
    .filter(
      (element) =>
        element.type === 'poi' &&
        typeof element.place_id === 'number' &&
        Number.isInteger(element.place_id),
    )
    .map((element) => ({ place_id: element.place_id as number }));
}

/* PostgrestError is a plain object, so `String(error)` prints "[object Object]" and says
   nothing. The code is the part that identifies the problem — the same shape useHomeData
   settled on in phase 2. */
function describe(error: unknown): string {
  if (error instanceof Error) return error.message;
  const e = error as { code?: string; message?: string; details?: string; hint?: string };
  return [e?.code ?? 'no-code', e?.message, e?.details, e?.hint].filter(Boolean).join(' | ');
}

/** `enabled` is the session: without one, RLS returns no row and a load would only
 *  produce a misleading "this trip is not here". The caller shows a sign-in panel
 *  instead, so nothing is requested. */
export function useTripEditor(tripId: string | undefined, enabled: boolean) {
  const [state, setState] = useState<EditorState>({
    days: [],
    name: null,
    tripStart: null,
    tripEnd: null,
    updatedAt: '',
    saving: false,
    warnings: [],
    notice: null,
  });
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');

  /**
   * `days` and `updatedAt` live in refs, and the refs are the source of truth for the save
   * loop; `state` is a mirror kept for rendering.
   *
   * This is not a micro-optimisation, it is the fix for a real defect. `mutate` used to
   * call `setState` and then `flush` in the same tick, and `flush` read a ref that was only
   * assigned during render — so every save sent the document as it was BEFORE the mutation
   * that triggered it, then applied that response as canonical and silently discarded the
   * user's change. It was invisible on a new trip, because the empty-document guard
   * refused first.
   */
  const daysRef = useRef<EditorDay[]>([]);
  const updatedAtRef = useRef('');

  /** Bumped on every local mutation. A canonical response is applied only if it is still
   *  unchanged — one counter does the job the app needs per-day revisions for, because
   *  this client always sends the whole document anyway. */
  const generation = useRef(0);
  /** The last state the server confirmed, for reverting a failed edit. */
  const canonical = useRef<{ days: EditorDay[]; updatedAt: string } | null>(null);
  const saving = useRef(false);
  const queued = useRef(false);
  /** Tried once per mount, whatever the outcome — a failed attempt must not loop. */
  const materialised = useRef(false);

  const load = useCallback(async (id: string) => {
    try {
      const trip = await fetchTrip(id);
      if (!trip) {
        setStatus('missing');
        return;
      }
      const days = toEditorDays(trip.days as TripDay[]);
      canonical.current = { days, updatedAt: trip.updatedAt };
      daysRef.current = days;
      updatedAtRef.current = trip.updatedAt;
      setState({
        days,
        name: trip.name,
        tripStart: trip.tripStart,
        tripEnd: trip.tripEnd,
        updatedAt: trip.updatedAt,
        saving: false,
        warnings: [],
        notice: null,
      });
      setStatus('ready');
    } catch (error) {
      console.warn('[trip] load failed:', describe(error));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!tripId || !enabled) return;
    void load(tripId);
  }, [tripId, enabled, load]);

  const flush = useCallback(
    async (extra?: { name?: string; trip_start?: string }) => {
      if (!tripId) return;
      if (saving.current) {
        queued.current = true;
        return;
      }
      saving.current = true;
      setState((previous) => ({ ...previous, saving: true }));

      let pendingExtra = extra;
      /* Consecutive `transport` failures. Reset by any send that lands. */
      let attempt = 0;

      for (;;) {
        queued.current = false;
        const sentGeneration = generation.current;

        /* Held, not just mapped over: if this send lands, the stored trip becomes exactly
           this list renumbered 1..N, so the snapshot is what the stored day numbers will
           mean. The raced branch below needs it. */
        const sent = daysRef.current;
        const days: EditDay[] = sent.map((day) => ({
          source_day_number: day.source,
          pois: payloadPois(day.pois),
        }));

        /* Read immediately before each send, so a trip left open for an hour does not
           post a token that expired while it sat there — and timed, because `getSession()`
           refreshes over the network, which makes this the loop's second way to hang. */
        const token = await withTimeout(currentAccessToken(), TOKEN_TIMEOUT_MS);

        const outcome: EditOutcome =
          token === TIMED_OUT
            ? /* Not `auth`: the session is not known to be bad, only unanswered. Calling
                 it auth would tell someone their sign-in expired because their wifi
                 dropped, and would skip the retry below. */
              { ok: false, kind: 'transport' }
            : await saveTrip(
                {
                  itinerary_id: tripId,
                  expected_updated_at: updatedAtRef.current,
                  days,
                  ...(pendingExtra?.name !== undefined ? { name: pendingExtra.name } : {}),
                  ...(pendingExtra?.trip_start !== undefined
                    ? { trip_start: pendingExtra.trip_start }
                    : {}),
                },
                token,
              );

        if (outcome.ok) {
          /* Cleared here rather than after the send, so a retried rename still carries
             the name it was asked to save. */
          pendingExtra = undefined;
          attempt = 0;

          /* The send landed, so the stored trip is now exactly what went up, renumbered
             1..N — whatever has happened locally since. Both of these follow from that
             and neither may wait for the un-raced path: `updated_at` because the next
             send would otherwise conflict against a row we ourselves just moved, and
             `canonical` because it is what a later failure reverts to, and reverting to a
             state the server has already replaced restores days that no longer exist
             under an `expected_updated_at` that can only 409. */
          updatedAtRef.current = outcome.data.updated_at;
          canonical.current = {
            days: toEditorDays(outcome.data.days),
            updatedAt: outcome.data.updated_at,
          };

          if (generation.current !== sentGeneration) {
            /* A mutation landed mid-flight. Do NOT apply days that are already stale —
               but every `source` still held locally names the numbering from BEFORE this
               save, and that numbering is gone. Re-baseline by key: a day that was sent
               now derives from its position in that payload, and a day added since was
               not sent and still derives from nothing.

               Without this, removing day 1 and adding a day before the response arrives
               sends `source_day_number: 3` against a document that now has two days —
               so day 2 carries the pace, times and suggested restaurant of what is now
               day 1, and day 3 names a stored day that does not exist. It is the same
               defect as the stale closure this hook's refs were introduced to fix: state
               captured before a save, re-sent after it. */
            const rebased = new Map(sent.map((day, index) => [day.key, index + 1]));
            daysRef.current = daysRef.current.map((day) =>
              rebased.has(day.key) ? { ...day, source: rebased.get(day.key) ?? null } : day,
            );
            setState((previous) => ({
              ...previous,
              days: daysRef.current,
              updatedAt: outcome.data.updated_at,
            }));
            continue;
          }

          const nextDays = canonical.current.days;
          daysRef.current = nextDays;
          setState((previous) => ({
            ...previous,
            days: nextDays,
            updatedAt: outcome.data.updated_at,
            name: outcome.data.name?.trim() || previous.name,
            tripStart: outcome.data.trip_start ?? previous.tripStart,
            tripEnd: outcome.data.trip_end ?? previous.tripEnd,
            warnings: outcome.data.warnings,
            notice: null,
          }));
          if (!queued.current) break;
          continue;
        }

        if (outcome.kind === 'conflict') {
          /* The guard fired: this copy is out of date. Reload and SAY so — retrying
             silently would overwrite whatever won the race, which is the one thing
             `expected_updated_at` exists to prevent. */
          saving.current = false;
          setState((previous) => ({ ...previous, saving: false }));
          await load(tripId);
          setState((previous) => ({ ...previous, notice: { kind: 'conflict' } }));
          return;
        }

        /* `transport` is the only failure where the user's intent has not been
           contradicted by anything — nothing came back, so nothing was refused. Retry it
           before reverting, because a revert here discards not just the edit that failed
           but every edit made while it was in flight, and those were never sent at all:
           they were queued behind it and then thrown away for a failure that was not
           theirs. Bounded, so a real outage still ends in a notice rather than a
           spinner.

           Safe against the case that looks dangerous — a request that landed while its
           response was lost — because the retry carries the same `expected_updated_at`,
           which no longer matches, so it returns a conflict and takes the reload-and-say-so
           path above. */
        if (outcome.kind === 'transport' && attempt < TRANSPORT_RETRIES) {
          attempt += 1;
          await delay(RETRY_BACKOFF_MS * attempt);
          continue;
        }

        revert(outcome.kind);
        break;
      }

      saving.current = false;
      setState((previous) => ({ ...previous, saving: false }));
    },
    [tripId, load],
  );

  function revert(kind: EditFailure) {
    const base = canonical.current;
    if (base) {
      daysRef.current = base.days;
      updatedAtRef.current = base.updatedAt;
    }
    /* Named rather than collapsed. `empty` and `invalid` never reached the server, so
       saying "check your connection" would be wrong, and they are faults on this side —
       logged, because nothing else would show them. */
    if (kind === 'empty' || kind === 'invalid') {
      console.warn(`[trip] refused before sending: ${kind}`);
    }
    setState((previous) => ({
      ...previous,
      days: base ? base.days : previous.days,
      updatedAt: base ? base.updatedAt : previous.updatedAt,
      notice:
        kind === 'auth'
          ? { kind: 'auth' }
          : kind === 'not_found'
            ? { kind: 'gone' }
            : kind === 'transport'
              ? { kind: 'offline' }
              : kind === 'empty' || kind === 'invalid'
                ? { kind: 'blocked' }
                : { kind: 'server' },
    }));
  }

  /** Apply a local change, mark the touched days pending, and save. */
  const mutate = useCallback(
    (next: (days: EditorDay[]) => EditorDay[], extra?: { name?: string; trip_start?: string }) => {
      /* The ref moves FIRST and synchronously, so the save that follows in this same tick
         sends what the user just did rather than what was there before it. */
      const nextDays = next(daysRef.current);
      daysRef.current = nextDays;
      generation.current += 1;
      setState((previous) => ({ ...previous, days: nextDays, notice: null }));
      void flush(extra);
    },
    [flush],
  );

  /**
   * Give a brand-new trip the days its dates imply.
   *
   * A trip created here starts as `{"days": []}` — the create mirrors the app's, and the
   * app never edits an empty document because it always generates a populated one. So
   * "edit a trip with no days" is a path that had never run anywhere, and it does not
   * work: `trip-edit` requires 1–31 days, the picker has no day to add a stop to, and the
   * From/To range the person chose at setup would be invisible until they pressed Add Day
   * by hand, once per day of their holiday.
   *
   * So the first time an empty trip is opened, its day skeleton is created in one
   * `trip-edit` call sized from `trip_start`..`trip_end`. The create stays exactly the
   * app's; the days are made by the endpoint that owns days.
   *
   * A trip with no dates is left alone — there is nothing to size it from, and Add Day
   * works from empty now that the payload is built from the mutation rather than from
   * whatever preceded it.
   */
  useEffect(() => {
    if (status !== 'ready' || materialised.current) return;
    if (daysRef.current.length > 0) return;

    const start = parseIso(state.tripStart);
    const end = parseIso(state.tripEnd);
    if (!start || !end) return;

    const span = Math.min(Math.max(daysBetween(start, end) + 1, 1), MAX_TRIP_DAYS);
    materialised.current = true;
    mutate(() =>
      Array.from({ length: span }, () => {
        nextKey += 1;
        return { key: nextKey, source: null, date: null, pois: [], pending: true };
      }),
    );
    // `mutate` is stable through `flush`; re-running this on every render would re-send.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, state.tripStart, state.tripEnd]);

  const touch = (day: EditorDay, pois: TripElement[]): EditorDay => ({
    ...day,
    pois,
    pending: true,
  });

  return {
    state,
    status,
    reload: () => (tripId ? load(tripId) : Promise.resolve()),
    dismissNotice: () => setState((previous) => ({ ...previous, notice: null })),

    moveStop(dayIndex: number, poiIndex: number, direction: -1 | 1) {
      mutate((days) => {
        const day = days[dayIndex];
        if (!day) return days;
        const stops = day.pois.filter((element) => element.type === 'poi');
        const target = poiIndex + direction;
        if (poiIndex < 0 || poiIndex >= stops.length || target < 0 || target >= stops.length) {
          return days;
        }
        const next = [...stops];
        const [moved] = next.splice(poiIndex, 1);
        if (moved) next.splice(target, 0, moved);
        return days.map((d, i) => (i === dayIndex ? touch(d, next) : d));
      });
    },

    moveStopToDay(fromDay: number, poiIndex: number, toDay: number) {
      mutate((days) => {
        const from = days[fromDay];
        const to = days[toDay];
        if (!from || !to || fromDay === toDay) return days;
        const stops = from.pois.filter((element) => element.type === 'poi');
        const moved = stops[poiIndex];
        if (!moved) return days;
        if (to.pois.filter((e) => e.type === 'poi').length >= MAX_STOPS_PER_DAY) return days;
        const remaining = stops.filter((_, i) => i !== poiIndex);
        return days.map((d, i) => {
          if (i === fromDay) return touch(d, remaining);
          if (i === toDay) return touch(d, [...d.pois.filter((e) => e.type === 'poi'), moved]);
          return d;
        });
      });
    },

    removeStop(dayIndex: number, poiIndex: number) {
      mutate((days) => {
        const day = days[dayIndex];
        if (!day) return days;
        const stops = day.pois.filter((element) => element.type === 'poi');
        return days.map((d, i) =>
          i === dayIndex ? touch(d, stops.filter((_, index) => index !== poiIndex)) : d,
        );
      });
    },

    addStops(dayIndex: number, placeIds: readonly number[]) {
      if (placeIds.length === 0) return;
      mutate((days) => {
        const day = days[dayIndex];
        if (!day) return days;
        const stops = day.pois.filter((element) => element.type === 'poi');
        const existing = new Set(stops.map((element) => element.place_id));
        /* The contract refuses the same place twice in one day (R6), so it is pre-checked
           rather than sent and rejected. */
        const fresh = placeIds
          .filter((id) => !existing.has(id))
          .slice(0, Math.max(0, MAX_STOPS_PER_DAY - stops.length))
          .map<TripElement>((id) => ({ type: 'poi', place_id: id }));
        if (fresh.length === 0) return days;
        return days.map((d, i) => (i === dayIndex ? touch(d, [...stops, ...fresh]) : d));
      });
    },

    addDay() {
      mutate((days) => {
        if (days.length >= MAX_TRIP_DAYS) return days;
        nextKey += 1;
        return [...days, { key: nextKey, source: null, date: null, pois: [], pending: true }];
      });
    },

    removeDay(dayIndex: number) {
      mutate((days) => (days.length <= 1 ? days : days.filter((_, i) => i !== dayIndex)));
    },

    rename(name: string) {
      const trimmed = name.trim();
      if (!trimmed) return;
      mutate((days) => days, { name: trimmed });
    },
  };
}
