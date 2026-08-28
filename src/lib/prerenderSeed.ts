import type { Place } from './places';

/**
 * The catalogue rows a prerendered page was rendered with, handed to the client so the
 * first client render matches the server HTML exactly.
 *
 * **Why this exists.** Phase 1 prerenders every route, but `useHomeData` starts at
 * `loading` on both sides, so a prerendered page ships its own skeleton — correct for the
 * homepage, whose rails depend on the visitor's interests and session seed, and useless for
 * a place page, whose entire value is 181 pages of editorial prose that a crawler can read
 * without running a bundle.
 *
 * So scripts/prerender.mjs renders each place page with that place already in hand, and
 * writes the same object into the page as JSON. The client reads it back for its first
 * render, hydrates against identical markup, and then fetches the real catalogue — which
 * it needs anyway for the Popular rail.
 *
 * **Consumed once.** After the first mount the seed is dropped, so a client-side navigation
 * to a different place starts from `loading` and shows the skeleton rather than resolving
 * the previous page's slug and flashing "not found".
 *
 * **Place pages only.** `/explore` is prerendered as a shell on purpose: the asset layer
 * serves one file for `/explore` and `/explore?region=paphos` alike, so a seeded grid would
 * be the unfiltered list hydrating against a filtered one — a guaranteed mismatch on every
 * shared filter link. Explore's crawl value is the 181 place URLs it links to, and
 * sitemap.xml carries those directly.
 */

const SEED_ELEMENT_ID = 'cw-seed';

let serverSeed: readonly Place[] | null = null;
let consumed = false;

/** Set by the prerender pass before each render, and cleared after it. Node only. */
export function setSeed(places: readonly Place[] | null): void {
  serverSeed = places;
}

/**
 * The seed for this page, or null. Pure — safe to call from a `useState` initialiser, which
 * StrictMode invokes twice in development.
 */
export function readSeed(): Place[] | null {
  if (serverSeed) return serverSeed.slice();
  if (consumed || typeof document === 'undefined') return null;

  const element = document.getElementById(SEED_ELEMENT_ID);
  if (!element?.textContent) return null;

  try {
    const parsed: unknown = JSON.parse(element.textContent);
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as Place[]) : null;
  } catch {
    /* A truncated or hand-edited seed is not worth a broken page: fall through to the
       ordinary fetch, which is what an unseeded route does anyway. */
    return null;
  }
}

/** Drop the seed so later mounts fetch instead of reusing another page's rows. */
export function clearSeed(): void {
  consumed = true;
  serverSeed = null;
  if (typeof document !== 'undefined') document.getElementById(SEED_ELEMENT_ID)?.remove();
}

export { SEED_ELEMENT_ID };
