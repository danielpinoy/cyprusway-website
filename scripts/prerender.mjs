/**
 * Render every route to a real HTML file.
 *
 * Why this exists at all: a plain SPA serves an empty <div id="root"> to anything that
 * does not run JavaScript. For `/` that is an SEO regression against the static site it
 * replaces; for `/privacy` and `/terms` it is worse than an SEO question, because the
 * readers that matter for those pages — the CJ publisher review, the Google and Apple
 * OAuth consent configurations, app-store listings — are exactly the ones least likely
 * to execute a bundle.
 *
 * No plugin and no new dependency: `react-dom/server` and Vite's `--ssr` build are
 * already present. The cost is this file, src/entry-server.tsx, and a second build pass.
 *
 * Two kinds of page come out of it:
 *
 *  - **The static routes** in ROUTE_META, rendered with no data. Their skeletons are the
 *    honest prerender: the homepage rails depend on the visitor's interests and session
 *    seed, and Explore is served from one file for `/explore` and `/explore?region=paphos`
 *    alike, so a seeded grid would hydrate the unfiltered list against a filtered one.
 *  - **One page per published place**, each rendered with its own row in hand and shipping
 *    that row as JSON for the client to hydrate against. This is the site's only substantial
 *    indexable content, and it is the whole reason the catalogue is fetched here.
 *
 * If the catalogue cannot be read the build does not fail: the static routes are written,
 * the place pages are skipped, and the Worker's SPA fallback renders them client-side. That
 * is a degraded deploy, so it is logged loudly rather than passed over.
 *
 * Run by `npm run build`, after build:client and build:server.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const NL = String.fromCharCode(10);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(ROOT, 'dist');
const SSR_ENTRY = pathToFileURL(resolve(ROOT, 'dist-ssr/entry-server.js')).href;

const { render, placeMeta, fetchPlaces, PRERENDER_PATHS, ROUTE_META, SITE_ORIGIN } =
  await import(SSR_ENTRY);

/* Read the client build's index.html once, before anything overwrites it. */
const template = readFileSync(join(DIST, 'index.html'), 'utf8');

function escapeAttribute(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeText(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** JSON for a <script type="application/json"> body. `<` is the only character that can end
 *  the element early; escaped it stays valid JSON and parses back identically. */
function escapeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

/** Where a path's HTML file goes. Directory form throughout, so no `<name>.html` asset
 *  exists — that keeps `/privacy.html` unmatched by the asset layer and lets the Worker
 *  own its 301 to `/privacy`. */
function outputFile(path) {
  if (path === '/') return join(DIST, 'index.html');
  return join(DIST, path.replace(/^\//, ''), 'index.html');
}

/**
 * One page, from the client build's index.html.
 *
 * Substituted rather than templated, so the client build stays the single source of the
 * script and style tags: a hand-written shell would drift from it the first time Vite
 * changed a hash.
 */
function buildPage({ path, html, title, description, seed }) {
  const root = seed
    ? `<div id="root">${html}</div>\n    <script id="cw-seed" type="application/json">${escapeJson(seed)}</script>`
    : `<div id="root">${html}</div>`;

  const page = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeText(title)}</title>`)
    .replace(
      /<meta name="description" content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${escapeAttribute(description)}" />`,
    )
    .replace(
      '<link rel="icon"',
      `<link rel="canonical" href="${escapeAttribute(SITE_ORIGIN + (path === '/' ? '/' : path))}" />\n    <link rel="icon"`,
    )
    .replace('<div id="root"></div>', root);

  if (page === template) {
    throw new Error(`prerender: nothing was substituted for ${path} — the template shape changed`);
  }

  return page;
}

/**
 * A slug is a path segment, and it comes from a CMS field an editor types into — so it is
 * checked here rather than trusted.
 *
 * Without this, a slug of `../../.env` resolves to `<root>/.env/index.html`: outside `dist`
 * entirely. It could not overwrite an existing file — `mkdirSync` throws on one — but on a
 * machine where that file happened to be absent it would create a DIRECTORY named `.env`,
 * and every tool that then tried to read or create the real one would fail in a way that
 * pointed nowhere near this script. All 181 slugs today are `[a-z0-9-]+`; that is a fact
 * about the data, not a property of the code, and this makes it the latter.
 */
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function writePage(path, page) {
  const file = outputFile(path);
  /* Belt and braces: whatever the input, the output stays under dist. */
  if (file !== DIST && !file.startsWith(DIST + sep)) {
    throw new Error(`prerender: refusing to write outside dist — ${path} -> ${file}`);
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, page, 'utf8');
  return file.slice(DIST.length + 1);
}

let written = 0;

for (const path of PRERENDER_PATHS) {
  const { html, title, description } = render(path);
  const relative = writePage(path, buildPage({ path, html, title, description }));
  written += 1;
  console.log(`  ${path.padEnd(10)} -> ${relative}`);
}

/**
 * The catalogue, for the place pages.
 *
 * A soft failure on purpose. A build that dies because Supabase was briefly unreachable
 * takes the whole site down to fix 181 pages the SPA fallback can still render; a build
 * that ships without them is worse than a full one and much better than nothing.
 */
let places = [];
try {
  places = await fetchPlaces();
  console.log(`\n  catalogue: ${places.length} published places`);
} catch (error) {
  const e = error ?? {};
  const detail = [e.code, e.message, e.details, e.hint].filter(Boolean).join(' | ');
  console.warn(
    '\n!!! prerender: the catalogue could not be read, so NO place pages were written.\n' +
      `    ${detail || String(error)}\n` +
      '    The deploy is degraded but serviceable: /place/* falls through to the SPA shell\n' +
      '    and renders client-side. sitemap.xml will not list any place.\n',
  );
}

const skipped = places.filter((place) => !SAFE_SLUG.test(place.slug ?? ''));
if (skipped.length > 0) {
  const names = skipped.map((place) => JSON.stringify(place.slug)).join(', ');
  console.warn(
    NL + '!!! prerender: ' + skipped.length + ' place(s) have a slug that is not a safe' +
      ' path segment and were NOT written: ' + names + NL +
      '    They still open through the Worker fallback, client-rendered.' +
      ' Fix the slug in Directus.' + NL,
  );
  places = places.filter((place) => SAFE_SLUG.test(place.slug ?? ''));
}

for (const place of places) {
  const path = `/place/${place.slug}`;
  const { title, description } = placeMeta(place);
  /* Rendered with, and shipped with, exactly one row: the page's own. The client hydrates
     against it and then fetches the full catalogue, which the Popular rail needs. */
  const seed = [place];
  const { html } = render(path, seed);
  writePage(path, buildPage({ path, html, title, description, seed }));
  written += 1;
}

if (places.length > 0) {
  console.log(`  /place/*   -> ${places.length} pages`);
}

/* The sitemap is generated from the same route table the router and the prerender pass
   use, so it cannot list a page that does not exist or miss one that does. */
function sitemapEntry(loc, changefreq, priority) {
  return [
    '  <url>',
    `    <loc>${escapeText(loc)}</loc>`,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n');
}

const entries = [
  ...PRERENDER_PATHS.filter((path) => !ROUTE_META[path]?.noIndex).map((path) => {
    const meta = ROUTE_META[path];
    return sitemapEntry(SITE_ORIGIN + (path === '/' ? '/' : path), meta.changefreq, meta.priority);
  }),
  /* Only places that were actually written. A sitemap entry for a page that exists solely
     through the SPA fallback would be a 200 with an empty body to a crawler that does not
     run JavaScript — the precise thing prerendering is here to avoid. */
  ...places.map((place) => sitemapEntry(`${SITE_ORIGIN}/place/${place.slug}`, 'monthly', '0.7')),
];

writeFileSync(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`,
  'utf8',
);

console.log(`\nprerendered ${written} pages, sitemap.xml lists ${entries.length}`);
