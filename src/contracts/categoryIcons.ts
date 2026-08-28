import {
  Amphora,
  Building2,
  Castle,
  Church,
  FerrisWheel,
  Home,
  Landmark,
  MapPin,
  Martini,
  Music,
  PawPrint,
  ScrollText,
  Telescope,
  TentTree,
  ToyBrick,
  TreePalm,
  TreePine,
  Trees,
  Utensils,
  Waves,
  type LucideIcon,
} from 'lucide-react';

/**
 * Category slug → glyph.
 *
 * **Ported from the app's `src/lib/categoryIcons.ts`, unchanged except the import.** Same
 * slugs, same glyph for each — so a category shows the same icon on both surfaces, and if
 * the mapping is ever revised it is revised once in each client rather than diverging by
 * taste. This is the third thing phase 2 and 3 chose to port rather than re-derive, after
 * the Directus image helper and the trip day-of-N computation.
 *
 * Keyed on `slug`, NOT on the CMS's `categories[].icon`. That field holds Google Material
 * Symbols names — `beach_access`, `account_balance`, `nature_people` — which is a different
 * icon set from the Lucide glyphs this repo draws everywhere, and honouring it would mean
 * shipping a second icon font for 18 glyphs. It is also free text: a plain input in Directus
 * with nothing enforcing the vocabulary, while `slug` is stable and unique. The CMS name is
 * noted per row so a designer can audit the pairing.
 *
 * All 19 category slugs are covered, including `architecture`, which has 0 places today.
 * An unknown slug — a category added in Directus tomorrow — falls back to MapPin, so a new
 * category renders something rather than nothing.
 */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'archaeological-sites': Amphora, // CMS: landmark
  'monasteries-churches': Church, // CMS: church
  museums: Landmark, // CMS: museum
  beaches: TreePalm, // CMS: beach_access
  'viewpoints-landmarks': Telescope, // CMS: visibility
  villages: Home, // CMS: home
  'nature-trails': TreePine, // CMS: park
  'castles-fortifications': Castle, // CMS: fort
  'historical-sites': ScrollText, // CMS: account_balance
  architecture: Building2, // CMS: apartment (0 places today)
  tavernas: Utensils, // CMS: restaurant
  waterparks: Waves, // CMS: water
  'animal-parks': PawPrint, // CMS: pets
  'amusement-parks': FerrisWheel, // CMS: attractions
  'adventure-parks': TentTree, // CMS: forest
  'parks-playgrounds': Trees, // CMS: nature_people
  'indoor-playgrounds': ToyBrick, // CMS: toys
  bars: Martini, // CMS: local_bar
  nightlife: Music, // CMS: nightlife
};

export function categoryIcon(slug: string | null): LucideIcon {
  return (slug && CATEGORY_ICONS[slug]) || MapPin;
}
