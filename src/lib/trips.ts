import { getSupabase } from './supabase';

/**
 * `itineraries` — READ ONLY.
 *
 * Decision Log entry 44 accepted client-written `itinerary_data` because there was one
 * writer, and named "a second writer — a web client" as the trigger to move the rules
 * server-side. Phase 2 does not pull that trigger: there is no insert, update or delete
 * anywhere in this file, and none should be added until the backend has a server create
 * path and the direct `itinerary_data` write is revoked.
 *
 * The query and the day-of-N computation are taken from the app's `home.tsx` rather than
 * re-derived, so the two clients cannot disagree about what "Day 2 of 4" means.
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
