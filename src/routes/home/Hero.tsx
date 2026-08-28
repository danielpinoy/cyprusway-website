import { useState, type FormEvent } from 'react';
import { Compass, Search, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router';

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
 * Explore is a real link now that the browse grid exists, and the ask box is a real
 * input now that Ask Pete has a screen — it hands the question straight to Pete. My
 * CyprusWay still names a surface with no page behind it, so it stays a labelled,
 * non-interactive card.
 */
export function Hero() {
  const t = useT();
  const navigate = useNavigate();
  const [question, setQuestion] = useState('');

  /**
   * The question travels in ROUTER STATE, not a query parameter.
   *
   * `/ask-pete` is prerendered as one file, so a `?q=` would be read during the first
   * client render and disagree with markup that never had it — the hydration hazard
   * that left phase 3's Explore chips permanently wrong. Router state lives outside the
   * URL, so it cannot produce that class of bug, and it cannot produce a shareable link
   * that half-works either.
   */
  function ask(event: FormEvent) {
    event.preventDefault();
    const trimmed = question.trim();
    navigate('/ask-pete', trimmed ? { state: { question: trimmed } } : undefined);
  }

  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <h1 className={styles.title}>{t('onb_signup_title')}</h1>
        <p className={styles.sub}>{t('ui_hero_sub')}</p>

        <form className={styles.ask} onSubmit={ask}>
          <input
            type="text"
            className={styles.askInput}
            placeholder={t('ui_hero_ask_placeholder')}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            aria-label={t('ui_hero_ask_placeholder')}
          />
          <button type="submit" className={styles.askSubmit} aria-label={t('ui_pete_send')}>
            <Icon as={Search} size={20} className={styles.askIcon} />
          </button>
        </form>

        <ul className={styles.options}>
          <li>
            <Link to="/explore" className={`${styles.option} ${styles.optionLink}`}>
              <Icon as={Compass} size={24} className={styles.optionIcon} />
              <div>
                <p className={styles.optionTitle}>{t('ui_hero_explore_title')}</p>
                <p className={styles.optionDesc}>{t('ui_hero_explore_desc')}</p>
              </div>
            </Link>
          </li>
          <li className={`${styles.option} ${styles.optionPending}`}>
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
