/**
 * The catalogue request, as one string, defined once.
 *
 * Two consumers must agree byte-for-byte or the whole point is lost:
 *
 *   1. `fetchPlaces()` in ./places.ts issues this request with plain `fetch`.
 *   2. The build (vite.config.ts) injects it into every prerendered `<head>` as
 *      `<link rel="preload" as="fetch">`, so the download starts while the JS chunk is
 *      still parsing — measured 30 Aug 2026, the fetch previously could not begin until
 *      319 ms on a fast desktop and 1750 ms on throttled mobile, because it waited for
 *      hydration. Chrome matches a preload to its consumer by URL and credentials mode,
 *      so both sides call this function rather than composing the URL themselves.
 *
 * `apikey` travels in the QUERY STRING, not a header. The anon key is public by design
 * (it ships in every bundle and sits in .env.example); putting it in the query keeps the
 * request free of non-safelisted headers, which keeps it a "simple" CORS request — no
 * OPTIONS preflight. The preflight measured 82 ms on the first visit of the hour
 * (Supabase caches it for 3600 s). docs/PERF-MEASUREMENT-2026-08-30.md.
 *
 * This module is dependency-free on purpose: vite.config.ts imports it at build time in
 * Node, where `import.meta.env` does not exist — so the URL and key arrive as arguments.
 */

/* The projection matches what the site renders. Selecting the whole `translations`
   column instead would cost 71 KB gzipped (measured 28 Aug 2026) because it drags the
   entire EditorJS description of every language along. `plannable` is read as a filter
   by the trip picker: the 35 published-but-unplannable places must never be offered as
   a stop (trip-edit refuses with place_not_plannable). */
const SELECT = [
  'id',
  'slug',
  'name:translations->en->>name',
  'short:translations->en->>short_description',
  'description:translations->en->description',
  'hero_image_url',
  'gallery',
  'virtual_tour',
  'destination',
  'categories',
  'badges',
  'prominence',
  'visit_duration_minutes',
  'plannable',
].join(',');

export function catalogueRequest(supabaseUrl: string, anonKey: string): string {
  const query = new URLSearchParams({
    select: SELECT,
    status: 'eq.published',
    /* Both order keys matter. Six places are tied at prominence 85.0 exactly, and
       without a deterministic second key Postgres may order ties differently between
       requests — which would let Top Recommendations and Popular draw the same place
       despite taking disjoint rank bands. */
    order: 'prominence.desc.nullslast,id.asc',
    apikey: anonKey,
  });
  return `${supabaseUrl.replace(/\/$/, '')}/rest/v1/places_sync?${query.toString()}`;
}
