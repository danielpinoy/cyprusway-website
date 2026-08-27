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
 * Scroll a rail **in reading order**: a positive distance always means "further along",
 * in both directions.
 *
 * `ScrollToOptions.left` is a PHYSICAL x delta, not a logical one. Phase 1 wrote this
 * helper assuming otherwise — the comment claimed `scrollBy` was direction-aware — and it
 * was wrong, which only surfaced when phase 2 gave it a rail to scroll.
 *
 * Measured in Chrome, in an isolated RTL scroller with a range of -632..0:
 *
 *     at scrollLeft 0 (the start)   scrollBy({left: +100}) -> 0     (clamped, no movement)
 *                                   scrollBy({left: -100}) -> -100  (moves forward)
 *
 * So under RTL `scrollLeft` runs from `-(scrollWidth - clientWidth)` at the far end to `0`
 * at the start, and moving forward means decreasing it. Never read or write `scrollLeft`
 * directly either — its sign convention differs across engines.
 *
 * `direction` is read from the element rather than the document so a rail inside a
 * locally-reversed subtree still behaves.
 */
export function scrollByInline(element: HTMLElement, distance: number): void {
  const rtl = getComputedStyle(element).direction === 'rtl';
  element.scrollBy({ left: rtl ? -distance : distance, behavior: 'smooth' });
}
