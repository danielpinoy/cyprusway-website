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
 * own and the platform's per-request wall clock (150 s on the Supabase Free plan).
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
 * Four reads over fifteen seconds close that window. They are indexed reads of the
 * caller's own rows under RLS, so the cost is negligible and the alternative is a false
 * statement produced by timing.
 */
const RECOVERY_SCHEDULE_MS: readonly number[] = [0, 3_000, 8_000, 15_000];

/** After this long the waiting copy changes. Past the median, well short of the bound. */
export const GENERATE_SLOW_AFTER_MS = 45_000;

/** `interest_tags` takes 1–5 slugs; a sixth is a 400 (probed). */
export const MAX_INTEREST_TAGS = 5;

/**
 * `TRIP_GENERATE_DAILY_CAP`, the server's env var, defaulting to 3 at `index.ts:2345`.
 *
 * A client cannot read it — `consume_trip_generation` is `service_role` only — so this is
 * a documented default and nothing more. The real number rides the 429, and the moment one
 * arrives it replaces this for the rest of the session.
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
 * One per ending, because they need different things from the reader — and because three
 * of them cost a generation and four do not, which is the distinction the copy turns on.
 *
 * | kind | counted? | why |
 * |---|---|---|
 * | `premium`    | no  | 403, and the gate precedes the counter |
 * | `account`    | no  | 403, anonymous session — unreachable on this site |
 * | `quota`      | no  | 429; migration 0047 rejects without incrementing |
 * | `invalid`    | no  | 400, before auth. A defect on this side — everything is pre-validated |
 * | `auth`       | no  | 401 |
 * | `generation` | **yes** | 422 after the model ran. Retry is legitimate |
 * | `server`     | **yes** | 5xx, or a 200 whose id could not be resolved |
 * | `slow`       | **probably** | our own 120 s abort; the server may still be working |
 * | `offline`    | no  | `fetch` threw before any response, and the re-query found nothing |
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

/** Whether this ending spent one of the day's allowance. `slow` is deliberately absent —
 *  it is "probably", and its copy says so rather than asserting either way. */
const COUNTED: ReadonlySet<GenerationFailure> = new Set<GenerationFailure>([
  'generation',
  'server',
]);

export function failureCounted(kind: GenerationFailure): boolean {
  return COUNTED.has(kind);
}

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
      /** Set when the recovery re-query found a row written by this attempt. */
      recoveredTripId?: string;
      /** Re-read after the attempt. Certain whenever the attempt consumed. */
      quota: QuotaReport | null;
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
 * The last Cyprus day the server named, this session.
 *
 * Set from a 429's `quota_day`, and from the counter row after any response that consumed
 * — because `consume_trip_generation` writes `trip_generations_reset_at = v_day` on every
 * branch it takes, so a row re-read straight after a consuming call carries the server's
 * own today. That is the only way this client ever learns the date, and it never computes
 * one.
 */
let serverDay: string | null = null;

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
 * `assumeToday` is set by the caller in exactly one situation: the row was re-read
 * immediately after a response that consumed. `consume_trip_generation` writes today's
 * Cyprus day on every branch, so at that moment the row's own `reset_at` **is** the
 * server's today — no derivation, no guess, and the count becomes exact.
 */
export function quotaFromProfile(
  profile: PlannerProfile,
  options: { assumeToday?: boolean } = {},
): QuotaReport {
  const used = profile.generationsToday ?? 0;
  const rowDay = parseDay(profile.generationsResetAt);

  if (options.assumeToday && rowDay) {
    serverDay = rowDay;
  }

  const cap = capFor(used);
  const day = serverDay ?? rowDay;

  if (serverDay == null) {
    /* No day from the server yet. The count is a floor, not a fact — the lazy reset may
       not have run — so it is reported uncertain and the caller must not lock anything on
       it. A refusal costs nothing and the 429 carries the day that settles it. */
    return { remaining: Math.max(0, cap - used), cap, day, certain: false };
  }

  /* A stored day older than the server's today means the count is spent and the reset has
     simply not run yet: the full cap is available. */
  const stale = rowDay != null && rowDay < serverDay;
  return {
    remaining: stale ? cap : Math.max(0, cap - used),
    cap,
    day: serverDay,
    certain: true,
  };
}

/** The day after the one a count belongs to — when the next allowance appears, Cyprus
 *  time. Plain date arithmetic on a date the server gave us; no timezone is derived. */
export function dayAfter(day: string): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return next.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// The row, before and after
// ---------------------------------------------------------------------------

interface ItineraryStamp {
  id: string;
  created_at: string;
}

/** Newest trip this account owns. RLS scopes it; no user filter is needed and none is
 *  added, matching `lib/trips.ts`. */
async function latestItinerary(): Promise<ItineraryStamp | null> {
  try {
    const { data, error } = await getSupabase()
      .from('itineraries')
      .select('id, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .returns<ItineraryStamp[]>();
    if (error) {
      console.warn('[planner] itineraries snapshot failed:', error.message);
      return null;
    }
    return data?.[0] ?? null;
  } catch (error) {
    console.warn('[planner] itineraries snapshot threw:', error);
    return null;
  }
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Look for a row written by this attempt — repeatedly, because the interesting case is a
 * client that gave up while the server was still writing.
 *
 * `poll: false` for an ending the server has already answered (a 5xx): nothing is in
 * flight, so one read is the whole answer.
 */
async function findRecoveredTrip(
  before: ItineraryStamp | null,
  poll: boolean,
): Promise<string | null> {
  const schedule = poll ? RECOVERY_SCHEDULE_MS : [0];
  for (const delay of schedule) {
    if (delay > 0) await wait(delay);
    const fresh = await latestItinerary();
    if (fresh && (!before || fresh.created_at > before.created_at)) return fresh.id;
  }
  return null;
}

// ---------------------------------------------------------------------------
// The request
// ---------------------------------------------------------------------------

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

/** Re-read the counter after an attempt. `consumed` says whether the RPC ran, which is
 *  what makes the number exact rather than a floor. */
async function quotaAfter(
  userId: string,
  consumed: boolean,
): Promise<QuotaReport | null> {
  const profile = await fetchPlannerProfile(userId);
  if (profile.access === 'unknown') return null;
  return quotaFromProfile(profile, { assumeToday: consumed });
}

async function fail(
  kind: GenerationFailure,
  userId: string,
  recoveredTripId?: string,
): Promise<void> {
  const quota = await quotaAfter(userId, failureCounted(kind) || kind === 'slow');
  setState(
    recoveredTripId
      ? { phase: 'error', kind, recoveredTripId, quota }
      : { phase: 'error', kind, quota },
  );
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
    setState({ phase: 'error', kind: 'invalid', quota: null });
    return;
  }

  setState({ phase: 'running', startedAt: Date.now() });

  const token = await currentAccessToken();
  if (!token) {
    await fail('auth', userId);
    return;
  }

  /* Snapshot before the request. Every ambiguous ending is resolved against this: a row
     newer than it means the generation happened and was paid for, whatever the wire said
     or failed to say. */
  const before = await latestItinerary();

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
    /* The two are not the same ending and the app conflates them. Our own abort means the
       server had 120 seconds and may still be working — the allowance is gone and a retry
       would spend a second one. A `fetch` that threw on its own never reached the server,
       so nothing was spent and a retry is safe — but only after looking, because "never
       reached the server" is an assumption until the re-query agrees. */
    const timedOut = controller.signal.aborted;
    const recovered = await findRecoveredTrip(before, timedOut);
    if (recovered) {
      await fail(timedOut ? 'slow' : 'offline', userId, recovered);
      return;
    }
    if (!timedOut) console.warn('[planner] transport failure:', error);
    await fail(timedOut ? 'slow' : 'offline', userId);
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
    const recovered = await findRecoveredTrip(before, false);
    if (recovered) {
      setState({ phase: 'success', tripId: recovered });
      return;
    }
    console.warn('[planner] 200 with no resolvable itinerary id');
    await fail('server', userId);
    return;
  }

  const { code, detail } = readError(payload);
  console.warn(`[planner] HTTP ${response.status}: ${code ?? 'no-code'}`, detail ?? '');

  switch (response.status) {
    case 400:
      /* Every rule this endpoint enforces is pre-validated in the wizard, so a 400 is a
         defect on this side rather than something the reader did. Logged as one. */
      console.error('[planner] request refused by validation — client defect:', detail);
      await fail('invalid', userId);
      return;
    case 401:
      await fail('auth', userId);
      return;
    case 403:
      /* Told apart by `error`, which is what the two codes exist for (entry 5).
         `account_required` needs an anonymous session and this site creates none. */
      await fail(code === 'account_required' ? 'account' : 'premium', userId);
      return;
    case 429: {
      const record = (payload ?? {}) as Record<string, unknown>;
      const day = parseDay(record.quota_day);
      if (day) serverDay = day;
      if (typeof record.daily_cap === 'number' && record.daily_cap > 0) {
        knownCap = record.daily_cap;
      }
      const remaining = typeof record.remaining === 'number' ? record.remaining : 0;
      /* Authoritative, all three of them, and nothing was consumed — 0047 rejects an
         over-cap call without incrementing. */
      setState({
        phase: 'error',
        kind: 'quota',
        quota: {
          remaining,
          cap: knownCap ?? TRIP_GENERATION_DAILY_CAP,
          day,
          certain: day != null,
        },
      });
      return;
    }
    case 422:
      /* After the model ran, and after `:1567`. The attempt counted; the copy says so. */
      await fail('generation', userId);
      return;
    default: {
      /* 500 and 502. A 5xx can land after the row was persisted — `persist failed` is the
         ambiguous one — so look before saying anything. One read: the server has already
         answered, so nothing is in flight. */
      const recovered = await findRecoveredTrip(before, false);
      await fail('server', userId, recovered ?? undefined);
      return;
    }
  }
}
