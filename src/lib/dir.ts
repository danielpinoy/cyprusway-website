import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  CornerDownLeft,
  LogOut,
  type LucideIcon,
} from 'lucide-react';

/**
 * Which glyphs mirror under RTL, decided once and written down.
 *
 * Direction-aware icon handling is one of the three things that make adding Hebrew a
 * language file rather than a rewrite (the other two being logical CSS properties and
 * `dir` as data — see src/i18n/languages.ts). Without an explicit list somebody
 * eventually mirrors a magnifying glass, or leaves a "next" chevron pointing the wrong
 * way in a language nobody on the team reads.
 *
 * The rule: a glyph mirrors if its meaning is "forward/back/onward in reading order".
 * It does not mirror if it depicts a physical object, a brand, or a fixed-orientation
 * concept — a search lens, a heart, a clock, a play triangle, a map pin.
 */
const MIRRORED: ReadonlySet<LucideIcon> = new Set<LucideIcon>([
  ChevronRight, // rail "next", list disclosure
  ChevronLeft, // rail "previous"
  ArrowRight, // banner card "continue"
  ArrowLeft,
  ArrowUpRight, // recommendation card's open-in badge
  CornerDownLeft,
  LogOut, // depicts a door and a direction of travel out of it
]);

export function isMirroredGlyph(icon: LucideIcon): boolean {
  return MIRRORED.has(icon);
}

/**
 * Horizontal scrolling that behaves the same in both directions.
 *
 * `element.scrollLeft` is signed inconsistently across engines under RTL, which is the
 * classic way a carousel ends up scrolling backwards in one language. `scrollBy` takes
 * a logical-relative delta and is direction-aware everywhere, so rails use this and
 * never do `scrollLeft` arithmetic. Phase 2 inherits the rule rather than rediscovering it.
 */
export function scrollByInline(element: HTMLElement, distance: number): void {
  element.scrollBy({ left: distance, behavior: 'smooth' });
}
