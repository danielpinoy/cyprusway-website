import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';

import { App } from './App';
import { en, translate } from './i18n/dictionary';
import { fetchPlaces, localised, type Place } from './lib/places';
import { setSeed } from './lib/prerenderSeed';
import { NOT_FOUND_META, PRERENDER_PATHS, ROUTE_META, SITE_ORIGIN } from './routes/routes';

/**
 * The prerender entry. Built with `vite build --ssr` and consumed by
 * scripts/prerender.mjs, which injects the result into the client build's index.html.
 *
 * English only, deliberately: today's five languages are already invisible to search
 * engines — one URL per page, text swapped by JS — so prerendering English is parity.
 * Per-language URLs are a separate decision (plan Q1).
 *
 * The Supabase URL and anon key are inlined into this bundle by Vite exactly as they are
 * into the client one, so the prerender pass can read the catalogue with the same query
 * the browser uses — one implementation of the projection and the row mapping, not two.
 */
export function render(
  url: string,
  /** Rows this page is rendered with, and which the client will hydrate against. */
  seed?: readonly Place[] | null,
): { html: string; title: string; description: string } {
  setSeed(seed ?? null);
  try {
    const html = renderToString(
      <StaticRouter location={url}>
        <App />
      </StaticRouter>,
    );

    const meta = ROUTE_META[url] ?? NOT_FOUND_META;

    return {
      html,
      title: en[meta.titleKey],
      description: en[meta.descKey],
    };
  } finally {
    setSeed(null);
  }
}

/** Title and description for one place page, from the place itself. */
export function placeMeta(place: Place): { title: string; description: string } {
  const region = localised(place.regionName, 'en');
  const short = place.short?.trim();

  return {
    title: translate(en, 'ui_meta_place_title', { name: place.name }),
    description:
      short && short.length > 0
        ? short
        : region
          ? translate(en, 'ui_meta_place_desc', { name: place.name, region })
          : translate(en, 'ui_meta_place_desc_any', { name: place.name }),
  };
}

export { fetchPlaces, PRERENDER_PATHS, ROUTE_META, SITE_ORIGIN };
