import { getSupabase } from './supabase';

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
 * TODO(contracts): `mike` does not report the cap. Checked, not assumed —
 * `MIKE_FREE_DAILY_CAP` appears exactly twice in the function, as the env read and as
 * the `daily_cap` argument to `consume_ai_query` at index.ts:237, and it is in no
 * response. So the denominator in "3 of 5 today" is a MIRROR of a server secret: change
 * `MIKE_FREE_DAILY_CAP` and this goes stale silently while the counter keeps claiming a
 * number nobody is enforcing.
 *
 * The expected field is `meta.daily_cap` (number). The moment it exists, delete this and
 * read it. It is written as a named, documented mirror rather than a bare `5` precisely
 * because a second undocumented copy of a server constant is the thing worth not having.
 *
 * One of the two failure directions is closed by the two floors below.
 */
export const ASSUMED_FREE_DAILY_CAP = 5;

/**
 * Two lower bounds on the real cap that the server does give us, used to correct the
 * mirror upward when it is too low.
 *
 * After a successful turn, `cap = used + remaining` and `used` is at least 1 — so
 * `remaining + 1` is a floor. From the counter row, `used` itself is a floor. Neither
 * can be wrong in the other direction, and neither costs a request.
 *
 * A cap that was LOWERED server-side is still invisible. Only `meta.daily_cap` fixes
 * that, which is why the TODO above is the real answer and this is a mitigation.
 */
export function capFromRemaining(previous: number | null, remaining: number): number {
  return Math.max(previous ?? ASSUMED_FREE_DAILY_CAP, remaining + 1);
}

export function capFromUsed(used: number): number {
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
  /** Already localised server-side from the user's `preferred_language`, English fallback. */
  name: string;
  category: string | null;
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
  /** Max 3. Always present on the wire; `[]` when there is nothing to show. */
  places: MikePlace[];
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
  | { ok: false; kind: 'quota'; isPremium: boolean }
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

/** Reads an error body once, tolerating both envelope shapes. */
async function readErrorBody(
  response: Response,
): Promise<{ code: string | null; isPremium: boolean }> {
  try {
    const body = (await response.json()) as {
      error?: unknown;
      code?: unknown;
      is_premium?: unknown;
    };
    /* `error` is ours; `code` is the Supabase gateway's. Reading both means one handler
       covers all three documented channels. */
    const code =
      typeof body.error === 'string'
        ? body.error
        : typeof body.code === 'string'
          ? body.code
          : null;
    return { code, isPremium: body.is_premium === true };
  } catch {
    return { code: null, isPremium: false };
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
  { code, isPremium }: { code: string | null; isPremium: boolean },
): AskPeteOutcome {
  switch (code) {
    case 'rate_limited':
      return { ok: false, kind: 'quota', isPremium };
    case 'account_required':
      return { ok: false, kind: 'account_required' };
    case 'invalid_request':
      return { ok: false, kind: 'invalid_request' };
    case 'unauthorized':
      return { ok: false, kind: 'auth' };
  }

  switch (status) {
    case 429:
      return { ok: false, kind: 'quota', isPremium };
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
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: typeof row.category === 'string' ? row.category : null,
  };
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
    const { data } = await getSupabase().auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export interface Quota {
  /** Questions already asked today. */
  used: number;
  /** The denominator. A mirror — see ASSUMED_FREE_DAILY_CAP. */
  cap: number;
  isPremium: boolean;
}

interface QuotaRow {
  ai_queries_today: number;
  ai_queries_reset_at: string;
  is_premium: boolean;
}

/**
 * Reads the daily counter.
 *
 * `mike` reports `remaining` only in the `meta` event at the end of a SUCCESSFUL turn.
 * Nothing arrives on a cold open, and nothing arrives when a turn fails — while the
 * allowance was already spent, before the OpenAI call. That gap is why the caller
 * re-reads this after every failure and not only on mount: otherwise the pill drifts
 * high, promising questions the server has already taken.
 *
 * There is no read-only quota endpoint, and calling `consume_ai_query` to find out would
 * spend an allowance to display it. So this reads the counter columns straight off
 * `public.users` — the same row the RPC writes, under the existing "users can read own
 * profile" policy.
 *
 * THE RESET BOUNDARY. `consume_ai_query` resets lazily, so the row still holds
 * yesterday's tally until the next call rolls it over, and the same rule has to be
 * applied here or the pill claims zero left to somebody whose day has already turned.
 * The rule it applies is the one the RPC applies: `ai_queries_reset_at < CURRENT_DATE`,
 * evaluated in the database's timezone, which no migration sets and which Supabase
 * defaults to UTC.
 *
 * That is NOT the Cyprus calendar day, and the difference is three hours every night.
 * The ruling is that the reset should follow Cyprus; the fix belongs in the RPC, not
 * here — a client applying a Cyprus-day rule to a server applying a UTC one would show
 * questions available that the server refuses. Raised as a backend defect. Until it
 * lands this mirrors the server, and NOTHING in the interface names an hour: the copy
 * says "back tomorrow", never a time and never a countdown.
 *
 * Returns null on any read failure; the caller keeps whatever it had rather than showing
 * a wrong number.
 */
export async function fetchQuota(userId: string): Promise<Quota | null> {
  const { data, error } = await getSupabase()
    .from('users')
    .select('ai_queries_today, ai_queries_reset_at, is_premium')
    .eq('id', userId)
    .maybeSingle<QuotaRow>();

  if (error || !data) {
    console.warn('[askPete] quota read failed:', error?.message ?? 'no row');
    return null;
  }

  if (data.is_premium) {
    return { used: 0, cap: ASSUMED_FREE_DAILY_CAP, isPremium: true };
  }

  const todayUtc = new Date().toISOString().slice(0, 10);
  const raw = data.ai_queries_reset_at < todayUtc ? 0 : data.ai_queries_today;
  const used = Math.max(0, raw);

  return { used, cap: capFromUsed(used), isPremium: false };
}

export interface HistoryMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  /** Epoch ms, from `ai_messages.created_at`. */
  at: number;
}

interface HistoryRow {
  id: number;
  role: string;
  content: string;
  created_at: string;
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
  const { data, error } = await getSupabase()
    .from('ai_messages')
    .select('id, role, content, created_at')
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
    }))
    .reverse();
}
