/**
 * The resolver Worker's body rules, pure, so `node --test infra/api-worker`
 * covers them without a Worker runtime (worker.js imports them).
 *
 * THE FIELDS are every field the resolver reads, none it doesn't, in the
 * order the cache key lists them. `locale` is included even though the
 * origin discards it after validation: excluding it would serve a cached
 * 200 to a body the origin would 400 (invalid locale), and cached-vs-
 * uncached behaviour must not diverge.
 *
 * SINCE 19 OCT 2026 three of them are LISTS (the owner's multi-select:
 * several picks, one link): accommodation_types, hotel_preferences,
 * activity_categories, arrays of 1 to 8 short strings. In the cache key a
 * list is SORTED, so "4,5" and "5,4" share one entry (the origin answers
 * them the same: it orders picks by its vocabulary). Values are NOT
 * checked against the vocabularies here, as before: the origin stays the
 * authority, and its 400s pass through uncached.
 */

export const KNOWN_FIELDS = [
  'booking_type',
  'accommodation_type',
  'accommodation_types',
  'hotel_preference',
  'hotel_preferences',
  'activity_category',
  'activity_categories',
  'region',
  'locale',
];

export const LIST_FIELDS = new Set(['accommodation_types', 'hotel_preferences', 'activity_categories']);

export const MAX_FIELD_CHARS = 64;
export const MAX_LIST_ITEMS = 8;

const isWord = (value) => typeof value === 'string' && value.length > 0 && value.length <= MAX_FIELD_CHARS;

/**
 * Why a parsed body is refused at the edge, in the resolver's own words, or
 * null when its shape is fine.
 */
export function shapeProblem(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return 'body must be a JSON object';
  for (const [key, value] of Object.entries(body)) {
    if (!KNOWN_FIELDS.includes(key)) return `unknown field: ${key}`;
    if (LIST_FIELDS.has(key)) {
      if (!Array.isArray(value) || value.length === 0 || value.length > MAX_LIST_ITEMS || !value.every(isWord)) {
        return `${key} must be an array of 1 to ${MAX_LIST_ITEMS} non-empty strings`;
      }
    } else if (!isWord(value)) {
      return `${key} must be a non-empty string`;
    }
  }
  return null;
}

/**
 * The canonical cache key's query: known fields in fixed order, present
 * ones only; a list sorted and comma-joined. Two bodies that differ only in
 * key order, list order or unknown whitespace share one entry.
 */
export function canonicalQuery(body) {
  const params = new URLSearchParams();
  for (const field of KNOWN_FIELDS) {
    if (!(field in body)) continue;
    const value = body[field];
    params.set(field, Array.isArray(value) ? [...value].sort().join(',') : value);
  }
  return params.toString();
}
