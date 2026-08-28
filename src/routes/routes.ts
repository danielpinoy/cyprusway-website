import type { TranslationKey } from '../i18n/dictionary';

/**
 * The route table, shared by the router, the prerender pass and the sitemap.
 *
 * One table so the three cannot disagree: a page that exists but is not prerendered
 * would ship as an empty div, and a sitemap entry for a page that does not exist is a
 * crawl error. Both are the kind of drift this project keeps paying for.
 */

export interface RouteMeta {
  readonly titleKey: TranslationKey;
  readonly descKey: TranslationKey;
  /** Prerendered, but kept out of sitemap.xml. */
  readonly noIndex?: true;
  readonly changefreq?: string;
  readonly priority?: string;
}

export const ROUTE_META: Readonly<Record<string, RouteMeta>> = {
  '/': {
    titleKey: 'ui_meta_home_title',
    descKey: 'ui_meta_home_desc',
    changefreq: 'weekly',
    priority: '1.0',
  },
  '/explore': {
    titleKey: 'ui_meta_explore_title',
    descKey: 'ui_meta_explore_desc',
    changefreq: 'weekly',
    priority: '0.9',
  },
  '/ask-pete': {
    titleKey: 'ui_meta_askpete_title',
    descKey: 'ui_meta_askpete_desc',
    changefreq: 'monthly',
    priority: '0.8',
  },
  '/about': {
    titleKey: 'ui_meta_about_title',
    descKey: 'ui_meta_about_desc',
    changefreq: 'monthly',
    priority: '0.6',
  },
  '/faq': {
    titleKey: 'ui_meta_faq_title',
    descKey: 'ui_meta_faq_desc',
    changefreq: 'monthly',
    priority: '0.5',
  },
  '/privacy': {
    titleKey: 'ui_meta_privacy_title',
    descKey: 'ui_meta_privacy_desc',
    changefreq: 'yearly',
    priority: '0.4',
  },
  '/terms': {
    titleKey: 'ui_meta_terms_title',
    descKey: 'ui_meta_terms_desc',
    changefreq: 'yearly',
    priority: '0.4',
  },
  '/404': {
    titleKey: 'ui_meta_404_title',
    descKey: 'ui_meta_404_desc',
    noIndex: true,
  },
};

export const NOT_FOUND_META = ROUTE_META['/404'] as RouteMeta;

/** Every path the prerender pass renders to a real HTML file. */
export const PRERENDER_PATHS: readonly string[] = Object.keys(ROUTE_META);

export const SITE_ORIGIN = 'https://cyprusway.eu';

/**
 * Place pages are NOT in ROUTE_META: there are 181 of them and their slugs come from the
 * catalogue, not from this file. scripts/prerender.mjs fetches them at build time and emits
 * one page each; src/worker.ts serves the SPA shell for any `/place/*` that has no
 * prerendered file, so a place published since the last deploy still opens.
 */
export const PLACE_PATH_PREFIX = '/place/';

/**
 * The vanilla site's URLs. Every one 301s to its clean equivalent, from the Worker,
 * so existing inbound links and the old sitemap keep their destination.
 *
 * features.html, destinations.html, premium.html and premium-success.html are deleted
 * (plan Q2 and Q3); they redirect to the nearest surviving page rather than 404, since
 * a 301 to something relevant beats a dead end for both people and crawlers.
 */
export const LEGACY_REDIRECTS: Readonly<Record<string, string>> = {
  '/index.html': '/',
  '/about.html': '/about',
  '/faq.html': '/faq',
  '/privacy.html': '/privacy',
  '/terms.html': '/terms',
  '/404.html': '/404',
  '/features.html': '/',
  '/destinations.html': '/',
  '/premium.html': '/',
  '/premium-success.html': '/',
};
