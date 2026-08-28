import { MAX_TRIP_DAYS } from './trips';

/**
 * Client for `trip-edit` — the endpoint that owns every change to a trip.
 *
 * Contract: `docs/trip-edit-contract.md` (v1, 2026-08-18) in the backend repo, which wins
 * over anything older. Read from that document and from `supabase/functions/trip-edit`,
 * then **verified against the deployment** on 28 Aug 2026 — see the notes on each rule.
 *
 * FREE AND UNLIMITED. No embedding, no LLM, and it never calls `consume_trip_generation`
 * — that RPC meters generation and an edit is not one. So nothing in this client confirms
 * before sending, warns about cost, or rations attempts. It is the opposite of
 * `trip-generate` in every way that matters to a client.
 *
 * ONE OPERATION, NOT SIX. Reorder, move between days, add or remove a stop, add or remove
 * a day, rename and move dates are the same call: the whole trip goes up as `days`, and
 * the difference is the content. There is no partial update and no patch.
 *
 * POIs BY ID ONLY. `{ "place_id": int }` and nothing else. The deployed function refuses
 * anything more with a message that says why:
 *
 *     400 unknown keys in days[0].pois[0]: start_time
 *         (stops are sent by place_id only; times, legs and lunch are server-derived)
 *
 * That is also the answer to the frame's time picker — see AddToTrip.tsx.
 *
 * NEVER SEND `trip_end`. The server derives it from `trip_start` + the day count, and
 * sending it is a 400 naming the key (verified). That derivation is what stops the column
 * and the days array disagreeing.
 *
 * THE RESPONSE IS CANONICAL. Replace state with `days` wholesale — no merging, no keeping
 * local times. The server owns times, travel and lunch. Store `updated_at` for the next
 * edit.
 */

const TRIP_EDIT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trip-edit`;

/**
 * How long one edit may sit on the wire before it is called dead.
 *
 * Without it this request has no upper bound, and an unbounded request is not just a slow
 * save — the caller's loop holds a `saving` flag while it waits, and every edit made in
 * the meantime is queued behind it rather than sent. So one socket that never answers
 * leaves the trip in "Saving…" for as long as the tab is open and silently swallows
 * everything after it. A hung connection cannot be told from a slow one from in here, so
 * the only honest move is to stop waiting.
 *
 * Fifteen seconds. `trip-edit` runs no LLM and no embedding — it is a document write plus
 * scheduling arithmetic — and the slowest edit measured against the deployment on
 * 28 Aug 2026 was well under two.
 */
const TIMEOUT_MS = 15_000;

/** True for the timeout above and for a caller-side abort, which are the same thing to
 *  every caller: the request produced no answer. Checked by name rather than with
 *  `instanceof DOMException`, so this file still behaves in a test process. */
function isAbort(error: unknown): boolean {
  const name = (error as { name?: string } | null)?.name;
  return name === 'TimeoutError' || name === 'AbortError';
}

/** One stop as it goes up: an id, in order, and nothing else. */
export interface EditPoi {
  place_id: number;
}

export interface EditDay {
  /**
   * The `day_number` this day had in the document the client loaded; null for a day the
   * user added. This is what lets a mid-trip insert leave later days' stops "kept", and
   * what carries each day's pace and suggested restaurant across renumbering. Without it,
   * adding a day at the front would re-time the whole trip.
   */
  source_day_number: number | null;
  pois: EditPoi[];
}

/** A stop as it comes back. Read tolerantly: a stored element with a surprising shape
 *  must render degraded, never crash. */
export interface TripElement {
  type?: string | null;
  place_id?: number | null;
  slug?: string | null;
  name?: string | null;
  category?: string | null;
  hero_image_url?: string | null;
  lat?: number | null;
  lng?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  travel_to_next_min?: number | null;
  /** `"car" | "walking"` — there is no third value, and no distance is stored. */
  travel_mode?: string | null;
  notes?: string | null;
  suggested?: boolean | null;
}

export interface TripDay {
  day_number?: number | null;
  date?: string | null;
  pace?: string | null;
  pois?: TripElement[] | null;
}

/** Advisory tier: R2/R3/R5/R7/R9. Shown, never blocking — nothing in it was refused.
 *  `message` is server-authored English prose and is not translatable. */
export interface TripWarning {
  day_number?: number | null;
  rule?: string | null;
  message?: string | null;
}

export interface EditResponse {
  days: TripDay[];
  warnings: TripWarning[];
  updated_at: string;
  name?: string | null;
  trip_start?: string | null;
  trip_end?: string | null;
}

export type EditFailure =
  /**
   * Refused here, before anything was sent: the document has no days.
   *
   * `trip-edit` requires 1–31 (the deployed function answers *"days must contain at least
   * one day"*), so sending it would be a guaranteed 400 — but this is still a fault on
   * the client's side, and it must not be reported as though the network failed. It is
   * reachable because a trip created on the web starts as `{"days": []}`, which is a
   * document the app never produces: it always generates a populated one.
   */
  | 'empty'
  /** `expected_updated_at` did not match: someone edited this trip elsewhere. */
  | 'conflict'
  /** The trip is gone, or was never the caller's. */
  | 'not_found'
  /** Session expired. */
  | 'auth'
  /** A client bug by construction — every checkable rule is pre-checked. */
  | 'invalid'
  /** Reached the server and failed there. */
  | 'server'
  /** Never reached the server. */
  | 'transport';

export type EditOutcome =
  | { ok: true; data: EditResponse }
  | { ok: false; kind: EditFailure };

interface EditRequest {
  itinerary_id: string;
  expected_updated_at: string;
  days: EditDay[];
  trip_start?: string;
  name?: string;
}

/**
 * Typed code first, status second — the same discipline as the Ask Pete client, and for
 * the same reason: `detail` names internal stages and breaks across five languages.
 *
 * `place_not_found` and `place_not_plannable` are mapped to `invalid` rather than given
 * their own kinds, because the picker makes both unreachable: it offers only rows that
 * are `status = published` AND `plannable = true` (146 of 181, all with coordinates,
 * measured). If either ever arrives it is a bug in this client, which is what `invalid`
 * means here.
 */
function toFailure(status: number, code: string | null): EditFailure {
  switch (code) {
    case 'conflict':
      return 'conflict';
    case 'not_found':
      return 'not_found';
    case 'unauthorized':
      return 'auth';
    case 'invalid_request':
    case 'place_not_found':
    case 'place_not_plannable':
      return 'invalid';
  }
  switch (status) {
    case 409:
      return 'conflict';
    case 404:
      return 'not_found';
    case 401:
      return 'auth';
    case 400:
      return 'invalid';
    default:
      return 'server';
  }
}

/**
 * Send one edit.
 *
 * `expected_updated_at` is passed through exactly as it was read — a string, never parsed
 * and re-serialised. The server compares at millisecond resolution, so `Z` versus
 * `+00:00` is not a false conflict, but a reformatted value would be.
 */
export async function saveTrip(
  request: EditRequest,
  /**
   * Passed in rather than read here.
   *
   * The caller obtains it immediately before each send — `getSession()` refreshes an
   * expired token, so freshness is unchanged — and this function becomes a pure function
   * of its arguments plus `fetch`, which is what makes its outcome table testable. It was
   * not, and the first harness written against it reported every case as `auth` because
   * there is no session in a test process.
   */
  token: string | null,
): Promise<EditOutcome> {
  /* Pre-checked rather than sent — the server refuses both, verified against the
     deployment ("days must contain at least one day" / "maximum trip length is 31 days").
     They are reported apart because they mean different things: an empty document is a
     state the trip can legitimately be in, and too many days is a bug in this client. */
  if (request.days.length === 0) return { ok: false, kind: 'empty' };
  if (request.days.length > MAX_TRIP_DAYS) return { ok: false, kind: 'invalid' };

  if (!token) return { ok: false, kind: 'auth' };

  let response: Response;
  try {
    response = await fetch(TRIP_EDIT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    /* A timeout lands here as an abort, and it is `transport` for the same reason a
       dropped socket is: nothing came back. Whether the server received it is unknowable
       from here — the caller retries anyway, and a request that DID land comes back as a
       conflict on the retry, which is handled. */
    if (isAbort(error)) {
      console.warn(`[tripEdit] no response within ${TIMEOUT_MS}ms`);
    } else {
      console.warn('[tripEdit] request failed:', error);
    }
    return { ok: false, kind: 'transport' };
  }

  if (!response.ok) {
    let code: string | null = null;
    try {
      const body = (await response.json()) as Record<string, unknown>;
      /* `error` is ours; `code` is the Supabase gateway's, which answers before the
         function runs when the bearer is missing or malformed. */
      code =
        typeof body.error === 'string'
          ? body.error
          : typeof body.code === 'string'
            ? body.code
            : null;
    } catch {
      code = null;
    }
    const kind = toFailure(response.status, code);
    if (kind === 'invalid' || kind === 'server') {
      console.warn('[tripEdit] HTTP', response.status, code ?? 'no-code');
    }
    return { ok: false, kind };
  }

  let body: EditResponse | null = null;
  try {
    body = (await response.json()) as EditResponse;
  } catch (error) {
    /* The timeout covers the body too, so it can fire between the status line and the
       document. That is transport rather than `server`: nothing about the trip was
       refused, and transport is the one failure the caller retries. */
    if (isAbort(error)) {
      console.warn('[tripEdit] response body did not arrive in time');
      return { ok: false, kind: 'transport' };
    }
    body = null;
  }

  /* A 200 whose body is not the canonical document is a failure, not a success: applying
     a partial response would replace real days with nothing. */
  if (!body || !Array.isArray(body.days) || typeof body.updated_at !== 'string') {
    console.warn('[tripEdit] malformed 200');
    return { ok: false, kind: 'server' };
  }

  return {
    ok: true,
    data: { ...body, warnings: Array.isArray(body.warnings) ? body.warnings : [] },
  };
}
