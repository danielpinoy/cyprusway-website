import { getSupabase } from './supabase';

/**
 * `saved_places` — read only.
 *
 * RLS scopes every read to the caller's own rows, so no `user_id` filter is needed; the
 * app's `unsavePlace` relies on the same property.
 *
 * A saved row whose place is unpublished or withdrawn produces no card. `sync-place`
 * withdraws rather than deletes precisely so bookmarks survive, and the app documents the
 * resulting state as "the expected steady state, never a failure".
 *
 * Phase 3 adds the write, from the place detail page — the affordance phase 2 recorded as
 * the thing that would unpark this rail.
 */
export async function fetchSavedPlaceIds(limit: number): Promise<number[]> {
  const { data, error } = await (await getSupabase())
    .from('saved_places')
    .select('place_id, saved_at')
    .order('saved_at', { ascending: false })
    .limit(limit)
    .returns<{ place_id: number; saved_at: string }[]>();

  if (error) throw error;
  return (data ?? []).map((row) => row.place_id);
}

/**
 * Idempotent save, ported from the app's `savePlace`.
 *
 * `UNIQUE (user_id, place_id)` means a repeat save is a conflict, not a change. The upsert
 * sends `resolution=merge-duplicates`, and a 23505 arriving anyway is returned as success —
 * "already saved" IS the state the caller asked for. Belt and braces, exactly as the app has
 * it, because the alternative is showing someone an error for something that worked.
 *
 * `id` is GENERATED ALWAYS, so no shape sent from here may include it.
 */
export async function savePlace(userId: string, placeId: number): Promise<void> {
  const { error } = await (await getSupabase())
    .from('saved_places')
    .upsert({ user_id: userId, place_id: placeId }, { onConflict: 'user_id,place_id' });

  if (error && error.code !== '23505') throw error;
}

/** RLS scopes the delete to the caller's own row, so no user_id filter is needed. */
export async function unsavePlace(placeId: number): Promise<void> {
  const { error } = await (await getSupabase()).from('saved_places').delete().eq('place_id', placeId);
  if (error) throw error;
}

/** Whether this place is already saved. One row, or none. */
export async function isPlaceSaved(placeId: number): Promise<boolean> {
  const { data, error } = await (await getSupabase())
    .from('saved_places')
    .select('place_id')
    .eq('place_id', placeId)
    .limit(1);

  if (error) throw error;
  return (data ?? []).length > 0;
}
