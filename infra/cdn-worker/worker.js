/**
 * cdn.cyprusway.eu — the Cloudflare Worker in front of Directus assets.
 *
 * Why a Worker and not a proxied CNAME: Railway routes by Host/SNI, so a CNAME needs the
 * hostname registered on the Railway service plus the Full-SSL certificate dance. This
 * Worker fetches the railway.app URL directly — zero Railway configuration, and the
 * /assets/-only allowlist lives in code instead of a WAF rule. Decided 31 Aug 2026;
 * the measurements are in the website repo, docs/PERF-MEASUREMENT-2026-08-30.md, and the
 * origin decomposition is in cyprusway-directus/docs/reference/curated/
 * directus-latency-floor-2026-08-31.md: a cached derivative costs a Cyprus visitor
 * ~320 ms warm-connection from the Amsterdam origin (~80 ms geometry + ~60-100 ms
 * per-request permission walk + ~100-250 ms Frankfurt storage fetch, and no origin-side
 * fix removes any of those); a Larnaca edge hit costs ~50 ms.
 *
 * Why the Cache API and not `cf` fetch options: `cacheTtlByStatus` is Enterprise-only,
 * and a bare `cacheTtl` with `cacheEverything` can pin an error response for its full
 * TTL. Storing explicitly means exactly one policy: 200s are cached (they carry
 * Directus's own `Cache-Control: public, max-age=2592000`), everything else passes
 * through untouched. Trade-off, recorded: the Cache API is per-colo — the zone's Tiered
 * Cache toggle does not apply to it. At this traffic that is the same reality; if
 * global hit-rate ever matters, revisit.
 *
 * THE REVERT MATRIX (agreed with the PM, 31 Aug 2026):
 * - Cache misbehaves (stale, wrong bytes): set the PASSTHROUGH var to "1" in the
 *   dashboard. The Worker becomes a plain proxy — no site rebuild, no code change.
 *   (A later `wrangler deploy` re-applies this file's vars; re-flip it after.)
 * - Worker dead entirely: set CDN_HOST to null in the site's src/lib/directusImage.ts
 *   and rebuild (~3 min). Zero-rebuild cover for THAT case would be registering
 *   cdn.cyprusway.eu on the Railway service as a fallback — ops, optional, not done.
 *
 * Binding (manual, PM): Workers dashboard → this worker → Settings → Domains & Routes →
 * Custom Domain `cdn.cyprusway.eu` (the zone is already on Cloudflare; DNS and the cert
 * are created automatically). Deploy from the repo root with
 * `npx wrangler deploy --config infra/cdn-worker/wrangler.jsonc`, or paste this file
 * into the dashboard editor — it is deliberately self-contained.
 *
 * Observability: every response carries `x-cw-cdn: HIT | MISS | PASS | BYPASS`
 * (PASS = non-200 from origin, never cached; BYPASS = PASSTHROUGH mode).
 *
 * Two accepted exposures, so nobody rediscovers them as findings:
 * - Any query-string permutation is a distinct cache key, and Directus answers unknown
 *   params with the full-size original (200). A third party can therefore fill the
 *   cache with junk variants of real assets. Bounded (the path allowlist caps the
 *   namespace to real UUIDs) and harmless (same public bytes) — not worth a param
 *   allowlist that would break the app's own transform sizes.
 * - `Access-Control-Allow-Origin: *` is set on purpose: these are public images, and a
 *   cached copy stored without it would make any future `crossorigin` <img> fail against
 *   whatever happens to be in the cache. The warning against adding `crossorigin`
 *   at all lives where the URLs are born: src/lib/directusImage.ts.
 */

const ORIGIN = 'https://cyprusway-directus-production.up.railway.app';

/* /assets/<directus file uuid>, with Directus's optional trailing SEO-filename segment.
   Everything else on this hostname — /admin, the API, junk — is a 404 that never
   contacts the origin. Scoping, not security: the railway.app hostname still serves
   admin and API for the team; this rule only stops the NEW name expanding exposure. */
const ASSET_PATH =
  /^\/assets\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:\/[A-Za-z0-9._-]{1,120})?$/i;

export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('method not allowed', {
        status: 405,
        headers: { allow: 'GET, HEAD' },
      });
    }

    const url = new URL(request.url);
    if (!ASSET_PATH.test(url.pathname)) {
      return new Response('not found', { status: 404 });
    }

    const originUrl = ORIGIN + url.pathname + url.search;

    if (env.PASSTHROUGH === '1') {
      const upstream = sanitise(await fetch(originUrl));
      return finish(request, mark(upstream, 'BYPASS'));
    }

    /* Always a GET key: HEAD shares the GET cache entry, and the body is dropped in
       finish(). Keyed on the public URL so entries follow the bound hostname. */
    const cacheKey = new Request(url.toString(), { method: 'GET' });
    const cache = caches.default;

    const hit = await cache.match(cacheKey);
    if (hit) return finish(request, mark(hit, 'HIT'));

    const upstream = sanitise(await fetch(originUrl));
    if (upstream.status === 200) {
      /* clone() before the body is read; put() consumes the clone in the background. */
      ctx.waitUntil(cache.put(cacheKey, upstream.clone()));
      return finish(request, mark(upstream, 'MISS'));
    }
    return finish(request, mark(upstream, 'PASS'));
  },
};

/** One header policy for every path through the Worker, so HIT and MISS are identical. */
function sanitise(upstream) {
  const headers = new Headers(upstream.headers);
  /* Directus sends `Vary: Origin, Cache-Control`. Stored, it would fragment the cache
     by request headers nobody varies on purpose — and `Vary: *` would make put() throw. */
  headers.delete('vary');
  headers.delete('set-cookie');
  /* See the header note: public images, and cached copies must already carry CORS
     headers for any future crossorigin consumer. Timing-Allow-Origin makes the edge
     timing visible to RUM if it is ever added. */
  headers.set('access-control-allow-origin', '*');
  headers.set('timing-allow-origin', '*');
  /* Directus sends public,max-age=2592000 on derivatives; belt and braces if it ever
     stops — an uncacheable stored response would silently turn every request MISS. */
  if (!headers.has('cache-control')) headers.set('cache-control', 'public, max-age=2592000');
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

function mark(res, state) {
  /* Responses from cache.match arrive with immutable headers — wrap to stamp. */
  const out = new Response(res.body, res);
  out.headers.set('x-cw-cdn', state);
  return out;
}

function finish(request, res) {
  /* Explicit HEAD handling rather than trusting the runtime to drop the body. */
  return request.method === 'HEAD' ? new Response(null, res) : res;
}
