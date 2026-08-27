import { LEGACY_REDIRECTS } from './routes/routes';

/**
 * The Cloudflare Worker in front of the static assets.
 *
 * Static assets are matched first, so every prerendered page is served directly and
 * this only runs for what they do not match. It does two things:
 *
 *  1. 301s the vanilla site's `.html` URLs to their clean equivalents, so existing
 *     inbound links and the old sitemap keep working with one canonical URL per page.
 *     Done here rather than in `public/_redirects` because a Worker is needed anyway
 *     for (2), and one mechanism cannot drift from the other.
 *
 *  2. Returns a real 404. `not_found_handling: "single-page-application"` would answer
 *     200 with the SPA shell for every unknown path — a soft 404, and a regression on
 *     the live site, which 404s today. Every phase-1 route is prerendered, so there are
 *     no client-only paths that need an SPA fallback.
 */

interface Env {
  ASSETS: { fetch: (request: Request | URL) => Promise<Response> };
}

function normalise(pathname: string): string {
  /* Match `/privacy.html` and `/PRIVACY.HTML` alike, and tolerate a trailing slash. */
  const lower = pathname.toLowerCase();
  return lower.length > 1 && lower.endsWith('/') ? lower.slice(0, -1) : lower;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const target = LEGACY_REDIRECTS[normalise(url.pathname)];

    if (target) {
      const destination = new URL(target, url.origin);
      destination.search = url.search;
      return Response.redirect(destination.toString(), 301);
    }

    /* Nothing matched an asset and nothing is a legacy URL: serve the prerendered 404
       body with a 404 status. */
    const notFound = await env.ASSETS.fetch(new URL('/404', url.origin));

    return new Response(notFound.body, {
      status: 404,
      headers: {
        'content-type': notFound.headers.get('content-type') ?? 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  },
};
