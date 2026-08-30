import { Link } from 'react-router';
import { CalendarRange, FileDown, MessageCircleQuestion, Sparkles } from 'lucide-react';

import { Icon } from '../../components/ui/Icon';
import { useI18n } from '../../i18n/I18nProvider';
import styles from './PremiumNeeded.module.css';

/**
 * What a free account sees instead of the wizard — which on this site is almost everyone.
 *
 * 25 accounts exist and one is premium. `trip-generate` reads `users.is_premium` at
 * `index.ts:1555` and returns `403 {"error":"premium_required"}` with nothing else, and
 * the gate runs BEFORE the quota, so a refused caller is charged nothing. **This is the
 * common path, so it is a page rather than an error state**, and the heading says what the
 * feature is rather than what the reader lacks.
 *
 * THERE IS NO BUTTON, AND THAT IS THE POINT. `stripeEnabled` is false,
 * `create-checkout-session` still returns buyers to two pages phase 1 deleted, and this
 * site has no premium route. A call to action here would be a dead gold button on the one
 * screen where somebody has just been told no — the same reasoning that removed
 * "Unlock Unlimited" in phase 4 rather than disabling it. What it offers instead is the
 * thing that does work: the manual builder, free and unlimited, ending in the same editor.
 *
 * AND NONE OF THE PAYWALL FRAME'S COPY. `3603-17982` makes four claims and all four are
 * false — zero 360° tours exist, the catalogue is 181/146/37 rather than 87/37, the
 * product is one-time rather than monthly, and "about ten seconds" is under half the
 * measured median. The three benefits below are what premium measurably unlocks. No price
 * appears: nothing on this site can charge one, and quoting a price the reader cannot be
 * charged is the same error as the other four. See docs/PARKED.md.
 */
export function PremiumNeeded() {
  const { t } = useI18n();

  const benefits = [
    { icon: CalendarRange, title: 'ui_plan_premium_gen', body: 'ui_plan_premium_gen_body' },
    { icon: FileDown, title: 'ui_plan_premium_pdf', body: 'ui_plan_premium_pdf_body' },
    {
      icon: MessageCircleQuestion,
      title: 'ui_plan_premium_pete',
      body: 'ui_plan_premium_pete_body',
    },
  ] as const;

  return (
    <section className={styles.card}>
      <span className={styles.mark} aria-hidden="true">
        <Icon as={Sparkles} size={24} />
      </span>
      <h2 className={styles.title}>{t('ui_plan_premium_title')}</h2>
      <p className={styles.body}>{t('ui_plan_premium_body')}</p>

      <p className={styles.lead}>{t('ui_plan_premium_lead')}</p>
      <ul className={styles.benefits}>
        {benefits.map((benefit) => (
          <li key={benefit.title} className={styles.benefit}>
            <span className={styles.benefitMark} aria-hidden="true">
              <Icon as={benefit.icon} size={20} />
            </span>
            <span className={styles.benefitText}>
              <span className={styles.benefitTitle}>{t(benefit.title)}</span>
              <span className={styles.benefitBody}>{t(benefit.body)}</span>
            </span>
          </li>
        ))}
      </ul>

      <p className={styles.note}>{t('ui_plan_premium_note')}</p>

      <div className={styles.alt}>
        <p className={styles.altBody}>{t('ui_plan_premium_alt_body')}</p>
        <Link className={styles.altLink} to="/build-trip">
          {t('ui_plan_premium_alt')}
        </Link>
      </div>
    </section>
  );
}
