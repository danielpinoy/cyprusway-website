/**
 * Directus asset transform URLs — the ONLY place a transform query string is composed.
 *
 * Ported from the app's `src/lib/directusImage.ts` rather than re-derived, because that
 * file encodes facts that were measured against this Directus instance (11.17.4) and are
 * expensive to rediscover:
 *
 * - Accepted params: width, height, fit, quality, format, withoutEnlargement, transforms,
 *   download. **Anything else is silently ignored and the full-size original comes back
 *   with a 200** — so a typo like `?w=160` "works" and ships a 400 KB JPEG that renders
 *   correctly and is just slow. That is why nobody builds one of these inline.
 * - Directus upscales with no ceiling (width=10000 on a 2000px source returns
 *   10000×5400), so `withoutEnlargement=true` is always sent, belt and braces with the
 *   clamp below.
 * - Stored originals are ≤2000px on the longest edge.
 * - Derivatives carry `Cache-Control: public, max-age=2592000` (30 days) and revalidation
 *   is broken — the ETag is identical across every derivative and If-None-Match returns
 *   200, never 304. Caching rests on max-age alone.
 *
 * Re-verified from this repo on 28 Aug 2026: a 432 KB source JPEG returns a 45 KB WebP at
 * 564×600, with the 30-day Cache-Control intact.
 *
 * The STORED host is whatever the mirror row carries — still not validated, and if the
 * Directus origin itself ever moves, the fix is still re-syncing `places_sync`. What DID
 * change on 31 Aug 2026: at render time the Railway host is re-routed through
 * cdn.cyprusway.eu, the Cloudflare Worker in infra/cdn-worker/, because a cached
 * derivative from the Amsterdam origin costs a Cyprus visitor ~320 ms warm-connection
 * and a Larnaca edge hit costs ~50 (docs/PERF-MEASUREMENT-2026-08-30.md). The re-route
 * lives HERE, not in a re-sync, precisely so it reverts in one edit — a re-sync is not a
 * one-edit revert, and it would drag the app along with it. See CDN_HOST below.
 *
 * DO NOT add `crossorigin` to any <img> that renders these URLs. They are fetched
 * no-cors; the Worker strips `Vary` and serves cached copies. `crossorigin` flips the
 * request into CORS mode — and against the direct Railway origin (the reverted state,
 * which answers `Vary: Origin`) the browser rejects responses whose
 * Access-Control-Allow-Origin does not match, so the images break, silently, and only
 * in whichever environment happens to bypass the Worker. The Worker sets ACAO:* to
 * blunt the cdn path, but the rule stands: if pixel access (canvas/fetch) is ever
 * needed, revisit infra/cdn-worker/worker.js FIRST, then add the attribute.
 */

const SOURCE_MAX_PX = 2000;
const QUALITY = 70;

/**
 * The render-time route to the assets. `null` sends every URL back to the stored
 * Railway host.
 *
 * THE REVERT MATRIX (agreed 31 Aug 2026):
 * - The Worker MISBEHAVES (stale, wrong bytes): flip PASSTHROUGH to "1" on the Worker
 *   in the Cloudflare dashboard. Plain proxy, no rebuild, nothing changes here.
 * - The Worker is DEAD: set this to null and rebuild (~3 min). One edit — but a
 *   rebuild, because Vite inlines the constant; accepted in exchange for not adding a
 *   runtime config fetch to every page.
 * - index.html's image preconnect points at the same host. The two change together.
 *
 * Deploy ordering: cdn.cyprusway.eu must be bound (Worker custom domain) BEFORE a
 * build with this non-null ships — prerendered pages bake these URLs. `npm run dev`
 * bypasses the swap so local work never depends on the binding existing.
 */
const CDN_HOST: string | null = 'https://cdn.cyprusway.eu';
const DIRECTUS_ORIGIN = 'https://cyprusway-directus-production.up.railway.app';

function swapHost(assetUrl: string): string {
  if (CDN_HOST === null || import.meta.env.DEV) return assetUrl;
  if (!assetUrl.startsWith(DIRECTUS_ORIGIN + '/')) return assetUrl;
  return CDN_HOST + assetUrl.slice(DIRECTUS_ORIGIN.length);
}

interface Slot {
  /** CSS pixels the image occupies at its largest rendered size. */
  width: number;
  height?: number;
}

function transform(assetUrl: string, slot: Slot, scale: number): string {
  /* The only place the query string is composed is also the only place the route is
     chosen: every image URL passes through here, so the swap cannot be half-applied. */
  assetUrl = swapHost(assetUrl);
  const width = Math.min(Math.round(slot.width * scale), SOURCE_MAX_PX);
  const params = [`width=${width}`];
  if (slot.height !== undefined) {
    const height = Math.min(Math.round(slot.height * scale), SOURCE_MAX_PX);
    params.push(`height=${height}`, 'fit=cover');
  }
  params.push(`quality=${QUALITY}`, 'format=webp', 'withoutEnlargement=true');
  return `${assetUrl}${assetUrl.includes('?') ? '&' : '?'}${params.join('&')}`;
}

/** 1× URL for the slot. */
export function directusImageUrl(assetUrl: string, slot: Slot): string {
  return transform(assetUrl, slot, 1);
}

/**
 * `srcset` at 1× and 2×.
 *
 * The app picks one width from the device's pixel ratio because it renders natively; the
 * browser does it better with a srcset, and — the reason this matters here — the same two
 * derivative widths are requested by every visitor, which keeps Directus's server-side
 * derivative cache to a handful of sizes instead of one per screen width in the wild.
 * 3× is deliberately not offered: it triples the bytes for a difference nobody sees on a
 * photograph at these sizes.
 */
export function directusImageSrcSet(assetUrl: string, slot: Slot): string {
  return [`${transform(assetUrl, slot, 1)} 1x`, `${transform(assetUrl, slot, 2)} 2x`].join(', ');
}
