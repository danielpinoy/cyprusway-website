import { Link } from 'react-router';
import { Sparkles } from 'lucide-react';

import { Icon } from '../../components/ui/Icon';
import { useI18n } from '../../i18n/I18nProvider';
import styles from './PlannerEntry.module.css';

/**
 * How anyone finds the planner.
 *
 * The web frame's header carries the same five items as every other frame and adds
 * nothing for the planner, so there is **no new navigation item** — the entry points are
 * this card, on `/build-trip` beside the manual builder it is the alternative to, and on
 * `/trips` where somebody is already thinking about trips.
 *
 * **This card does not mention Premium at all**, and that is a live product question rather
 * than a settled decision — see docs/PARKED.md, "The planner entry card does not say
 * Premium". Until 1 Sep 2026 this comment claimed it "says Premium in plain words rather
 * than wearing a gold badge"; the three strings it renders — `ui_plan_entry_title`,
 * `ui_plan_entry_body`, `ui_plan_entry_cta` — have never contained the word, so a free
 * account meets the gate only after following the link. The comment asserted an intention
 * as a fact and hid the question for as long as it stood.
 *
 * The reasoning that IS settled: no gold badge, because nobody can buy Premium here and a
 * badge would be decoration on a door that does not open. The page behind the link explains
 * the gate properly. Whether the card should say so up front is the owner's to rule on;
 * behaviour is unchanged pending that.
 */
export function PlannerEntry() {
  const { t } = useI18n();
  return (
    <section className={styles.card}>
      <span className={styles.mark} aria-hidden="true">
        <Icon as={Sparkles} size={24} />
      </span>
      <div className={styles.copy}>
        <p className={styles.title}>{t('ui_plan_entry_title')}</p>
        <p className={styles.body}>{t('ui_plan_entry_body')}</p>
      </div>
      <Link className={styles.link} to="/plan-trip">
        {t('ui_plan_entry_cta')}
      </Link>
    </section>
  );
}
