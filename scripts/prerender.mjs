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
 * Run by `npm run build`, after build:client and build:server.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(ROOT, 'dist');
const SSR_ENTRY = pathToFileURL(resolve(ROOT, 'dist-ssr/entry-server.js')).href;

const { render, PRERENDER_PATHS, ROUTE_META, SITE_ORIGIN } = await import(SSR_ENTRY);

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

/** Where a path's HTML file goes. Directory form throughout, so no `<name>.html` asset
 *  exists — that keeps `/privacy.html` unmatched by the asset layer and lets the Worker
 *  own its 301 to `/privacy`. */
function outputFile(path) {
  if (path === '/') return join(DIST, 'index.html');
  return join(DIST, path.replace(/^\//, ''), 'index.html');
}

let written = 0;

for (const path of PRERENDER_PATHS) {
  const { html, title, description } = render(path);

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
    .replace('<div id="root"></div>', `<div id="root">${html}</div>`);

  if (page === template) {
    throw new Error(`prerender: nothing was substituted for ${path} — the template shape changed`);
  }

  const file = outputFile(path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, page, 'utf8');
  written += 1;
  console.log(`  ${path.padEnd(10)} -> ${file.slice(DIST.length + 1)}`);
}

/* The sitemap is generated from the same route table the router and the prerender pass
   use, so it cannot list a page that does not exist or miss one that does. */
const urls = PRERENDER_PATHS.filter((path) => !ROUTE_META[path]?.noIndex)
  .map((path) => {
    const meta = ROUTE_META[path];
    const loc = SITE_ORIGIN + (path === '/' ? '/' : path);
    return [
      '  <url>',
      `    <loc>${loc}</loc>`,
      meta.changefreq ? `    <changefreq>${meta.changefreq}</changefreq>` : null,
      meta.priority ? `    <priority>${meta.priority}</priority>` : null,
      '  </url>',
    ]
      .filter(Boolean)
      .join('\n');
  })
  .join('\n');

writeFileSync(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
  'utf8',
);

console.log(`\nprerendered ${written} routes, sitemap.xml regenerated`);
