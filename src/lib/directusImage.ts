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
 * The host is whatever the mirror row carries — deliberately not validated, rewritten or
 * hardcoded. All stored URLs are currently pinned to the Railway hostname; if that moves,
 * the fix is re-syncing `places_sync`, not client code.
 */

const SOURCE_MAX_PX = 2000;
const QUALITY = 70;

interface Slot {
  /** CSS pixels the image occupies at its largest rendered size. */
  width: number;
  height?: number;
}

function transform(assetUrl: string, slot: Slot, scale: number): string {
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
