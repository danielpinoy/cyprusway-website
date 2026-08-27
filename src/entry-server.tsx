import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';

import { App } from './App';
import { en } from './i18n/dictionary';
import { NOT_FOUND_META, PRERENDER_PATHS, ROUTE_META, SITE_ORIGIN } from './routes/routes';

/**
 * The prerender entry. Built with `vite build --ssr` and consumed by
 * scripts/prerender.mjs, which injects the result into the client build's index.html.
 *
 * English only, deliberately: today's five languages are already invisible to search
 * engines — one URL per page, text swapped by JS — so prerendering English is parity.
 * Per-language URLs are a separate decision (plan Q1).
 */
export function render(url: string): { html: string; title: string; description: string } {
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
}

export { PRERENDER_PATHS, ROUTE_META, SITE_ORIGIN };
