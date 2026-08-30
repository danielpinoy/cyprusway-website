import {
  BookMarked,
  Compass,
  Heart,
  Home,
  LogOut,
  MapPinned,
  MessageCircleQuestion,
  Route,
  Settings,
  Sparkles,
  Ticket,
  type LucideIcon,
} from 'lucide-react';

import type { TranslationKey } from '../../i18n/dictionary';

/**
 * The navigation model, in one place.
 *
 * `to` is a real route. `pending` means the surface does not exist yet: phase 1 builds
 * the shell, not the command centre's content, and the Figma header and footer between
 * them point at roughly forty destinations that have no page behind them.
 *
 * Pending items render as text rather than links — dimmed, out of the tab order, and
 * labelled "Coming soon" for screen readers so the information the dimming carries is
 * not visual-only. A link that goes nowhere is worse than a label that says so.
 */

export interface NavItem {
  readonly id: string;
  readonly labelKey: TranslationKey;
  readonly to?: string;
  readonly pending?: true;
  /**
   * An item that opens an overlay rather than navigating.
   *
   * "My CyprusWay" is the name of a question — who are you travelling with — and of what
   * the answer changes: a rail on the homepage, a filter on Explore, the party the trip
   * planner falls back to. None of that is a page, so the item asks instead of pointing at
   * one. The precedent is the header's Sign In button, which opens the auth card through
   * `openAuth()` on the session context; this is the same mechanism one item along.
   */
  readonly action?: 'chooser';
  readonly icon?: LucideIcon;
}

/** The five items across the top of the Figma header. Explore landed in phase 3, Ask Pete
 *  in phase 4 and Build My Trip in phase 5; My CyprusWay and 360° Tours are still ahead. */
export const PRIMARY_NAV: readonly NavItem[] = [
  { id: 'explore', labelKey: 'ui_nav_explore', to: '/explore' },
  { id: 'my-cyprusway', labelKey: 'ui_nav_my_cyprusway', action: 'chooser' },
  { id: 'ask-pete', labelKey: 'nav_ap', to: '/ask-pete' },
  { id: 'tours', labelKey: 'ui_nav_tours', pending: true },
  { id: 'build-trip', labelKey: 'ui_nav_build_trip', to: '/build-trip' },
];

/** The overlay drawer, Figma node 3562-23804. */
export const MENU_NAV: readonly NavItem[] = [
  { id: 'home', labelKey: 'nav_home', to: '/', icon: Home },
  { id: 'explore', labelKey: 'ui_nav_explore', to: '/explore', icon: Compass },
  { id: 'my-cyprusway', labelKey: 'ui_nav_my_cyprusway', action: 'chooser', icon: Sparkles },
  { id: 'ask-pete', labelKey: 'nav_ap', to: '/ask-pete', icon: MessageCircleQuestion },
  /* The frame marks Book with Pete "PRO". The 14 Aug audit recorded that as inverted —
     `book-with-pete-route` is guest-reachable — so the badge is not carried. */
  { id: 'book-pete', labelKey: 'ui_menu_book_pete', pending: true, icon: BookMarked },
  { id: 'tours', labelKey: 'ui_nav_tours', pending: true, icon: MapPinned },
  { id: 'build-trip', labelKey: 'ui_nav_build_trip', to: '/build-trip', icon: Route },
  { id: 'my-trips', labelKey: 'ui_menu_my_trips', to: '/trips', icon: Ticket },
  { id: 'saved-places', labelKey: 'ui_menu_saved_places', pending: true, icon: Heart },
  { id: 'settings', labelKey: 'ui_menu_settings', pending: true, icon: Settings },
];

export const MENU_SIGNOUT: NavItem = {
  id: 'logout',
  labelKey: 'ui_menu_logout',
  icon: LogOut,
};

/** Footer "Discover" — the same five phase-2 surfaces as the header. */
export const FOOTER_DISCOVER: readonly NavItem[] = PRIMARY_NAV;

/** Footer "About" — the pages that exist, not the five the Figma invents
 *  (Our Mission, How we work, Partners, Careers, Customer Service). */
export const FOOTER_ABOUT: readonly NavItem[] = [
  { id: 'about', labelKey: 'nav_about', to: '/about' },
  { id: 'faq', labelKey: 'ui_footer_faq', to: '/faq' },
  { id: 'contact', labelKey: 'footer_contact', to: '/about#contact' },
];

export const FOOTER_LEGAL: readonly NavItem[] = [
  { id: 'privacy', labelKey: 'footer_privacy', to: '/privacy' },
  { id: 'terms', labelKey: 'footer_terms', to: '/terms' },
];
