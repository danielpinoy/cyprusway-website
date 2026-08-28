import { Route, Routes } from 'react-router';

import { LayoutRoute } from './components/shell/Layout';
import { I18nProvider } from './i18n/I18nProvider';
import { SessionProvider } from './lib/SessionProvider';
import About from './routes/About';
import Faq from './routes/Faq';
import NotFound from './routes/NotFound';
import Privacy from './routes/Privacy';
import Terms from './routes/Terms';
import Home from './routes/home/Home';
import Explore from './routes/explore/Explore';
import Place from './routes/place/Place';
import AskPete from './routes/ask-pete/AskPete';

/**
 * Every route is prerendered (see scripts/prerender.mjs) — including all 181 place pages —
 * so none is lazily loaded: a dynamic import would render as a suspense fallback during the
 * prerender pass and ship an empty page.
 *
 * `/` sits outside the shared layout because its error state replaces the whole shell
 * rather than rendering inside it.
 */
export function App() {
  return (
    <I18nProvider>
      <SessionProvider>
        <Routes>
          {/* `/`, `/explore`, `/place/:slug` and `/ask-pete` bring their own Layout,
              because each has a state that replaces the whole shell — the error takeover,
              the page-level not-found, or the signed-out panel. The content routes share
              LayoutRoute. */}
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/place/:slug" element={<Place />} />
          <Route path="/ask-pete" element={<AskPete />} />
          <Route element={<LayoutRoute />}>
            <Route path="/about" element={<About />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </SessionProvider>
    </I18nProvider>
  );
}
