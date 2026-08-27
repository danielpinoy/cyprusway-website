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
 * The table has never held a row, and phase 2 ships no save affordance — saving belongs to
 * the place detail page, which is parked. So this returns nothing until that ships.
 */
export async function fetchSavedPlaceIds(limit: number): Promise<number[]> {
  const { data, error } = await getSupabase()
    .from('saved_places')
    .select('place_id, saved_at')
    .order('saved_at', { ascending: false })
    .limit(limit)
    .returns<{ place_id: number; saved_at: string }[]>();

  if (error) throw error;
  return (data ?? []).map((row) => row.place_id);
}
