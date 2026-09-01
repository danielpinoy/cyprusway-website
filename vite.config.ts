import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

import { catalogueRequest } from './src/lib/catalogueQuery';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      {
        /* Every page fetches the catalogue before it can render a card, and before this
           tag existed the fetch could not start until hydration reached it — 319 ms on a
           fast desktop, 1750 ms on throttled mobile (docs/PERF-MEASUREMENT-2026-08-30.md).
           The preload starts it while the JS is still downloading. The href comes from
           the same function fetchPlaces() calls, so the two cannot drift apart — Chrome
           only serves the preload if URL and credentials mode match exactly (hence
           `crossorigin`: fetch() runs in CORS mode with same-origin credentials).
           The tag lands in dist/index.html, which the prerender pass uses as the
           template for all 192 pages. Skipped, like the build itself would be, if the
           env is missing — check-env fails the build first. */
        name: 'cw-catalogue-preload',
        transformIndexHtml() {
          if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) return [];
          return [
            {
              tag: 'link',
              attrs: {
                rel: 'preload',
                as: 'fetch',
                href: catalogueRequest(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY),
                crossorigin: true,
              },
              injectTo: 'head',
            },
          ];
        },
      },
      {
        /* Strip the dev-only lines from index.html's inline direction script.
           `import.meta.env.DEV` does not reach a plain inline <script>, so the guard the
           rest of the repo uses is unavailable there and the `?dir=` override shipped to
           production — flipping the live document's direction while the dictionary,
           whose override IS stripped (I18nProvider), stayed put.

           Build-only (`apply: 'build'`), so `npm run dev` keeps the affordance. Removes
           whole lines ending in the marker, and THROWS if it removes none: a silent
           no-op here would put the flag back in production exactly as before, which is
           the failure this plugin exists to end. Same rule as the prerender's
           "nothing was substituted" throw. */
        name: 'cw-strip-dev-only',
        apply: 'build',
        transformIndexHtml(html: string) {
          const devOnly = /^[^\n]*\/\* cw:dev-only \*\/[^\n]*\n/gm;
          const stripped = html.replace(devOnly, '');
          if (stripped === html) {
            throw new Error(
              'cw-strip-dev-only: no `/* cw:dev-only */` lines found in index.html. ' +
                'The marker was renamed or removed — the ?dir= override would ship to ' +
                'production. Restore the marker or delete this plugin deliberately.',
            );
          }
          return stripped;
        },
      },
    ],
    css: {
      modules: {
        /* Pinned rather than left to the default so the client build and the SSR build
           used by the prerender pass produce identical class names. A mismatch there
           would surface as a hydration diff on every styled element. */
        generateScopedName: '[name]_[local]_[hash:base64:5]',
      },
    },
    build: {
      target: 'es2022',
      /* One stylesheet, referenced from the prerendered <head>, so prerendered pages
         paint styled without waiting for a JS chunk to resolve its CSS import. */
      cssCodeSplit: false,
    },
  };
});
