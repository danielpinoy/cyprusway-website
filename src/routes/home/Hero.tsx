import { Compass, Search, Sparkles } from 'lucide-react';

import { useT } from '../../i18n/I18nProvider';
import { Icon } from '../../components/ui/Icon';
import styles from './Hero.module.css';

/**
 * The hero from Figma node 3370-7099.
 *
 * Single column, not the frame's two. The right-hand column is a banner carousel of
 * 360° tours, and `virtual_tour` is null on 181 of 181 published places — there is
 * nothing to put in it. A placeholder card would claim content that does not exist, and
 * an empty right column would read as broken, so the hero column is centred instead.
 * The carousel returns in phase 2 with the rows behind it.
 *
 * The Ask Pete input renders disabled.
 * TODO(contracts): Ask Pete on web needs the `mike` request/response contract, the SSE
 * envelope shapes, and a ruling on the shared per-uid thread and daily cap.
 *
 * Both option cards name phase-2 surfaces, so they render as labelled, non-interactive
 * cards rather than as links to nothing.
 */
export function Hero() {
  const t = useT();

  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <h1 className={styles.title}>{t('onb_signup_title')}</h1>
        <p className={styles.sub}>{t('ui_hero_sub')}</p>

        <div className={styles.ask}>
          <input
            type="text"
            className={styles.askInput}
            placeholder={t('ui_hero_ask_placeholder')}
            disabled
            aria-label={`${t('ui_hero_ask_placeholder')} — ${t('ui_hero_ask_unavailable')}`}
          />
          <Icon as={Search} size={20} className={styles.askIcon} />
        </div>

        <ul className={styles.options}>
          <li className={styles.option}>
            <Icon as={Compass} size={24} className={styles.optionIcon} />
            <div>
              <p className={styles.optionTitle}>
                {t('ui_hero_explore_title')}
                <span className="cw-visually-hidden">{` — ${t('ui_coming_soon')}`}</span>
              </p>
              <p className={styles.optionDesc}>{t('ui_hero_explore_desc')}</p>
            </div>
          </li>
          <li className={styles.option}>
            <Icon as={Sparkles} size={24} className={styles.optionIcon} />
            <div>
              <p className={styles.optionTitle}>
                {t('ui_hero_my_title')}
                <span className="cw-visually-hidden">{` — ${t('ui_coming_soon')}`}</span>
              </p>
              <p className={styles.optionDesc}>{t('ui_hero_my_desc')}</p>
            </div>
          </li>
        </ul>
      </div>
    </section>
  );
}
