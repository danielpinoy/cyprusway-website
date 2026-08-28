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
  /** Also English only. Median 166 characters — see the fallback card in PlaceCard. */
  short: string | null;
  /** EditorJS. Measured across all 181 rows: paragraph blocks only, one `text` field
   *  each, no inline HTML, 1–2 blocks, 11–148 words. */
  description: { blocks?: { type?: string; data?: { text?: string } }[] } | null;
  hero_image_url: string | null;
  /** Never contains the hero; the two are separate images. Measured 28 Aug. */
  gallery: unknown[] | null;
  virtual_tour: unknown | null;
  plannable: boolean | null;
  prominence: number | null;
  visit_duration_minutes: number | null;
  destination: { slug: string; name: LocalisedName } | null;
  /** Every published place carries exactly one — measured: 0 with more, 0 with none. */
  categories: { slug: string; name: LocalisedName; icon: string | null }[] | null;
  badges: { slug: string; name: LocalisedName; icon: string | null; color: string | null }[] | null;
}

export interface Badge {
  slug: string;
  name: LocalisedName;
  icon: string | null;
  color: string | null;
}

export interface Place {
  id: number;
  slug: string;
  name: string;
  /** English only. Carries the fallback card and the detail page's standfirst. */
  short: string | null;
  /** The description's paragraphs, flattened to plain text. English only. */
  description: string[];
  heroUrl: string | null;
  /** Hero first, then gallery, deduped. 0 on 108 of 181 places; 2 is the commonest
   *  non-zero value and only two places have six or more. */
  images: string[];
  hasTour: boolean;
  prominence: number | null;
  visitDurationMinutes: number | null;
  regionSlug: string | null;
  regionName: LocalisedName;
  categorySlug: string | null;
  categoryName: LocalisedName;
  /** Material icon name from the CMS, e.g. `restaurant`, `beach_access`. */
  categoryIcon: string | null;
  /** Whether a trip may schedule a stop here. See the note on the select. */
  plannable: boolean;
  badges: Badge[];
}

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
  /* Only the trip picker reads this, and it reads it as a filter rather than a field —
     the 35 published-but-unplannable places must never be offered as a stop, because
     trip-edit refuses a NEW stop at one (place_not_plannable). Measured 28 Aug: 181
     published, 146 plannable, and all 146 carry coordinates. */
  'plannable',
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

/** Gallery entries are asset URLs; tolerate an object shape in case the sync changes. */
function toImageUrl(entry: unknown): string | null {
  if (typeof entry === 'string') return entry;
  if (entry && typeof entry === 'object') {
    const value = (entry as { url?: unknown }).url;
    if (typeof value === 'string') return value;
  }
  return null;
}

function toPlace(row: PlaceRow): Place {
  const category = row.categories?.[0] ?? null;

  /* Hero first, then the gallery, deduped. The hero is never inside the gallery today —
     measured across every place that has both — but deduping costs nothing and stops a
     future sync change from showing the same photograph twice. */
  const images: string[] = [];
  const seen = new Set<string>();
  for (const candidate of [row.hero_image_url, ...(row.gallery ?? []).map(toImageUrl)]) {
    if (typeof candidate === 'string' && candidate && !seen.has(candidate)) {
      seen.add(candidate);
      images.push(candidate);
    }
  }

  return {
    id: row.id,
    slug: row.slug,
    name: row.name ?? row.slug,
    short: row.short,
    /* Only `paragraph` blocks exist today and none carries inline HTML, so the text is
       taken as text. Any future block type is skipped rather than rendered wrongly. */
    description: (row.description?.blocks ?? [])
      .filter((block) => block?.type === 'paragraph')
      .map((block) => block?.data?.text ?? '')
      .filter((text) => text.trim().length > 0),
    heroUrl: row.hero_image_url,
    images,
    hasTour: row.virtual_tour != null,
    prominence: row.prominence,
    visitDurationMinutes: row.visit_duration_minutes,
    regionSlug: row.destination?.slug ?? null,
    regionName: row.destination?.name ?? {},
    categorySlug: category?.slug ?? null,
    categoryName: category?.name ?? {},
    categoryIcon: category?.icon ?? null,
    plannable: row.plannable === true,
    badges: (row.badges ?? []).map((b) => ({
      slug: b.slug,
      name: b.name,
      icon: b.icon,
      color: b.color,
    })),
  };
}

/** Pick a localised name, falling back to English then to nothing. */
export function localised(name: LocalisedName, lang: LanguageCode): string {
  return name[lang] ?? name.en ?? '';
}
