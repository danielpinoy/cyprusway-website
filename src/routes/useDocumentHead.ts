import { useEffect } from 'react';
import { useLocation } from 'react-router';

import { useT } from '../i18n/I18nProvider';
import { NOT_FOUND_META, ROUTE_META } from './routes';

/**
 * Keeps <title> and the meta description in step with the route and the language.
 *
 * Prerendered pages already ship the English values in their <head>; this takes over
 * on client navigation and when the language changes. Looked up from the shared route
 * table rather than passed per page, so a new route cannot forget its metadata.
 */
export function useDocumentHead(): void {
  const { pathname } = useLocation();
  const t = useT();

  useEffect(() => {
    const meta = ROUTE_META[pathname] ?? NOT_FOUND_META;

    document.title = t(meta.titleKey);

    let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!tag) {
      tag = document.createElement('meta');
      tag.name = 'description';
      document.head.appendChild(tag);
    }
    tag.content = t(meta.descKey);
  }, [pathname, t]);
}
