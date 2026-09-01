import { LEGACY_REDIRECTS, PLACE_PATH_PREFIX, TRIP_PATH_PREFIX } from './routes/routes';

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
 *  2. Serves the SPA shell for `/place/*` and `/trip/*`. Every published place is
 *     prerendered, so the place prefix runs for exactly two cases: a place published in
 *     Directus since the last deploy, which renders client-side rather than 404ing until
 *     someone redeploys, and a slug that does not exist, which renders the page's own
 *     not-found view. The second is a soft 404 — a 200 for a page that is not there — and
 *     it is the price of the first. **So an HTTP 200 on `/place/<slug>` is not proof the
 *     place exists**; the prerendered pages carry their own titles and the shell carries
 *     the site default, which is how to tell them apart from outside. The not-found view
 *     sets `<meta name="robots" content="noindex">` so it cannot be indexed, and the 181
 *     real slugs return prerendered 200s.
 *
 *     `/trip/*` is here for a different reason and is never prerendered: a trip is one
 *     person's itinerary behind their session, a file per trip would be a file per private
 *     document, and the page sets `noindex` unconditionally rather than only on its
 *     not-found branch. (This header said "and only for `/place/*`" until 1 Sep 2026; the
 *     trip prefix has been in the code below the whole time — see `routes.ts`, which
 *     documented it correctly.)
 *
 *     The alternative was a generated slug manifest checked here, which gives real 404s
 *     but leaves a just-published place broken until the next deploy. A shared link to a
 *     new place matters more than the status code of a typo.
 *
 *  3. Returns a real 404 for everything else. `not_found_handling:
 *     "single-page-application"` would answer 200 with the SPA shell for every unknown
 *     path — a soft 404 across the whole site, and a regression on the live site, which
 *     404s today. Scoping the fallback to one prefix keeps that property everywhere else.
 */

interface Env {
  ASSETS: { fetch: (request: Request | URL) => Promise<Response> };
}

/* The slice of the Workers runtime this file uses, declared rather than pulled in from
   @cloudflare/workers-types: three methods on one class is a smaller surface than a
   dependency, and phase 1 hand-declared `Env.ASSETS` for the same reason. */
interface RewriterElement {
  setInnerContent(content: string, options?: { html: boolean }): void;
  append(content: string, options?: { html: boolean }): void;
  remove(): void;
}
interface Rewriter {
  on(selector: string, handlers: { element: (element: RewriterElement) => void }): Rewriter;
  transform(response: Response): Response;
}
declare const HTMLRewriter: { new (): Rewriter };

function normalise(pathname: string): string {
  /* Match `/privacy.html` and `/PRIVACY.HTML` alike, and tolerate a trailing slash. */
  const lower = pathname.toLowerCase();
  return lower.length > 1 && lower.endsWith('/') ? lower.slice(0, -1) : lower;
}

/**
 * The SPA shell for a `/place/<slug>` the asset layer does not have.
 *
 * Built from the prerendered homepage, because that is the one file guaranteed to carry
 * the current build's script and style tags — a hand-written shell would drift from them
 * the first time Vite changed a hash. Three things have to come off it first:
 *
 *  - **`#root` is emptied.** main.tsx hydrates when `#root` has children and mounts fresh
 *    when it does not. Left as it is, the browser would hydrate homepage markup on a place
 *    URL: a mismatch React resolves by discarding the whole tree and rendering again, after
 *    a visible flash of the homepage.
 *  - **The canonical is removed.** It points at `/`, and a place URL declaring the homepage
 *    canonical is worse than declaring none.
 *  - **`noindex` is added.** This response is a 200 for a page that may not exist. The real
 *    181 slugs are prerendered and indexable; anything reaching here is either a typo or a
 *    place published since the last deploy, and the second becomes indexable when it is
 *    prerendered rather than as an empty body a crawler cannot read.
 */
function placeShell(shell: Response): Response {
  const response = new Response(shell.body, {
    status: 200,
    headers: {
      'content-type': shell.headers.get('content-type') ?? 'text/html; charset=utf-8',
      /* Not cached: the next deploy prerenders this slug, and a cached shell would keep
         being served in place of the real page. */
      'cache-control': 'no-store',
    },
  });

  return new HTMLRewriter()
    .on('#root', {
      element(element) {
        element.setInnerContent('');
      },
    })
    .on('link[rel="canonical"]', {
      element(element) {
        element.remove();
      },
    })
    .on('head', {
      element(element) {
        element.append('<meta name="robots" content="noindex" />', { html: true });
      },
    })
    .transform(response);
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

    if (
      url.pathname.toLowerCase().startsWith(PLACE_PATH_PREFIX) ||
      url.pathname.toLowerCase().startsWith(TRIP_PATH_PREFIX)
    ) {
      return placeShell(await env.ASSETS.fetch(new URL('/', url.origin)));
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
