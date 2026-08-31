import { getSupabase } from './supabase';
import type { LanguageCode } from '../i18n/languages';

/**
 * Client for the `mike` edge function — Pete, the Cyprus assistant.
 *
 * The contract below was read from the deployed function's source
 * (`cyprusway-directus @ supabase/functions/mike/index.ts`) and its file header, which
 * is the only place all three of its error channels are written down. The deploy commit
 * `4e90661` verified that bundle against the live function per file by SHA-256; the one
 * commit since (`85f612d`) adds a `retrieval_state` column write and touches nothing on
 * the wire. The README is NOT the contract — its response examples predate `meta.places`
 * and its error examples are the pre-v31 prose shape.
 *
 * **Not yet verified against a live stream.** The transport was probed (CORS preflight,
 * and all three auth-failure shapes); the streaming half is built from the source and is
 * unverified until the first signed-in run. Nothing here should be described as confirmed
 * before that happens.
 *
 * REQUEST   POST {SUPABASE_URL}/functions/v1/mike
 *           Authorization: Bearer <user access token>
 *           { "message": string }        — and optionally { "place_id": number }
 *           Unknown keys are a 400. Never send a key speculatively.
 *
 * HISTORY   Not sent, ever. The function looks the thread up server-side from
 *           `ai_conversations` / `ai_messages` — one rolling conversation per person,
 *           UNIQUE (user_id), last MIKE_HISTORY_TURNS = 6 messages — and persists both
 *           turns itself. `fetchHistory` below READS that same record so the screen can
 *           show what Pete actually remembers. It is a view of the server's state, never
 *           an input to it, and it is shared with the phone.
 *
 * QUOTA     Since 2026-08-28 the server reports both halves of the counter and the
 *           client computes neither:
 *             `daily_cap`  the denominator, previously a mirror of a secret
 *             `quota_day`  the Cyprus calendar day the RPC counted against — the value
 *                          it wrote to users.ai_queries_reset_at, not a second
 *                          computation of the rule (migration 0047, decision-log 64)
 *           Both ride on `meta` AND on the 429, and both are **omitted rather than
 *           guessed** when the server does not know them. Absence therefore means
 *           unknown; it never means today, and it never means five.
 *
 * RESPONSE  200 text/event-stream. Every event is written by one helper,
 *           `data: ${JSON.stringify(payload)}\n\n`, and the stream ends `data: [DONE]`.
 *             {"type":"text","content":"<delta>"}          many
 *             {"type":"meta",...,"remaining":4,...}        exactly one, last
 *             {"type":"error","code":"stream_failed"}      replaces meta if OpenAI fails
 *           The error event arrives on a 200 — the status is sent before the model is
 *           called — so a mid-stream failure has to be carried out of the reader by hand.
 *
 * ERRORS    Three channels, and a client that reads only one is wrong:
 *             1. ours     {"error":"<snake_case>","detail":"<prose>"}
 *             2. stream   {"type":"error","code":"stream_failed"} on a 200
 *             3. gateway  {"code":"...","message":"..."} — NOT ours, no `error` key
 *           `verify_jwt` is true on the deployed function (probed 28 Aug 2026: a request
 *           with no Authorization header is refused by the gateway as
 *           UNAUTHORIZED_NO_AUTH_HEADER before `mike` runs), so channel 3 is what a
 *           browser sees for MOST auth failures. `toOutcome` reads both envelopes, then
 *           falls back to the status.
 *
 * COST      The allowance is consumed BEFORE the OpenAI call, so a timeout or a stream
 *           error still spends one of the five. Never retry automatically — that spends
 *           a second allowance on the same question. The refund is a known upstream gap.
 */

const MIKE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mike`;

/**
 * The denominator to show before the server has said one, and only until then.
 *
 * `meta.daily_cap` and the 429's `daily_cap` landed on 2026-08-28, so this is no longer
 * the expectation — it is the cold-open placeholder for the counter pill, replaced by the
 * real number on the first response of the session. It survives for exactly two cases:
 * the pill rendered before anyone has sent anything, and a deployment of `mike` old enough
 * not to send the field.
 *
 * It is deliberately still one named constant with this comment attached rather than a
 * bare `5` in a component, because a second undocumented copy of a server number is what
 * this whole exchange was about.
 */
export const ASSUMED_FREE_DAILY_CAP = 5;

/**
 * Two lower bounds on the real cap, kept as a GUARD rather than as the mechanism.
 *
 * `daily_cap` is the answer now. These still run underneath it, for the fallback path and
 * as a cheap contradiction check: after a successful turn `cap = used + remaining` and
 * `used` is at least 1, so `remaining + 1` is a floor; from the counter row, `used` itself
 * is a floor. If a `daily_cap` ever arrived below one of these it would be describing a
 * state that cannot exist, and taking the larger value is the safe reading.
 */
function capFromRemaining(previous: number | null, remaining: number): number {
  return Math.max(previous ?? ASSUMED_FREE_DAILY_CAP, remaining + 1);
}

function capFromUsed(used: number): number {
  return Math.max(ASSUMED_FREE_DAILY_CAP, used);
}

/** MIRROR of MIKE_HISTORY_TURNS. Counts MESSAGES, not turns: 6 is three exchanges, and
 *  it is exactly how much of the thread Pete can still see. */
export const HISTORY_WINDOW = 6;

/** Ask Pete v2.0 spec §9 puts a 500-char cap at the app layer. The function accepts 4000
 *  and 400s above it — deliberate slack, so this can be raised without a redeploy. */
export const MESSAGE_MAX_LENGTH = 500;

/** Contract cap on `meta.places`. The server caps too (MIKE_PLACE_REF_CAP); this is the
 *  layout's own guarantee. */
export const MAX_PLACE_REFS = 3;

/**
 * A verified place the SERVER put in front of the model — never a name parsed out of
 * Pete's prose. That distinction is the entire value of these chips: retrieval's own
 * write-up records Pete, ungrounded, inventing "Stin Yialo Tavern (listed in CyprusWay)"
 * against 181 real rows where no such place exists. A chip built from `meta.places`
 * cannot point at somewhere he made up.
 *
 * `slug` is `string | null` on the wire and a row without one is DROPPED rather than
 * rendered — a null would otherwise compose `/place/null`.
 */
export interface MikePlace {
  id: number;
  slug: string;
  /** Localised — server-side on a live turn, from `translations` when restored. */
  name: string;
}

/**
 * The `meta` event, narrowed to what this client consumes. It also carries `message_id`,
 * `model`, `input_tokens` and `output_tokens`, which exist for the server's cost analysis
 * and are deliberately not modelled: a type is a claim about what was validated, and
 * nothing here validates those.
 */
export interface MikeMeta {
  /** Allowance left AFTER this message. -1 means premium/unlimited. */
  remaining: number;
  isPremium: boolean;
  /** The real denominator. Null when the server did not send one — never defaulted. */
  dailyCap: number | null;
  /** The Cyprus day the count belongs to, YYYY-MM-DD. Null when unknown. */
  quotaDay: string | null;
  /** Max 3. Always present on the wire; `[]` when there is nothing to show. */
  places: MikePlace[];
}

/** What a 429 tells us about the allowance. Same two optional fields as `meta`. */
export interface LimitReport {
  isPremium: boolean;
  dailyCap: number | null;
  quotaDay: string | null;
}

/**
 * Why a kind and not a message: the function's error bodies name internal steps
 * ("History fetch failed", "Rate limit check failed"). Those belong in a log, never in
 * front of a visitor. The screen maps a kind to copy written for a reader.
 */
export type AskPeteFailureKind =
  | 'quota'
  | 'auth'
  | 'account_required'
  | 'invalid_request'
  | 'transport'
  | 'server'
  | 'stream'
  | 'aborted';

export type AskPeteOutcome =
  | { ok: true }
  | { ok: false; kind: 'quota'; limit: LimitReport }
  | { ok: false; kind: Exclude<AskPeteFailureKind, 'quota'> };

/**
 * Did the server reject this turn BEFORE it wrote anything to `ai_messages`?
 *
 * The ordering it encodes is ruled, not incidental: auth -> guest gate -> key validation
 * -> place fetch -> consume_ai_query -> OpenAI -> persist. Everything that fails at or
 * before the quota gate leaves no row.
 *
 * The screen uses this to decide whether the question on screen is something Pete can
 * see. When it is not, the message is retracted from the thread and put back in the
 * composer — a question left visible that the server has no record of is what makes Pete
 * look like he ignored it.
 *
 * `transport` and `server` are deliberately NOT in the true list: the request may have
 * arrived and failed afterwards, and a 500 means the history fetch or the persistence
 * itself broke. Where the client cannot know, it keeps the message. Over-claiming in
 * either direction is worse than the ambiguity.
 */
export function rejectedBeforeRecording(kind: AskPeteFailureKind): boolean {
  return (
    kind === 'quota' ||
    kind === 'auth' ||
    kind === 'account_required' ||
    kind === 'invalid_request'
  );
}

/** A `daily_cap` that is actually a usable number, or null. Never a default. */
function readCap(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

/** A `quota_day` that is actually a date, or null. Never today. */
function readDay(value: unknown): string | null {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

/** Reads an error body once, tolerating both envelope shapes. */
async function readErrorBody(
  response: Response,
): Promise<{ code: string | null; limit: LimitReport }> {
  try {
    const body = (await response.json()) as Record<string, unknown>;
    /* `error` is ours; `code` is the Supabase gateway's. Reading both means one handler
       covers all three documented channels. */
    const code =
      typeof body.error === 'string'
        ? body.error
        : typeof body.code === 'string'
          ? body.code
          : null;
    return {
      code,
      limit: {
        isPremium: body.is_premium === true,
        /* The 429 carries these too, which is what makes the limit state certain without
           a successful turn to learn them from. */
        dailyCap: readCap(body.daily_cap),
        quotaDay: readDay(body.quota_day),
      },
    };
  } catch {
    return { code: null, limit: { isPremium: false, dailyCap: null, quotaDay: null } };
  }
}

/**
 * Typed code first, status second. The codes exist so clients stop string-matching
 * English prose that breaks across five launch languages; the status is the backstop for
 * the gateway's own errors and for any code this build has not been taught.
 *
 * `place_not_found` is not mapped: this client never sends `place_id`. If that changes,
 * it needs a kind and copy of its own rather than falling into `server`.
 */
function toOutcome(
  status: number,
  { code, limit }: { code: string | null; limit: LimitReport },
): AskPeteOutcome {
  switch (code) {
    case 'rate_limited':
      return { ok: false, kind: 'quota', limit };
    case 'account_required':
      return { ok: false, kind: 'account_required' };
    case 'invalid_request':
      return { ok: false, kind: 'invalid_request' };
    case 'unauthorized':
      return { ok: false, kind: 'auth' };
  }

  switch (status) {
    case 429:
      return { ok: false, kind: 'quota', limit };
    case 403:
      return { ok: false, kind: 'account_required' };
    case 400:
      return { ok: false, kind: 'invalid_request' };
    case 401:
      return { ok: false, kind: 'auth' };
    default:
      /* 405 method_not_allowed and 500 upstream land here, correctly: both mean "the
         server, not you", which is what the `server` copy says. */
      return { ok: false, kind: 'server' };
  }
}

/** Validates one `places` entry. A malformed row is dropped, never rendered. */
function toPlace(raw: unknown): MikePlace | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== 'number' || !Number.isInteger(row.id)) return null;
  if (typeof row.slug !== 'string' || !row.slug) return null;
  if (typeof row.name !== 'string' || !row.name) return null;
  /* `category` is on the wire and is deliberately not modelled: the chip is a pin and a
     name, nothing renders it, and a restored chip could not supply it consistently. */
  return { id: row.id, slug: row.slug, name: row.name };
}

/**
 * Builds a meta event from parsed JSON, or null if the one load-bearing field is absent.
 * Deliberately not a cast: `remaining` drives the counter, and a cast would happily let
 * `undefined` render as "undefined of 5".
 */
function toMeta(raw: Record<string, unknown>): MikeMeta | null {
  if (typeof raw.remaining !== 'number') return null;
  const places = Array.isArray(raw.places)
    ? raw.places.map(toPlace).filter((place): place is MikePlace => place !== null)
    : [];
  return {
    remaining: raw.remaining,
    isPremium: raw.is_premium === true,
    /* Validated, not cast, and null rather than defaulted. The server omits either field
       when it does not know it, and inventing a value here would be re-introducing the
       guess these two fields exist to remove. */
    dailyCap: readCap(raw.daily_cap),
    quotaDay: readDay(raw.quota_day),
    places: places.slice(0, MAX_PLACE_REFS),
  };
}

/**
 * Parse one SSE event block into its joined `data:` payload, or null.
 *
 * Written properly rather than ported. The app's reader treats an event as a single line
 * and never flushes its trailing buffer, and its own header records both as fragilities
 * that would delete answer text SILENTLY if `mike`'s output ever grew an `event:` field
 * or a multi-line `data:`. Neither is a bug against today's output — the function writes
 * one `data:` line per event — but this is a new client with no legacy, so it gets the
 * correct parser now: every `data:` line in the block is collected and joined with a
 * newline, per the EventSource spec, and everything else (`event:`, `id:`, `retry:`,
 * comment lines beginning `:`) is ignored rather than swallowing the event whole.
 */
function eventPayload(block: string): string | null {
  const lines = block.split('\n');
  const data: string[] = [];
  for (const line of lines) {
    if (!line.startsWith('data:')) continue;
    /* Exactly one optional leading space is part of the field value's framing. */
    const value = line.slice(5);
    data.push(value.startsWith(' ') ? value.slice(1) : value);
  }
  return data.length > 0 ? data.join('\n') : null;
}

interface StreamArgs {
  message: string;
  accessToken: string;
  signal?: AbortSignal | undefined;
  onDelta: (delta: string) => void;
  onMeta: (meta: MikeMeta) => void;
}

/**
 * Sends one message and drives the SSE stream to completion.
 *
 * Native `fetch`, and that is the whole mechanism — the app injects `expo/fetch` because
 * React Native's `fetch` is an XHR polyfill whose `response.body` is null, so its stream
 * could only be read once finished. A browser gives a real ReadableStream, so there is no
 * `fetchImpl` seam to build here.
 *
 * Resolves only when the stream closes. Deltas arrive through `onDelta` as they land;
 * `onMeta` fires once, near the end.
 */
export async function streamAskPete({
  message,
  accessToken,
  signal,
  onDelta,
  onMeta,
}: StreamArgs): Promise<AskPeteOutcome> {
  let response: Response;

  try {
    response = await fetch(MIKE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      /* Strict request shape: unknown keys are a 400, so the body carries `message` and
         nothing else. This client sends no `place_id`. */
      body: JSON.stringify({ message }),
      ...(signal ? { signal } : {}),
    });
  } catch (error) {
    if (signal?.aborted) return { ok: false, kind: 'aborted' };
    console.warn('[askPete] request failed:', error);
    return { ok: false, kind: 'transport' };
  }

  /* Every rejection is JSON, never SSE — the body has to be read as JSON before anything
     treats it as a stream. */
  if (!response.ok) {
    const outcome = toOutcome(response.status, await readErrorBody(response));
    if (!outcome.ok && outcome.kind === 'server') {
      console.warn('[askPete] mike returned', response.status);
    }
    return outcome;
  }

  if (!response.body) {
    console.warn('[askPete] 200 with no stream body');
    return { ok: false, kind: 'stream' };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  /* Set by a {"type":"error"} event, which arrives on a 200 after the headers are
     already gone — so the failure has to be carried out of the loop by hand. */
  let streamFailed = false;

  function consume(block: string): void {
    const payload = eventPayload(block)?.trim();
    if (!payload || payload === '[DONE]') return;

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(payload) as Record<string, unknown>;
    } catch {
      return; /* a malformed event is not worth failing the whole turn */
    }

    if (parsed.type === 'text' && typeof parsed.content === 'string') {
      onDelta(parsed.content);
    } else if (parsed.type === 'meta') {
      const meta = toMeta(parsed);
      if (meta) onMeta(meta);
    } else if (parsed.type === 'error') {
      streamFailed = true;
    }
  }

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      /* Events are separated by a blank line. `\r\n\r\n` is legal SSE framing too; the
         normalisation costs nothing and removes a whole class of "why is nothing
         rendering" that only appears behind some proxies. */
      buffer = buffer.replace(/\r\n/g, '\n');
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() ?? '';
      for (const block of blocks) consume(block);
    }

    /* Flush. `[DONE]` is the last thing written and the writer closes immediately after,
       so a final event arriving without its blank-line terminator is exactly the shape at
       risk — and discarding it would drop the `meta` event, i.e. the quota and the place
       chips, silently. */
    buffer += decoder.decode();
    if (buffer.trim()) consume(buffer);
  } catch (error) {
    if (signal?.aborted) return { ok: false, kind: 'aborted' };
    console.warn('[askPete] stream read failed:', error);
    return { ok: false, kind: 'stream' };
  }

  return streamFailed ? { ok: false, kind: 'stream' } : { ok: true };
}

/**
 * The access token for the current session, or null.
 *
 * Read at send time rather than held in context: `getSession()` refreshes an expired
 * token, and a screen that captured the token on mount would send a stale one after a
 * long read of the thread.
 */
export async function currentAccessToken(): Promise<string | null> {
  try {
    const { data } = await (await getSupabase()).auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export interface Quota {
  /** Questions already asked on the day `day` names. */
  used: number;
  cap: number;
  isPremium: boolean;
  /** The Cyprus calendar day this count belongs to, YYYY-MM-DD, or null if unknown. */
  day: string | null;
  /**
   * Whether `used` is known to be TODAY's count.
   *
   * False on a cold open: the row says which day it counted, and nothing on the wire has
   * yet said which day it is now. See `fetchQuota`. An uncertain count locks nothing AND
   * prints nothing — the pill shows the cap alone until a turn or a refusal names the
   * day. Until 30 Aug 2026 it locked nothing but printed the number anyway, which showed
   * yesterday's count as today's on every first visit of a day.
   */
  certain: boolean;
}

interface QuotaRow {
  ai_queries_today: number;
  ai_queries_reset_at: string;
  is_premium: boolean;
}

/** Apply a report from `meta` or from a 429 to whatever the pill was showing. */
export function applyLimit(
  previous: Quota | null,
  report: { remaining: number; isPremium: boolean; dailyCap: number | null; quotaDay: string | null },
): Quota {
  if (report.isPremium) {
    return {
      used: 0,
      cap: report.dailyCap ?? previous?.cap ?? ASSUMED_FREE_DAILY_CAP,
      isPremium: true,
      day: report.quotaDay,
      certain: true,
    };
  }

  /* `daily_cap` is the answer; the floor under it is a guard against a value that would
     describe an impossible state, not a second opinion. */
  const cap = capFromRemaining(
    report.dailyCap ?? previous?.cap ?? null,
    report.remaining,
  );

  return {
    used: Math.max(0, cap - report.remaining),
    cap,
    isPremium: false,
    day: report.quotaDay,
    /* The count came back with the turn, so it is this moment's count whether or not the
       server told us which day that is. */
    certain: true,
  };
}

/**
 * Reads the daily counter on a cold open.
 *
 * `mike` reports the allowance only at the end of a turn, so nothing arrives before the
 * first message and nothing arrives when a turn fails — while the allowance was already
 * spent, before the OpenAI call. That gap is why the caller re-reads this after every
 * failure and not only on mount.
 *
 * There is no read-only quota endpoint, and calling `consume_ai_query` to find out would
 * spend an allowance to display it. So this reads the counter columns straight off
 * `public.users` — the same row the RPC writes, under the existing "users can read own
 * profile" policy.
 *
 * **THE DAY IS NOT COMPUTED HERE, AND THAT IS THE POINT.** Migration 0047 moved both
 * limiters to the Cyprus calendar day, `(now() AT TIME ZONE 'Asia/Nicosia')::date`, and
 * `ai_queries_reset_at` now holds the Cyprus day a count belongs to. The RPC resets
 * lazily, so a row can still hold yesterday's tally — but working out whether it has gone
 * stale needs today's date *in Cyprus*, and a client deriving that is the second copy of
 * the rule that decision-log entry 64 lists as the first item in the blast radius. The
 * previous version of this function did exactly that, in UTC, and would have told a Cyprus
 * user they had nothing left every night between midnight and 03:00.
 *
 * So: the day comes off the wire or not at all. `serverDay` is the last `quota_day` seen
 * this session. With it, a row from an earlier day is known to be spent and the count
 * reads zero. Without it the count is reported as-is and `certain` is false — and the
 * caller must not lock the composer on an uncertain count, because the server is the
 * authority, a refusal costs nothing, and a 429 carries the day that settles it.
 *
 * Returns null on any read failure; the caller keeps whatever it had rather than showing
 * a wrong number.
 */
export async function fetchQuota(
  userId: string,
  serverDay: string | null = null,
): Promise<Quota | null> {
  const { data, error } = await (await getSupabase())
    .from('users')
    .select('ai_queries_today, ai_queries_reset_at, is_premium')
    .eq('id', userId)
    .maybeSingle<QuotaRow>();

  if (error || !data) {
    console.warn('[askPete] quota read failed:', error?.message ?? 'no row');
    return null;
  }

  const day = readDay(data.ai_queries_reset_at);

  if (data.is_premium) {
    return { used: 0, cap: ASSUMED_FREE_DAILY_CAP, isPremium: true, day, certain: true };
  }

  const rolledOver = serverDay != null && day != null && day < serverDay;
  const used = rolledOver ? 0 : Math.max(0, data.ai_queries_today);

  return {
    used,
    /* No `daily_cap` on this path — it rides on `mike`'s responses, and this is
       PostgREST. The placeholder stands until the first turn of the session, corrected
       upward if the row already shows more used than it allows for. */
    cap: capFromUsed(used),
    isPremium: false,
    day,
    certain: serverDay != null,
  };
}

export interface HistoryMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  /** Epoch ms, from `ai_messages.created_at`. */
  at: number;
  /**
   * The places the server put in front of the model for this turn, from
   * `ai_messages.retrieved_place_ids` (migration 0027).
   *
   * Empty means retrieval ran and matched nothing, or did not run — the two are
   * distinguished by `retrieval_state` (0042), which this client does not need. Sliced to
   * MAX_PLACE_REFS because the column persists every injected row (5) while the chip
   * contract shows the nearest 3, and `match_places_pete` orders by ascending distance.
   */
  placeIds: number[];
}

interface HistoryRow {
  id: number;
  role: string;
  content: string;
  created_at: string;
  retrieved_place_ids: number[] | null;
}

/**
 * The last HISTORY_WINDOW messages of the visitor's rolling conversation — exactly the
 * rows `mike` will feed the model on the next turn.
 *
 * Why read it at all: the function keeps ONE conversation per person, forever, shared
 * with the phone. Without this the web would open empty, greet somebody who asked three
 * questions this morning as though they had never been here, and then answer out of a
 * conversation they cannot see. Reading the same window the server reads makes the
 * thread a VIEW of Pete's memory instead of a separate, poorer, silently diverging copy.
 *
 * Ordering is `created_at DESC, id DESC`, then reversed. The id tiebreak is not
 * decoration: `mike` inserts the question and the answer together after the stream
 * completes and Postgres `now()` is transaction-time, so both rows can carry an
 * identical `created_at` — which would let an answer sort above the question it answers.
 * `id` is the identity sequence, so insertion order is conversation order.
 *
 * Returns null on failure; the caller then starts empty rather than asserting an empty
 * history it never confirmed. That distinction decides whether the greeting renders.
 */
export async function fetchHistory(userId: string): Promise<HistoryMessage[] | null> {
  const { data, error } = await (await getSupabase())
    .from('ai_messages')
    .select('id, role, content, created_at, retrieved_place_ids')
    .eq('user_id', userId)
    /* The CHECK on `role` also allows 'system'. `mike` writes only the two, but a system
       row must never be rendered as either speaker if one ever appears. */
    .in('role', ['user', 'assistant'])
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(HISTORY_WINDOW)
    .returns<HistoryRow[]>();

  if (error || !data) {
    console.warn('[askPete] history read failed:', error?.message ?? 'no rows');
    return null;
  }

  return data
    .map((row) => ({
      id: row.id,
      role: row.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: row.content,
      at: Date.parse(row.created_at),
      placeIds: toPlaceIds(row.retrieved_place_ids),
    }))
    .reverse();
}

/**
 * The persisted ids for one restored turn, normalised.
 *
 * A pure function with its own name because `retrieved_place_ids` has THREE meanings and
 * two of them are not arrays (0027, and 0042's `retrieval_state` which splits them):
 *
 *   `[1, 2]`  retrieval ran and injected these
 *   `[]`      retrieval ran and matched nothing
 *   `null`    retrieval did not run, OR was attempted and FAILED
 *
 * All three produce no chips, and none of them may throw. `failed` is the one that means
 * the feature did not work — it is not distinguishable here, and deliberately so: see
 * docs/PARKED.md, the client is the wrong place to report it.
 *
 * Sliced to MAX_PLACE_REFS because the column persists every injected row (5) while the
 * chip contract shows the nearest 3, and `match_places_pete` orders by ascending distance.
 */
export function toPlaceIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((id): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0)
    .slice(0, MAX_PLACE_REFS);
}

/**
 * Resolve persisted place ids back into chips.
 *
 * Why this exists: `meta.places` arrives once, with the turn, and the previous version of
 * this screen kept it only in memory — so **every chip vanished on reload**, while the
 * server had persisted exactly which places it injected. An answer that named Konnos Bay
 * and linked to it before a refresh, and did not after, is indistinguishable from
 * retrieval never having run. That ambiguity is the whole reason this is here.
 *
 * A targeted read, not the catalogue: at most `HISTORY_WINDOW / 2 * MAX_PLACE_REFS` ids,
 * so nine rows rather than 181. `places_sync` is public-readable, which is what Explore
 * already relies on.
 *
 * A place that has since been unpublished simply produces no chip — the same steady state
 * the saved-places rail documents, not a failure.
 */
export async function fetchPlaceRefs(
  ids: readonly number[],
  lang: LanguageCode,
): Promise<Map<number, MikePlace>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();

  const { data, error } = await (await getSupabase())
    .from('places_sync')
    .select(`id, slug, name:translations->${lang}->>name, fallback:translations->en->>name`)
    .eq('status', 'published')
    .in('id', unique)
    .returns<{ id: number; slug: string | null; name: string | null; fallback: string | null }[]>();

  if (error || !data) {
    console.warn('[askPete] place refs read failed:', error?.message ?? 'no rows');
    return new Map();
  }

  const out = new Map<number, MikePlace>();
  for (const row of data) {
    const name = row.name ?? row.fallback;
    /* Same rule as a live chip: no slug, no chip. A null would compose /place/null. */
    if (row.slug && name) out.set(row.id, { id: row.id, slug: row.slug, name });
  }
  return out;
}

/**
 * Delete this account's whole Ask Pete thread — `clear_ai_conversation()`, migration
 * 0051, deployed 31 Aug 2026.
 *
 * **Any 2xx is success.** The RPC returns two success shapes and they mean different
 * things to a human but nothing to this client:
 *
 *   {"cleared": true,  "messages_deleted": 12}   a thread existed and is gone
 *   {"cleared": false, "messages_deleted": 0}    there was nothing to clear
 *
 * Both leave the account with no thread, which is the state the caller is asking for,
 * so both resolve. `messages_deleted` is read off the wire and deliberately dropped:
 * the migration's own header calls it informational and says no client behaviour may
 * branch on it, and it can legitimately skew by up to 2 against a concurrently
 * committing turn (READ COMMITTED). A count that is allowed to be wrong must never
 * reach a sentence a user reads.
 *
 * Failure is any non-2xx, which supabase-js hands back as `error`: 401 `42501` when the
 * session has expired (the function is granted to `authenticated` only — verified live
 * against the deployed function with a bare anon key, 31 Aug), or transport/5xx. This
 * throws on all of them, so the one call site has exactly one branch.
 *
 * **Takes no argument, and must not be given one.** The function has zero parameters,
 * and PostgREST resolves overloads by argument name — `rpc(name, { anything })` is a
 * **404**, not an error naming the problem. Measured 31 Aug. `rpc(name)` sends `{}`,
 * which is correct.
 */
export async function clearConversation(): Promise<void> {
  const { error } = await (await getSupabase()).rpc('clear_ai_conversation');
  if (error) throw new Error(`clear_ai_conversation failed: ${error.message}`);
}
