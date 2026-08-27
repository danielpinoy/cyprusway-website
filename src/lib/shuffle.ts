/**
 * A shuffle that holds still.
 *
 * "Popular at the moment" draws a rotating slice of high-prominence places. Rotating per
 * *session* is the point; rotating per *render* would mean cards moving under someone's
 * eyes while they read, which is worse than a static list.
 *
 * So the order comes from a seed, and the seed lives in `sessionStorage`:
 *
 *  - stable across re-renders, across client-side navigation, and across a reload in the
 *    same tab — a reload mid-read is exactly when a jump is most jarring
 *  - re-rolled in a new tab or a new session, which is the rotation
 *
 * `sessionStorage` rather than `useMemo` because `useMemo` is a hint, not a cache: React
 * is free to discard it, and a discarded memo would reshuffle silently.
 */

const SEED_KEY = 'cw_popular_seed';

/** Stable within a tab session; a new value in a new tab. */
export function sessionSeed(): number {
  try {
    const stored = sessionStorage.getItem(SEED_KEY);
    if (stored) {
      const parsed = Number.parseInt(stored, 10);
      if (Number.isFinite(parsed)) return parsed;
    }
    const seed = Math.floor(Math.random() * 0xffffffff);
    sessionStorage.setItem(SEED_KEY, String(seed));
    return seed;
  } catch {
    /* Storage blocked, or this is the prerender pass with no window. A fixed seed keeps
       the order deterministic, which is what the prerendered HTML needs anyway. */
    return 0;
  }
}

/** mulberry32 — small, fast, and good enough to shuffle 22 items. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates against a seeded generator. Does not mutate the input. */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const out = items.slice();
  const random = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const a = out[i] as T;
    const b = out[j] as T;
    out[i] = b;
    out[j] = a;
  }
  return out;
}
