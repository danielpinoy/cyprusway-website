import { getSupabase } from './supabase';

/**
 * `itineraries` — reads, one create, one delete. **Every content mutation goes through
 * `trip-edit`** (src/lib/tripEdit.ts).
 *
 * This file used to open by citing Decision Log entry 44 and calling the table read-only,
 * because entry 44 accepted client-written `itinerary_data` and named "a second writer —
 * a web client" as the trigger to move the rules server-side. **That description was
 * already stale when it was written.** The trigger had been pulled on 18 August:
 *
 *  - `trip-generate` INSERTs the itinerary it generates.
 *  - `trip-edit` owns every subsequent mutation — reorder, add or remove a stop, add or
 *    remove a day, rename, move dates. It recomputes times, lunch and every travel leg,
 *    runs the same `scheduler.ts` validators as generation, writes under the caller's JWT,
 *    and guards with `expected_updated_at` optimistic concurrency. It is free and
 *    unlimited: no embedding, no LLM, and it never touches `consume_trip_generation`.
 *    Contract: `docs/trip-edit-contract.md` in the backend repo.
 *  - The app has not hand-written a populated document since that day.
 *
 * So two direct writes remain here and they are deliberate:
 *
 *  1. **Create** — six scalars and `itinerary_data: {"days": []}`. There is no server
 *     create path for a manual trip; `trip-generate` creates only what it generates.
 *  2. **Delete** — a whole row, not a document edit. `trip-edit` has no delete operation,
 *     and migration 0013 grants DELETE to `authenticated` behind `itineraries_delete_own`.
 *
 * Nothing else writes `itinerary_data` from here, and nothing should.
 *
 * The homepage query and the day-of-N computation are taken from the app's `home.tsx`
 * rather than re-derived, so the two clients cannot disagree about what "Day 2 of 4" means.
 */

interface ItineraryDay {
  date?: string;
  day_number?: number;
}

interface TripRow {
  id: string;
  name: string | null;
  base_location: string | null;
  status: string;
  /** `itinerary_data->days`, projected server-side. */
  days: ItineraryDay[] | null;
  /** First place of the first day, the app's own cover projection (trips.tsx). */
  cover: string | null;
}

export interface Trip {
  id: string;
  /** null when the row's name was blanked; the caller composes one from the region. */
  name: string | null;
  regionSlug: string | null;
  /** null when today matches no days[].date — the "Day X of Y" pill hides. */
  dayNumber: number | null;
  dayCount: number;
  isActive: boolean;
  coverUrl: string | null;
}

const COLUMNS =
  'id, name, base_location, status, days:itinerary_data->days, ' +
  'cover:itinerary_data->days->0->pois->0->>hero_image_url';

/**
 * `itineraries` carries no timezone, so "today" is a device-clock decision: the trip
 * counts as running when the local date falls inside trip_start..trip_end. A traveller
 * whose device is still on home time can be a day off at either edge.
 *
 * This is the app's deliberate choice, comment and all. Matching it matters more than
 * being right in isolation — the alternative is the two clients disagreeing about which
 * day of the trip it is.
 */
export function localTodayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function toTrip(row: TripRow, today: string, isActive: boolean): Trip {
  const days = Array.isArray(row.days) ? row.days : [];
  const currentDay = days.find((day) => day.date === today);
  return {
    id: row.id,
    name: row.name?.trim() || null,
    regionSlug: row.base_location,
    dayNumber: typeof currentDay?.day_number === 'number' ? currentDay.day_number : null,
    dayCount: days.length,
    isActive,
    coverUrl: row.cover,
  };
}

/**
 * Up to two cards, matching the frame: one trip that is running today, and one that is
 * not. The app only ever queries the active one; the second card is the design's, and it
 * renders only if a second trip exists.
 */
export async function fetchTrips(): Promise<Trip[]> {
  const today = localTodayIso();
  const supabase = getSupabase();

  const active = await supabase
    .from('itineraries')
    .select(COLUMNS)
    /* Range check is server-side against the trip_start/trip_end date columns; rows with
       null dates simply never match. Most recently updated wins if ranges overlap. */
    .lte('trip_start', today)
    .gte('trip_end', today)
    .order('updated_at', { ascending: false })
    .limit(1)
    .returns<TripRow[]>();

  if (active.error) throw active.error;

  const activeRow = active.data?.[0] ?? null;
  const trips: Trip[] = activeRow ? [toTrip(activeRow, today, true)] : [];

  const others = await supabase
    .from('itineraries')
    .select(COLUMNS)
    .order('updated_at', { ascending: false })
    .limit(3)
    .returns<TripRow[]>();

  if (others.error) throw others.error;

  for (const row of others.data ?? []) {
    if (trips.length >= 2) break;
    if (row.id === activeRow?.id) continue;
    trips.push(toTrip(row, today, false));
  }

  return trips;
}

// ---------------------------------------------------------------------------
// The trip hub, and one trip in full.
// ---------------------------------------------------------------------------

/** The six `base_location` values `trip-generate` accepts. The column is plain `text`
 *  with NO CHECK (migration 0013), and a manual trip never reaches `trip-generate`, so
 *  this is the only thing standing between a typo and a row that breaks later. */
export const BASE_LOCATIONS = [
  'paphos',
  'limassol',
  'larnaka',
  'famagusta',
  'troodos',
  'nicosia',
] as const;

export type BaseLocation = (typeof BASE_LOCATIONS)[number];

export function isBaseLocation(value: string | null | undefined): value is BaseLocation {
  return typeof value === 'string' && (BASE_LOCATIONS as readonly string[]).includes(value);
}

/** Trip-length bound, from the trip-edit contract. Not scheduling knowledge — a request
 *  shape bound, which is the only kind of constant this client is allowed to carry. */
export const MAX_TRIP_DAYS = 31;
export const MAX_STOPS_PER_DAY = 20;
export const MAX_TRIP_NAME = 120;

export interface TripSummary {
  id: string;
  name: string | null;
  regionSlug: string | null;
  tripStart: string | null;
  tripEnd: string | null;
  dayCount: number;
  coverUrl: string | null;
  updatedAt: string;
}

const SUMMARY_COLUMNS =
  'id, name, base_location, trip_start, trip_end, updated_at, ' +
  'days:itinerary_data->days, ' +
  'cover:itinerary_data->days->0->pois->0->>hero_image_url';

/** Every trip the caller owns, newest edit first. RLS scopes it; no user filter is
 *  needed and none is added, matching the rest of this file. */
export async function fetchAllTrips(): Promise<TripSummary[]> {
  const { data, error } = await getSupabase()
    .from('itineraries')
    .select(SUMMARY_COLUMNS)
    .order('updated_at', { ascending: false })
    .returns<
      (TripRow & { trip_start: string | null; trip_end: string | null; updated_at: string })[]
    >();

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name?.trim() || null,
    regionSlug: row.base_location,
    tripStart: row.trip_start,
    tripEnd: row.trip_end,
    dayCount: Array.isArray(row.days) ? row.days.length : 0,
    coverUrl: row.cover,
    updatedAt: row.updated_at,
  }));
}

/**
 * One trip, with the whole stored document and the `updated_at` every edit must echo.
 *
 * `updated_at` is read as a STRING and never parsed — `expected_updated_at` is compared
 * byte-for-byte on the server, and a round trip through `Date` would reformat it.
 */
export interface TripDetail {
  id: string;
  name: string | null;
  regionSlug: string | null;
  tripStart: string | null;
  tripEnd: string | null;
  days: unknown[];
  updatedAt: string;
}

export async function fetchTrip(id: string): Promise<TripDetail | null> {
  const { data, error } = await getSupabase()
    .from('itineraries')
    .select('id, name, base_location, trip_start, trip_end, updated_at, itinerary_data')
    .eq('id', id)
    .maybeSingle<{
      id: string;
      name: string | null;
      base_location: string | null;
      trip_start: string | null;
      trip_end: string | null;
      updated_at: string;
      itinerary_data: { days?: unknown[] } | null;
    }>();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    name: data.name?.trim() || null,
    regionSlug: data.base_location,
    tripStart: data.trip_start,
    tripEnd: data.trip_end,
    days: Array.isArray(data.itinerary_data?.days) ? data.itinerary_data.days : [],
    updatedAt: data.updated_at,
  };
}

/**
 * Create an empty trip. The one direct write of `itinerary_data`, and it writes nothing
 * but an empty document.
 *
 * Field for field the app's `createManualTrip`, including what it leaves out:
 *
 *  - **`type` is deliberately absent.** The column defaults to `'manual'`, and if the
 *    scoped column-grant migration ever lands, naming the column in the body would fail
 *    the whole insert with 42501.
 *  - **`trip_end` is written here and ONLY here** (`start + days − 1`). Every later change
 *    goes through `trip-edit`, which derives it — which is what stops the column and the
 *    days array disagreeing.
 *  - `.select('id')` so a zero-row insert is an error rather than a silent success.
 */
export async function createTrip(input: {
  userId: string;
  name: string;
  baseLocation: BaseLocation;
  startIso: string;
  endIso: string;
}): Promise<string> {
  const { data, error } = await getSupabase()
    .from('itineraries')
    .insert({
      user_id: input.userId,
      name: input.name,
      status: 'active',
      trip_start: input.startIso,
      trip_end: input.endIso,
      base_location: input.baseLocation,
      itinerary_data: { days: [] },
    })
    .select('id')
    .single<{ id: string }>();

  if (error) throw error;
  if (!data?.id) throw new Error('zero_rows_inserted');
  return data.id;
}

/**
 * Delete a whole trip.
 *
 * Not an `itinerary_data` write, so it does not cross the line `trip-edit` draws — and
 * `trip-edit` has no delete operation to route it through. Migration 0013 grants DELETE to
 * `authenticated` behind `itineraries_delete_own`, so RLS is the owner check.
 *
 * `.select('id')` again: without it a zero-row delete — wrong id, changed policy — returns
 * success, and the screen would navigate away from a trip that is still there.
 */
export async function deleteTrip(id: string): Promise<void> {
  const { data, error } = await getSupabase()
    .from('itineraries')
    .delete()
    .eq('id', id)
    .select('id');

  if (error) throw error;
  if (!data || data.length === 0) throw new Error('zero_rows_deleted');
}
