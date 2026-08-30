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
 * It says Premium in plain words rather than wearing a gold badge. Nobody can buy it here,
 * so a badge would be decoration on a door that does not open; a sentence at least
 * explains itself, and the page behind the link explains it properly.
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
