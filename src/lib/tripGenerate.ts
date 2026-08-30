import { getSupabase } from './supabase';
import { currentAccessToken } from './askPete';
import type { InterestSlug } from '../contracts/interests';
import type { BaseLocation } from './trips';
import { fetchPlannerProfile, type PlannerProfile } from './profile';

/**
 * Client for `trip-generate` — the one endpoint on this site that costs money to call.
 *
 * Contract read from `supabase/functions/trip-generate/index.ts` at HEAD and **verified
 * against the deployment** on 30 Aug 2026. Body validation runs at `:1376-1525`, ahead of
 * `authenticateUser` at `:1528`, so every rule below was probed with the project anon key
 * as the bearer — no session, no quota, no model, no row. Probes and their exact replies
 * are in `docs/PHASE-6-PLAN.md` §0.
 *
 * THE ORDER THAT MATTERS. `handleRequest` runs: premium gate `:1555` → **quota consumed
 * `:1567`** → embedding → retrieval → hydration → travel matrix → LLM `:1834` (twice, as
 * a rule — 15 of 15 recent generations ran the correction retry) → validation → persist
 * `:2288` → respond `:2318`. Everything that fails *after* `:1567` has already spent one
 * of the day's three, and **there is no refund path** — decision-log entry 63 ruled one
 * and nothing was built. So every failure this file reports has to say whether it counted.
 *
 * WHETHER IT COUNTED IS MEASURED, NOT INFERRED FROM THE STATUS CODE. A 500 can come from
 * `profile fetch failed` (before the counter) or `persist failed` (long after it); a
 * thrown `fetch` can mean the request never left or that the socket dropped with the
 * model mid-sentence. The status code cannot tell those apart. The counter row can:
 * `consume_trip_generation` writes `trip_generations_today` and `_reset_at` on every
 * allow, so the row is read before the request and again after the ending, and **the
 * attempt counted if and only if the row moved**. That comparison is the source of every
 * "that attempt counted" and every "trying again is safe" the screen shows.
 *
 * THE ROW IS WRITTEN BEFORE THE RESPONSE. `persistItinerary` INSERTs the itinerary and
 * `itinerary_id` in the 200 is that row's id. That is why an ambiguous ending — a
 * timeout, a dropped socket, a 5xx — is answered by looking for the row rather than by
 * declaring failure.
 *
 * WHAT IS NOT IN THIS FILE. No scheduling knowledge: no pace caps, no morning thresholds,
 * no lunch rules, no idea what a day looks like. The two bounds it carries are request
 * shape (`MAX_INTEREST_TAGS`) and a documented server default (`TRIP_GENERATION_DAILY_CAP`),
 * and the second is corrected from the wire the moment the wire mentions it.
 */

const TRIP_GENERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trip-generate`;

/**
 * How long one generation may sit on the wire before this client stops waiting.
 *
 * Fourteen wall clocks are on record: min 12.8 s, **median 22**, p75 ≈ 32, **max 57.4**.
 * Two `gpt-4.1-mini` completions plus an embedding set the band, not trip length — the
 * 14-day trip sat in the middle at 37 s. **Neither OpenAI call carries a timeout or an
 * abort signal** (`llm.ts:109`, `index.ts:2348`), so the only real ceilings are OpenAI's
 * own and the platform's per-request wall clock — 150 s on the Supabase Free plan
 * according to prior reports; the project's plan is not exposed by the Management API, so
 * that figure is unverified for this project.
 *
 * 120 s, not the app's 90. 57.4 s is the maximum of fourteen samples rather than a
 * ceiling, and giving up early produces the worst ending available: the generation is
 * spent, the row is about to be written, and the screen has just said something failed.
 * 120 s sits above any plausible success and below the wall clock that would end the
 * request anyway — so this client stops waiting at roughly the moment the server does.
 *
 * Aborting here stops nothing on the server. It does not cancel the handler, does not
 * cancel the OpenAI calls and does not refund the allowance. It only stops this browser
 * waiting, which is why the screen offers no Cancel.
 */
export const GENERATE_TIMEOUT_MS = 120_000;

/**
 * When to look for the row after an ending that could not be read from the wire.
 *
 * **The app fires one query, immediately, and that is a defect** (recorded in
 * `docs/PARKED.md`): its 90 s abort lands exactly when the persist may still be in
 * flight, the single read returns nothing, and the user is told "no trip was created"
 * by a query fired too early to know — while the row appears a second later.
 *
 * Four reads over fifteen seconds narrow that window; they do not close it, because
 * nothing bounds how long the server takes. That is why the copy for this ending stays
 * conditional — "if the plan finishes, it will be in My Trips" — rather than asserting
 * either outcome. The reads are indexed reads of the caller's own rows under RLS.
 */
const RECOVERY_SCHEDULE_MS: readonly number[] = [0, 3_000, 8_000, 15_000];

/** After this long the waiting copy changes. Past the median, well short of the bound. */
export const GENERATE_SLOW_AFTER_MS = 45_000;

/**
 * How long the token read in front of the request may take.
 *
 * `getSession()` goes to the network when the token needs refreshing, and phase 5 found
 * the shape this guards against: one await that never settles leaves the screen in its
 * busy state for as long as the tab is open, with no timeout ever armed because the
 * timeout is set *after* the token. Same value as the editor's `TOKEN_TIMEOUT_MS`.
 */
const TOKEN_TIMEOUT_MS = 8_000;

/** `interest_tags` takes 1–5 slugs; a sixth is a 400 (probed). */
export const MAX_INTEREST_TAGS = 5;

/**
 * `TRIP_GENERATE_DAILY_CAP`, the server's env var, defaulting to 3 at `index.ts:2345`.
 *
 * A client cannot read it — `consume_trip_generation` is `service_role` only — so this is
 * a documented default and nothing more. The real number rides the 429, and the moment one
 * arrives it replaces this for the rest of the session. It is also the one number on the
 * Premium explanation that is a claim rather than a reading, because a free account can
 * never receive the 429 that would correct it.
 */
export const TRIP_GENERATION_DAILY_CAP = 3;

export type PartyType = 'solo' | 'couple' | 'family' | 'friends';
export type ChildAgeRange = 'under_5' | 'age_5_12' | 'teenagers';

/** Everything the wizard collects that goes on the wire. Pace and morning are not here —
 *  they are profile columns the server reads for itself (`lib/profile.ts`). */
export interface TripDraft {
  startIso: string | null;
  endIso: string | null;
  baseLocation: BaseLocation | null;
  interestTags: readonly InterestSlug[];
  partyType: PartyType | null;
  /** Only meaningful with `family`, and only `under_5` has an effect on the server. */
  childAgeRange: ChildAgeRange | null;
}

export const EMPTY_DRAFT: TripDraft = {
  startIso: null,
  endIso: null,
  baseLocation: null,
  interestTags: [],
  partyType: null,
  childAgeRange: null,
};

/** Shape only. Date ordering, the span bound and the earliest start are the wizard's to
 *  check — they need today's date, which this module deliberately does not compute. */
export function draftComplete(draft: TripDraft): boolean {
  return (
    draft.startIso != null &&
    draft.endIso != null &&
    draft.baseLocation != null &&
    draft.interestTags.length > 0 &&
    draft.interestTags.length <= MAX_INTEREST_TAGS
  );
}

/**
 * One per ending, because they need different things from the reader.
 *
 * Whether the attempt counted is NOT encoded here — it is `consumed` on the state, and it
 * is measured (see the header). What the kind carries is what the server said, or that it
 * said nothing:
 *
 * | kind | what happened |
 * |---|---|
 * | `premium`    | 403, the gate. Before the counter, so never consumed |
 * | `account`    | 403, anonymous session — unreachable on this site |
 * | `quota`      | 429; migration 0047 rejects without incrementing |
 * | `invalid`    | 400, before auth. A defect on this side — everything is pre-validated |
 * | `auth`       | 401, or no session to send |
 * | `generation` | 422 after the model ran. The server says no trip; retry is legitimate |
 * | `server`     | 5xx, or a 200 whose id could not be resolved |
 * | `slow`       | no answer we could use, and the counter moved — the server may still be working |
 * | `offline`    | no answer we could use, and the counter did not move — nothing was spent |
 */
export type GenerationFailure =
  | 'premium'
  | 'account'
  | 'quota'
  | 'invalid'
  | 'auth'
  | 'generation'
  | 'server'
  | 'slow'
  | 'offline';

export interface QuotaReport {
  remaining: number;
  cap: number;
  /** The Cyprus calendar day the count belongs to, `YYYY-MM-DD`, or null if unknown. */
  day: string | null;
  /**
   * Whether `remaining` is known to be TODAY's number.
   *
   * False on a cold open, and that is the point. The reset is lazy, so a stored count can
   * belong to an earlier day — and telling the two apart needs today's date **in Cyprus**,
   * which migration 0047 made a server fact and which decision-log entry 64 names as the
   * first thing that breaks when a client derives it. The app derives it in UTC and tells
   * Cyprus users they have nothing left every night between midnight and 03:00.
   */
  certain: boolean;
}

export type GenerationState =
  | { phase: 'idle' }
  | { phase: 'running'; startedAt: number }
  | { phase: 'success'; tripId: string }
  | {
      phase: 'error';
      kind: GenerationFailure;
      /**
       * Whether this attempt spent one of the day's allowance — **measured** by comparing
       * the counter row before and after (see the header). `null` when a read failed and
       * the comparison could not be made; the copy then says so rather than guessing.
       */
      consumed: boolean | null;
      /** Set when the recovery re-query found a row written by this attempt. */
      recoveredTripId: string | null;
      /** Re-read after the attempt. Certain whenever the attempt is known to have consumed. */
      quota: QuotaReport | null;
      /** The counter row as re-read after the attempt, for the wizard to adopt — the row it
       *  read at entry is stale the moment anything is spent. Null if the re-read failed. */
      profile: PlannerProfile | null;
    };

const IDLE: GenerationState = { phase: 'idle' };

// ---------------------------------------------------------------------------
// The machine. Module-level so a generation survives navigation inside the SPA:
// leaving the screen and coming back shows the run still in progress rather than
// restarting it or losing its outcome. Same shape as the app's, for the same reason.
// ---------------------------------------------------------------------------

let state: GenerationState = IDLE;
const listeners = new Set<() => void>();

/**
 * A day the server has named as "today", this session — or null.
 *
 * Set from a 429's `quota_day`, and from the counter row after an attempt that is known
 * to have consumed: `consume_trip_generation` writes `trip_generations_reset_at = v_day`
 * on every allow, so a row re-read straight after a consuming call carries the server's
 * own today. Those are the only two ways this client ever learns the date, and it never
 * computes one. A plain read of the row does NOT set it — a stored day is a day the count
 * belongs to, not evidence of what day it is now.
 *
 * KNOWN LIMIT, stated rather than hidden: a session that spans Cyprus midnight keeps the
 * day it learned before it. A count read after that is reported as certain and overstates
 * usage by yesterday's spend until the next 429 or consuming call corrects it. It can never
 * understate, and nothing on the screen is disabled on the strength of it — the server is
 * the authority and a refusal costs nothing.
 */
let knownToday: string | null = null;

/** Replaces the coded default the moment a 429 states the real number. */
let knownCap: number | null = null;

function setState(next: GenerationState): void {
  state = next;
  for (const listener of listeners) listener();
}

export function subscribeGeneration(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function generationSnapshot(): GenerationState {
  return state;
}

/** The prerender pass has no machine and never will — it renders no session. */
export function generationServerSnapshot(): GenerationState {
  return IDLE;
}

/** Clear a finished run so the screen starts clean next time. Never called while running. */
export function acknowledgeGeneration(): void {
  if (state.phase === 'running') return;
  setState(IDLE);
}

// ---------------------------------------------------------------------------
// The counter
// ---------------------------------------------------------------------------

function parseDay(value: unknown): string | null {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function capFor(used: number): number {
  /* The wire's number when there is one. Otherwise the coded default, raised if the row
     somehow shows more used than it allows for — a cap below the count would be describing
     an impossible state, and the larger of the two is the only one that can be true. */
  return Math.max(knownCap ?? TRIP_GENERATION_DAILY_CAP, used);
}

/**
 * What the counter row means, given what the server has said about the day.
 *
 * `justConsumed` is set by the caller in exactly one situation: the row was re-read after
 * an attempt the before/after comparison proved to have consumed. At that moment the row's
 * own `reset_at` **is** the server's today — written by the RPC, not derived here — and
 * the count is exact.
 */
export function quotaFromProfile(
  profile: PlannerProfile,
  options: { justConsumed?: boolean } = {},
): QuotaReport {
  const used = profile.generationsToday ?? 0;
  const rowDay = parseDay(profile.generationsResetAt);
  const cap = capFor(used);

  if (options.justConsumed && rowDay) knownToday = rowDay;

  if (knownToday == null || rowDay == null) {
    /* No day from the server yet. The count is a floor, not a fact — the lazy reset may
       not have run — so it is reported uncertain and the caller must not lock anything on
       it. A refusal costs nothing and the 429 carries the day that settles it. */
    return { remaining: Math.max(0, cap - used), cap, day: rowDay, certain: false };
  }

  if (rowDay < knownToday) {
    /* The row belongs to a day before one the server has called today, so the count is
       spent and the reset has simply not run yet: the full cap is available. */
    return { remaining: cap, cap, day: knownToday, certain: true };
  }

  if (rowDay > knownToday) {
    /* Written on a later day than the last one the server named to us — another device,
       or a session that crossed midnight and generated from the app. The RPC only ever
       writes today's day, so today is at least `rowDay`; whether it is exactly `rowDay` is
       not knowable from here, and the count is reported as a floor. */
    return { remaining: Math.max(0, cap - used), cap, day: rowDay, certain: false };
  }

  return { remaining: Math.max(0, cap - used), cap, day: rowDay, certain: true };
}

/** The day after the one a count belongs to — when the next allowance appears, Cyprus
 *  time. Plain date arithmetic on a date the server gave us; no timezone is derived. */
export function dayAfter(day: string): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return next.toISOString().slice(0, 10);
}

/**
 * Did the attempt spend an allowance? The row says.
 *
 * `consume_trip_generation` writes `trip_generations_today = v_today + 1` and
 * `_reset_at = v_day` on every allow (migration 0047) — so if either column differs
 * between the read before the request and the read after the ending, the RPC allowed a
 * generation in between. If both are identical, it did not: a rejection writes the same
 * count back, and a request that never reached the RPC writes nothing.
 *
 * Null when either read failed. The screen then says the count could not be confirmed
 * rather than picking a side.
 */
function counterMoved(before: PlannerProfile, after: PlannerProfile): boolean | null {
  if (before.access === 'unknown' || after.access === 'unknown') return null;
  return (
    before.generationsToday !== after.generationsToday ||
    before.generationsResetAt !== after.generationsResetAt
  );
}

// ---------------------------------------------------------------------------
// The row, before and after
// ---------------------------------------------------------------------------

interface ItineraryStamp {
  id: string;
  created_at: string;
}

/**
 * The newest trip the account owns, or that there is none — kept apart from "the read
 * failed". They used to collapse into one `null`, and the recovery treated both as
 * "compare against nothing", so a failed snapshot on an account with existing trips would
 * have "recovered" its most recent old one and announced it as just created. The app's
 * `latestItinerary` has the same collapse.
 */
type Snapshot = { ok: true; newest: ItineraryStamp | null } | { ok: false };

/** RLS scopes it; no user filter is needed and none is added, matching `lib/trips.ts`. */
async function snapshotItineraries(): Promise<Snapshot> {
  try {
    const { data, error } = await getSupabase()
      .from('itineraries')
      .select('id, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .returns<ItineraryStamp[]>();
    if (error) {
      console.warn('[planner] itineraries snapshot failed:', error.message);
      return { ok: false };
    }
    return { ok: true, newest: data?.[0] ?? null };
  } catch (error) {
    console.warn('[planner] itineraries snapshot threw:', error);
    return { ok: false };
  }
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Look for a row written by this attempt — repeatedly, because the interesting case is a
 * client that gave up while the server was still writing.
 *
 * `poll: false` for an ending the server has already answered (a 5xx): nothing is in
 * flight, so one read is the whole answer. With no usable snapshot there is nothing to
 * compare a row against, so the search is skipped — but the schedule's wait is still
 * honoured when polling, because the counter comparison that follows needs the same time
 * for the RPC to have run.
 */
async function findRecoveredTrip(before: Snapshot, poll: boolean): Promise<string | null> {
  const schedule = poll ? RECOVERY_SCHEDULE_MS : [0];
  if (!before.ok) {
    if (poll) await wait(schedule[schedule.length - 1] ?? 0);
    return null;
  }
  for (const delay of schedule) {
    if (delay > 0) await wait(delay);
    const fresh = await snapshotItineraries();
    if (!fresh.ok || !fresh.newest) continue;
    if (!before.newest || fresh.newest.created_at > before.newest.created_at) {
      return fresh.newest.id;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// The request
// ---------------------------------------------------------------------------

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

function buildBody(draft: TripDraft): Record<string, unknown> {
  /* Exactly the five accepted keys, and never a sixth: the accepted set is closed and an
     unknown key is a 400 that names it (`index.ts:1351-1357`). `group_size` is accepted by
     the server, stored, and never used in generation (`:1629`) — so it is not collected and
     not sent, because a control that changes nothing is worse than no control. */
  const body: Record<string, unknown> = {
    trip_start: draft.startIso,
    trip_end: draft.endIso,
    base_location: draft.baseLocation,
    interest_tags: [...draft.interestTags],
  };

  if (draft.partyType) {
    const party: Record<string, unknown> = { type: draft.partyType };
    /* `child_age_range` is accepted with any type but only has an effect on `family` +
       `under_5`, where it adds the `young_children` consideration. Sent only where it
       means something. */
    if (draft.partyType === 'family' && draft.childAgeRange) {
      party.child_age_range = draft.childAgeRange;
    }
    body.trip_party = party;
  }

  return body;
}

function readError(payload: unknown): { code: string | null; detail: unknown } {
  if (typeof payload !== 'object' || payload === null) return { code: null, detail: null };
  const record = payload as Record<string, unknown>;
  return {
    code: typeof record.error === 'string' ? record.error : null,
    detail: record.detail,
  };
}

/**
 * An ending the server answered before the counter: 400, 401, 403, 429. Nothing was
 * spent, and the row is re-read only so the wizard has a fresh one to go back to.
 */
async function settleBeforeCounter(
  kind: GenerationFailure,
  userId: string,
  quotaFromWire: QuotaReport | null,
): Promise<void> {
  const after = await fetchPlannerProfile(userId);
  const fresh = after.access === 'unknown' ? null : after;
  setState({
    phase: 'error',
    kind,
    consumed: false,
    recoveredTripId: null,
    quota: quotaFromWire ?? (fresh ? quotaFromProfile(fresh) : null),
    profile: fresh,
  });
}

/**
 * Every ending that happened — or may have happened — after the counter. Whether it
 * counted is measured; whether a row exists is looked for; and the kind is settled from
 * the evidence rather than from the status code alone:
 *
 *  - a row exists → recovered, whatever the wire said
 *  - the counter moved and there is no row → `answered` stands (422 → generation, 5xx →
 *    server), or `slow` when the server never answered and may still be working
 *  - the counter did not move → nothing was spent, and the ending becomes `offline`
 *    unless the server itself answered (a 422 or 5xx before the counter keeps its kind,
 *    with `consumed: false` so the copy says it did not count)
 *  - a read failed → `consumed: null`, and the copy says the count could not be confirmed
 */
async function settleAfterCounter(
  answered: 'generation' | 'server' | null,
  userId: string,
  before: PlannerProfile,
  snapshot: Snapshot,
): Promise<void> {
  /* Poll only when the server never answered — then the persist may still be in flight.
     After a 5xx or a 422 the handler has returned and one read is the whole answer. */
  const recoveredTripId = await findRecoveredTrip(snapshot, answered === null);

  const after = await fetchPlannerProfile(userId);
  const consumed = counterMoved(before, after);
  const fresh = after.access === 'unknown' ? null : after;
  const quota = fresh ? quotaFromProfile(fresh, { justConsumed: consumed === true }) : null;

  let kind: GenerationFailure;
  if (answered) {
    /* The server spoke. A 5xx after a spend with no usable snapshot is the one case where
       a row might exist unseen (`persist failed` is the ambiguous detail), so it takes the
       conditional copy rather than "no new trip appeared". */
    kind = answered === 'server' && consumed === true && !snapshot.ok ? 'slow' : answered;
  } else {
    kind = consumed === false ? 'offline' : 'slow';
  }

  setState({
    phase: 'error',
    kind,
    consumed,
    recoveredTripId,
    quota,
    profile: fresh,
  });
}

/**
 * The one expensive call.
 *
 * Idempotent against a double click: a second call while running is a no-op. Every ending
 * lands in the machine; the screen renders it and decides nothing.
 */
export async function startGeneration(userId: string, draft: TripDraft): Promise<void> {
  if (state.phase === 'running') return;
  if (!draftComplete(draft)) {
    setState({
      phase: 'error',
      kind: 'invalid',
      consumed: false,
      recoveredTripId: null,
      quota: null,
      profile: null,
    });
    return;
  }

  setState({ phase: 'running', startedAt: Date.now() });

  const token = await withTimeout(currentAccessToken(), TOKEN_TIMEOUT_MS);
  if (token === TIMED_OUT || !token) {
    /* Nothing was sent, so nothing was spent — `offline` for the hung refresh and `auth`
       for a session that is simply gone. The profile is not re-read: the network is the
       thing in doubt on the first, and there is no session to read with on the second. */
    console.warn('[planner] no token:', token === TIMED_OUT ? 'session read timed out' : 'no session');
    setState({
      phase: 'error',
      kind: token === TIMED_OUT ? 'offline' : 'auth',
      consumed: false,
      recoveredTripId: null,
      quota: null,
      profile: null,
    });
    return;
  }

  /* Two snapshots before the request, in parallel. The counter row is what decides
     whether the attempt counted; the newest itinerary is what every ambiguous ending is
     resolved against — a row newer than it means the generation happened and was paid
     for, whatever the wire said or failed to say. */
  const [before, snapshot] = await Promise.all([
    fetchPlannerProfile(userId),
    snapshotItineraries(),
  ]);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(TRIP_GENERATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(buildBody(draft)),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timer);
    /* Our own abort and a thrown fetch are the same ending to this client: no answer it
       can use. Neither says whether the request reached the server — a socket can drop
       with the model mid-sentence — so neither is allowed to say "nothing was spent".
       The counter decides (see settleAfterCounter). */
    console.warn(
      '[planner] no usable answer:',
      controller.signal.aborted ? `aborted at ${GENERATE_TIMEOUT_MS} ms` : error,
    );
    await settleAfterCounter(null, userId, before, snapshot);
    return;
  }
  clearTimeout(timer);

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (response.ok) {
    const id =
      typeof (payload as Record<string, unknown> | null)?.itinerary_id === 'string'
        ? ((payload as Record<string, unknown>).itinerary_id as string)
        : null;
    if (id) {
      /* The body's id is the inserted row's id (`index.ts:2320`), verified against the
         deployed contract — so unlike the app, which snapshots and re-reads because the
         key names were unverifiable at the time, this trusts it. The snapshot above is
         still taken, for the endings where the wire says nothing usable. */
      setState({ phase: 'success', tripId: id });
      return;
    }
    console.warn('[planner] 200 with no resolvable itinerary id');
    await settleAfterCounter('server', userId, before, snapshot);
    return;
  }

  const { code, detail } = readError(payload);
  console.warn(`[planner] HTTP ${response.status}: ${code ?? 'no-code'}`, detail ?? '');

  switch (response.status) {
    case 400:
      /* Every rule this endpoint enforces is pre-validated in the wizard, so a 400 is a
         defect on this side rather than something the reader did. Logged as one. */
      console.error('[planner] request refused by validation — client defect:', detail);
      await settleBeforeCounter('invalid', userId, null);
      return;
    case 401:
      await settleBeforeCounter('auth', userId, null);
      return;
    case 403:
      /* Told apart by `error`, which is what the two codes exist for (entry 5).
         `account_required` needs an anonymous session and this site creates none. */
      await settleBeforeCounter(code === 'account_required' ? 'account' : 'premium', userId, null);
      return;
    case 429: {
      const record = (payload ?? {}) as Record<string, unknown>;
      const day = parseDay(record.quota_day);
      if (day) knownToday = day;
      if (typeof record.daily_cap === 'number' && record.daily_cap > 0) {
        knownCap = record.daily_cap;
      }
      /* Authoritative, all three of them, and nothing was consumed — 0047 rejects an
         over-cap call without incrementing. */
      await settleBeforeCounter('quota', userId, {
        remaining: typeof record.remaining === 'number' ? record.remaining : 0,
        cap: knownCap ?? TRIP_GENERATION_DAILY_CAP,
        day,
        certain: day != null,
      });
      return;
    }
    case 422:
      /* After the model ran. The server says no trip; whether the allowance went with it
         is measured, not assumed. */
      await settleAfterCounter('generation', userId, before, snapshot);
      return;
    default:
      /* 500 and 502. `profile fetch failed` lands before the counter and `persist failed`
         long after it, with the same status — and the second can leave a row behind. Both
         questions are answered by looking rather than by the code. */
      await settleAfterCounter('server', userId, before, snapshot);
      return;
  }
}
