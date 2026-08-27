/**
 * The six region slugs `book-with-pete-route` accepts.
 *
 * TODO(contracts): duplicated from `_shared/regions.ts` in the backend repo; belongs in
 * the client_config RPC.
 *
 * These are BACKEND SLUGS, never display labels — that file is explicit that a display
 * label must not appear in a route key, and that the July Book with Pete docs'
 * `ayia_napa_protaras` and `troodos_mountains` are both wrong. Display names come from
 * `places_sync.destination.name`, which carries all five languages, so `famagusta` reads
 * "Ayia Napa & Protaras" without a hardcoded map.
 *
 * The homepage frame's chips do not match this list: it shows *Pafos, Ayia Napa, Larnaka,
 * Limassol, Paralimni, Not Sure*, where Ayia Napa and Paralimni are both `famagusta`,
 * "Not Sure" is not a region at all, and Troodos and Nicosia are absent. The slugs win.
 */
export const BOOKING_REGIONS = [
  'paphos',
  'limassol',
  'larnaka',
  'famagusta',
  'troodos',
  'nicosia',
] as const;

export type BookingRegion = (typeof BOOKING_REGIONS)[number];
