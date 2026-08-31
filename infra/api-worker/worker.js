/**
 * api.cyprusway.eu — the Cloudflare Worker in front of the Book with Pete resolver.
 *
 * Why a Worker and not a proxied CNAME: Supabase is itself behind Cloudflare, and a
 * proxied CNAME across customer zones returns error 1014 (CNAME Cross-User Banned) —
 * measured 31 Aug 2026 on api.cyprusway.eu → knvjmsnwzskbageetbam.supabase.co, and
 * recorded in cyprusway-directus/docs/RESOLVER_RATE_LIMIT_SCOPE.md (addendum, 1 Sep).
 * A Worker's fetch() is not subject to that restriction. Same shape as
 * infra/cdn-worker (cdn.cyprusway.eu), which is the reference for the Cache API use.
 *
 * What this Worker is FOR (the scope doc's finding): the resolver cannot be hurt —
 * its lookup is a 0.173 ms index scan — but the BILL can be: every call is a metered
 * Supabase invocation and the free allowance is ~0.19 req/s sustained. So the
 * controls here must cost nothing per request and bound origin invocations:
 *
 *   1. SCOPE    — exactly one path, POST only. Everything else answers here and
 *                 never contacts origin. The analogue of the CDN Worker's ASSET_PATH.
 *   2. PREFLIGHT— OPTIONS answered at the edge. A browser preflights every
 *                 cross-origin JSON POST; forwarding it would DOUBLE the billed
 *                 invocations for all web traffic.
 *   3. LIMIT    — the Workers rate-limiting binding (GA since 2025-09-19), ~30
 *                 POSTs / 60 s per IP. Counting is PER CLOUDFLARE LOCATION, not
 *                 global — fine for the threat model (one dumb loop hits one colo;
 *                 a hotel NAT also shares one colo bucket, which is why the number
 *                 is generous: ~2× the heaviest realistic compare-everything
 *                 session). The zone rate-limiting rule (10/10s per IP, dashboard,
 *                 log-only first week) runs BEFORE this Worker and is what protects
 *                 the Worker's own request quota; this binding protects the origin
 *                 and is the finer per-IP control.
 *   4. CACHE    — only 84 valid selections exist and routes change only when a
 *                 human edits them, so responses are cached under a canonical
 *                 synthetic GET key for 5 minutes. This is the one control that
 *                 bounds the Supabase bill INDEPENDENTLY of attack volume, and it
 *                 turns the resolver's ~0.45 s into an edge hit. The Cache API is
 *                 per-colo (same trade the CDN Worker records).
 *
 * The request contract, read from the resolver source (index.ts @ main, 1 Sep 2026):
 * fields booking_type, accommodation_type, hotel_preference, activity_category,
 * region, locale — all strings, body-only resolution (no header, no geo, no auth is
 * ever read), `locale` validated then discarded. Responses: 200 for the three
 * outcomes (ready | reduced_filters | unavailable), 400 invalid_request,
 * 405 method_not_allowed, 500 upstream; NO Cache-Control on any of them, which is
 * why TTL is set explicitly at store time.
 *
 * Two DELIBERATE divergences from the origin, recorded so nobody files them as bugs:
 *   - Unknown body fields are a 400 HERE while the origin silently ignores them.
 *     The cache key must cover every field that could vary a response; an ignored
 *     unknown field would fragment the key space for nothing. Shape-check only —
 *     values are NOT checked against the vocabularies (that would drift when a
 *     region or category is added; the origin stays the authority on values, and
 *     its 400s pass through uncached).
 *   - CORS is scoped to the site origins, not the origin's `*`. This is a
 *     first-party API, not public images. The native app sends no Origin header
 *     and is unaffected. Stored cache entries carry NO CORS headers; they are
 *     applied per-request on the way out.
 *
 * Auth headers (authorization, apikey) are STRIPPED before forwarding — the
 * resolver reads neither, and a forwarding Worker that passes credentials through
 * is a general-purpose proxy in the one dimension the path allowlist doesn't cover.
 *
 * THE REVERT MATRIX (same pattern as the CDN Worker):
 * - Cache or limiter misbehaves: set PASSTHROUGH to "1" in the dashboard. The
 *   Worker becomes a scoped plain proxy — no cache, no binding check, same scope
 *   and CORS. (A later `wrangler deploy` re-applies this file's vars; re-flip it.)
 * - Worker dead entirely: clients fall back to the *.supabase.co URL, which stays
 *   reachable (and unprotected — the scope doc's standing caveat, unchanged).
 *
 * Observability: every response carries `x-cw-api`:
 *   HIT | MISS | PASS (non-200 from origin, never cached) | BYPASS (passthrough)
 *   | LIMIT (refused by the binding). Zone-rule blocks happen BEFORE this Worker
 *   and therefore carry no x-cw-api header — that absence is itself the signal
 *   that the WAF, not this code, answered.
 *
 * Deploy: npx wrangler deploy --config infra/api-worker/wrangler.jsonc
 */

const ORIGIN = 'https://knvjmsnwzskbageetbam.supabase.co';
const RESOLVER_PATH = '/functions/v1/book-with-pete-route';

/* The site origins allowed to call this from a browser. The legacy site and the
   React phases both serve from the apex and www. Add a preview origin here the
   day one exists; localhost is deliberately absent from production config. */
const ALLOWED_ORIGINS = new Set(['https://cyprusway.eu', 'https://www.cyprusway.eu']);

/* Measured typical request body is 122 bytes; 2 KB is generous slack, and anything
   larger is not a booking selection. Checked against Content-Length first (cheap
   refusal before the body is read), then against the actual bytes. */
const MAX_BODY_BYTES = 2048;
const MAX_FIELD_CHARS = 64;

/* Field order IS the canonical cache-key order. Every field the resolver reads,
   none it doesn't. `locale` is included even though the origin discards it after
   validation: excluding it would serve a cached 200 to a body the origin would
   400 (invalid locale), and cached-vs-uncached behaviour must not diverge. */
const KNOWN_FIELDS = [
  'booking_type',
  'accommodation_type',
  'hotel_preference',
  'activity_category',
  'region',
  'locale',
];

const CACHE_TTL_SECONDS = 300;

const JSON_TYPE = { 'content-type': 'application/json' };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    /* 1. Scope. One path; everything else never contacts origin. */
    if (url.pathname !== RESOLVER_PATH) {
      return respond(request, jsonError({ error: 'not_found' }, 404), 'EDGE');
    }

    /* 2. Preflight, answered here. Mirrors the resolver's own 204 handler; the
       header allowlist matches the origin's so a supabase-js style caller works,
       even though authorization/apikey are stripped before forwarding. */
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...corsFor(request),
          'access-control-allow-methods': 'POST, OPTIONS',
          'access-control-allow-headers': 'authorization, content-type, x-client-info, apikey',
          'access-control-max-age': '86400',
        },
      });
    }

    if (request.method !== 'POST') {
      const res = jsonError({ error: 'method_not_allowed', detail: 'Use POST.' }, 405);
      res.headers.set('allow', 'POST, OPTIONS');
      return respond(request, res, 'EDGE');
    }

    /* 3. Body gates — size, JSON, shape. All refusals happen before any origin
       contact and before the rate-limit token is spent: refusing garbage must not
       consume a real user's allowance on a shared (CGNAT) address. */
    const declared = parseInt(request.headers.get('content-length') ?? '0', 10);
    if (declared > MAX_BODY_BYTES) {
      return respond(request, jsonError({ error: 'invalid_request', detail: 'body too large' }, 413), 'EDGE');
    }
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
      return respond(request, jsonError({ error: 'invalid_request', detail: 'body too large' }, 413), 'EDGE');
    }

    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      /* The origin's own wording for the same refusal. */
      return respond(request, jsonError({ error: 'invalid_request', detail: 'body must be JSON' }, 400), 'EDGE');
    }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return respond(request, jsonError({ error: 'invalid_request', detail: 'body must be a JSON object' }, 400), 'EDGE');
    }
    for (const [key, value] of Object.entries(body)) {
      if (!KNOWN_FIELDS.includes(key)) {
        return respond(request, jsonError({ error: 'invalid_request', detail: `unknown field: ${key}` }, 400), 'EDGE');
      }
      if (typeof value !== 'string' || value.length === 0 || value.length > MAX_FIELD_CHARS) {
        return respond(
          request,
          jsonError({ error: 'invalid_request', detail: `${key} must be a non-empty string` }, 400),
          'EDGE',
        );
      }
    }

    const passthrough = env.PASSTHROUGH === '1';

    /* 4. The per-IP binding. Fail OPEN on any limiter fault: this fronts a public
       booking CTA, and a limiter outage that replaced every affiliate link with an
       error would be the scope doc's D1 failure mode rebuilt at the edge. */
    if (!passthrough && env.RESOLVER_RL) {
      try {
        const { success } = await env.RESOLVER_RL.limit({
          key: request.headers.get('cf-connecting-ip') ?? 'unknown',
        });
        if (!success) {
          const res = jsonError(
            { error: 'rate_limited', detail: 'Too many requests from this address; retry in a minute.' },
            429,
          );
          res.headers.set('retry-after', '60');
          return respond(request, res, 'LIMIT');
        }
      } catch (e) {
        console.error('rate-limit binding failed open:', e);
      }
    }

    /* 5. Canonical cache key: known fields in fixed order, present ones only, as a
       synthetic GET on the bound hostname (the CDN Worker's pattern — entries
       follow the hostname). Two bodies that differ only in key order or unknown
       whitespace share one entry; absent-vs-"none" hotel_preference makes two
       entries with identical answers, which is harmless at 84 selections. */
    const params = new URLSearchParams();
    for (const field of KNOWN_FIELDS) if (field in body) params.set(field, body[field]);
    const cacheKey = new Request(`${url.origin}/__cache${RESOLVER_PATH}?${params}`, { method: 'GET' });
    const cache = caches.default;

    if (!passthrough) {
      const hit = await cache.match(cacheKey);
      if (hit) return respond(request, hit, 'HIT');
    }

    /* 6. Forward — fresh headers only. Nothing inbound crosses: not authorization,
       not apikey, not cookies, not the client's own content-type variants. */
    const upstream = await fetch(ORIGIN + RESOLVER_PATH, {
      method: 'POST',
      headers: JSON_TYPE,
      body: raw,
    });

    if (passthrough) return respond(request, sanitise(upstream), 'BYPASS');

    if (upstream.status === 200) {
      /* Store the sanitised copy; TTL is OURS, set explicitly — the resolver sends
         no Cache-Control (verified against source and live, 1 Sep 2026), and this
         file must not depend on that staying true either way. clone() before the
         body is read; put() consumes the clone in the background. */
      const stored = sanitise(upstream);
      ctx.waitUntil(cache.put(cacheKey, stored.clone()));
      return respond(request, stored, 'MISS');
    }
    /* Non-200 (400 invalid values, 500 upstream) passes through, never cached —
       an origin fault pinned into cache for five minutes would outlive the fault. */
    return respond(request, sanitise(upstream), 'PASS');
  },
};

/** One header policy for every stored/forwarded origin response: keep the payload
 *  type, own the TTL, drop the origin's CORS (re-applied per-request in respond()),
 *  drop cookies/vary (nothing varies; Vary: * would make put() throw). */
function sanitise(upstream) {
  const headers = new Headers();
  headers.set('content-type', upstream.headers.get('content-type') ?? 'application/json');
  headers.set('cache-control', `public, max-age=${CACHE_TTL_SECONDS}`);
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

/** A Worker-authored refusal, same envelope family as the resolver's own errors. */
function jsonError(body, status) {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_TYPE } });
}

/** Scoped CORS, echoed per-request. No Origin header (native app, curl) → no CORS
 *  headers at all. Disallowed Origin → no ACAO, and the browser enforces. */
function corsFor(request) {
  const origin = request.headers.get('origin');
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    return { 'access-control-allow-origin': origin, vary: 'origin' };
  }
  return {};
}

/** Stamp state + CORS on the way out. Cached responses arrive with immutable
 *  headers — wrap to write (the CDN Worker's mark() lesson). */
function respond(request, res, state) {
  const out = new Response(res.body, res);
  out.headers.set('x-cw-api', state);
  /* Client-facing only: a response to a POST is not reusable by any HTTP cache,
     and without an explicit value here the zone's Browser Cache TTL rewrites the
     stored max-age=300 to its own 14400 on cache hits (observed 1 Sep 2026). The
     STORED entry keeps max-age=300 — its clone goes to cache.put before this
     wrapper runs — so the edge TTL is unaffected. */
  out.headers.set('cache-control', 'no-store');
  for (const [k, v] of Object.entries(corsFor(request))) out.headers.set(k, v);
  return out;
}
