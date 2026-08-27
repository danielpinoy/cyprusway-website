import { getSupabase } from './supabase';
import type { LanguageCode } from '../i18n/languages';

/**
 * One query feeds every place-backed rail on the homepage.
 *
 * Measured 28 Aug 2026 against the live project: 181 published rows, 89.7 KB
 * uncompressed, **13.8 KB gzipped**, 232 ms. Selecting the whole `translations` column
 * instead of projecting the name costs 71 KB gzipped, because it drags the entire
 * EditorJS `description` along — hence the `name:translations->en->>name` projection.
 *
 * This is the pattern the app already uses on its home screen: 181 small rows, one
 * request, rails derived in memory. Four rails share it, so four round trips become one.
 */

/** A localised name blob as stored on `destination` and `categories`. */
type LocalisedName = Partial<Record<LanguageCode, string>>;

interface PlaceRow {
  id: number;
  slug: string;
  /** English only — `translations` carries `en` on 181 of 181 rows. */
  name: string | null;
  hero_image_url: string | null;
  virtual_tour: unknown | null;
  prominence: number | null;
  destination: { slug: string; name: LocalisedName } | null;
  /** Every published place carries exactly one — measured: 0 with more, 0 with none. */
  categories: { slug: string; name: LocalisedName; icon: string | null }[] | null;
}

export interface Place {
  id: number;
  slug: string;
  name: string;
  heroUrl: string | null;
  hasTour: boolean;
  prominence: number | null;
  regionSlug: string | null;
  regionName: LocalisedName;
  categorySlug: string | null;
  categoryName: LocalisedName;
  /** Material icon name from the CMS, e.g. `restaurant`, `beach_access`. */
  categoryIcon: string | null;
}

const SELECT = [
  'id',
  'slug',
  'name:translations->en->>name',
  'hero_image_url',
  'virtual_tour',
  'destination',
  'categories',
  'prominence',
].join(',');

export async function fetchPlaces(): Promise<Place[]> {
  const { data, error } = await getSupabase()
    .from('places_sync')
    .select(SELECT)
    .eq('status', 'published')
    /* Both keys matter. Six places are tied at prominence 85.0 exactly, and without a
       deterministic second key Postgres may order ties differently between requests —
       which would let Top Recommendations and Popular draw the same place despite
       taking disjoint rank bands. */
    .order('prominence', { ascending: false, nullsFirst: false })
    .order('id', { ascending: true })
    .returns<PlaceRow[]>();

  if (error) throw error;

  return (data ?? []).map(toPlace);
}

function toPlace(row: PlaceRow): Place {
  const category = row.categories?.[0] ?? null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name ?? row.slug,
    heroUrl: row.hero_image_url,
    hasTour: row.virtual_tour != null,
    prominence: row.prominence,
    regionSlug: row.destination?.slug ?? null,
    regionName: row.destination?.name ?? {},
    categorySlug: category?.slug ?? null,
    categoryName: category?.name ?? {},
    categoryIcon: category?.icon ?? null,
  };
}

/** Pick a localised name, falling back to English then to nothing. */
export function localised(name: LocalisedName, lang: LanguageCode): string {
  return name[lang] ?? name.en ?? '';
}
