import { Link } from 'react-router';

import { useT } from '../i18n/I18nProvider';
import { ContentPage } from './ContentPage';
import styles from './NotFound.module.css';

/** Copy carried from the page this replaces, 404.html. The Worker returns a real 404
 *  status with this body rather than the SPA fallback's 200. */
export default function NotFound() {
  const t = useT();

  return (
    <ContentPage>
      <div className={styles.wrap}>
        <p className={styles.code}>{t('ui_404_code')}</p>
        <h1 className={styles.title}>{t('ui_404_title')}</h1>
        <p className={styles.body}>{t('ui_404_body')}</p>
        <Link to="/" className={styles.home}>
          {t('ui_404_home')}
        </Link>
      </div>
    </ContentPage>
  );
}
