import { useT } from '../../i18n/I18nProvider';
import styles from './prose.module.css';

/**
 * The one content page that is translated — 37 `data-i18n` keys on `about.html` — so
 * it is built against the dictionary rather than ported as English HTML like the other
 * three. Nine keys carry the prose; the rest of the old page's keys belonged to the
 * header and footer, which are now the shell's job.
 */
export function AboutContent() {
  const t = useT();

  return (
    <div className={styles.prose}>
      <h1>{t('about_hero_title')}</h1>
      <p>{t('about_hero_sub')}</p>

      {/* `ui_about_intro`, not the ported `about_p1`: that paragraph listed "immersive
          360° virtual tours" among what the product brings together, and there are none.
          One deletion; the rest of the paragraph is verbatim. */}
      <p>{t('ui_about_intro')}</p>
      <p>{t('about_p2')}</p>
      {/* This key carries a <strong> in all five languages — it was the vanilla
          dictionary's one data-i18n-html entry. The content is our own translation
          data, not user input. */}
      <p dangerouslySetInnerHTML={{ __html: t('about_p3') }} />

      <h2>{t('about_heading_covers')}</h2>
      <p>{t('about_covers_p1')}</p>
      <p>{t('about_covers_p2')}</p>

      <h2 id="contact">{t('about_contact')}</h2>
      <div className={styles.contactCard}>
        <p>
          <strong>Email:</strong>{' '}
          <a href="mailto:partners@cyprusway.eu">partners@cyprusway.eu</a>
        </p>
        <p>
          <strong>Company:</strong> Almisource LTD
        </p>
        <p className={styles.contactNote}>{t('about_contact_text')}</p>
      </div>
    </div>
  );
}
