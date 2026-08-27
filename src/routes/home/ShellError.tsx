import { useT } from '../../i18n/I18nProvider';
import { Button } from '../../components/ui/Button';
import { Wordmark } from '../../components/ui/Wordmark';
import styles from './ShellError.module.css';

/* Q13: no support address exists. partners@cyprusway.eu is the only inbox on the site
   and stands in until one does. Still on the copy-owed list. */
const REPORT_MAILTO = 'mailto:partners@cyprusway.eu?subject=CyprusWay%20problem%20report';

/**
 * Figma node 3558-21474.
 *
 * A full-page takeover with the wordmark and nothing else — no header nav, no footer,
 * which is what the frame draws and why this replaces the shell rather than rendering
 * inside it.
 *
 * It is reached only from the home route. A failure to resolve the session or read the
 * profile row is a command-centre failure; the legal and about pages do not depend on
 * either, so they keep rendering and this never covers them.
 *
 * The copy is already neutral — "we just couldn't load it right now", never "something
 * went wrong on our end".
 */
export function ShellError({ onReload }: { onReload: () => void }) {
  const t = useT();

  return (
    <div className={styles.page}>
      <div className={styles.brand}>
        <Wordmark tone="dark" />
      </div>

      <div className={styles.content}>
        <img
          className={styles.relief}
          src="/images/cyprus-relief.webp"
          alt=""
          width={900}
          height={530}
        />

        <h1 className={styles.title}>{t('ui_error_title')}</h1>
        <p className={styles.body}>{t('ui_error_body')}</p>

        <Button variant="dark" fullWidth onClick={onReload} className={styles.reload}>
          {t('ui_error_reload')}
        </Button>

        <p className={styles.persist}>
          {t('ui_error_persist')}{' '}
          <a href={REPORT_MAILTO} className={styles.report}>
            {t('ui_error_report')}
          </a>
        </p>
      </div>
    </div>
  );
}
