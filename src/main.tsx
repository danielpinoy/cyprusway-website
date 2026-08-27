import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

/* Self-hosted rather than linked from Google Fonts: the design's 510 and 590 weights
   need a variable font, and hotlinking Google Fonts from an EU-facing site is a live
   GDPR question on a site that already ships a cookie banner. */
import '@fontsource-variable/inter';

import './styles/tokens.css';
import './styles/reset.css';
import './styles/global.css';

import { App } from './App';

const container = document.getElementById('root');
if (!container) throw new Error('#root is missing from index.html');

const tree = (
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

/* Prerendered pages arrive with markup in #root and are hydrated; anything else — a
   dev server render, or a page the prerender pass did not cover — mounts fresh. */
if (container.hasChildNodes()) {
  hydrateRoot(container, tree);
} else {
  createRoot(container).render(tree);
}
