import { useState } from 'react';
import type { User } from '@supabase/supabase-js';

import { useI18n } from '../../i18n/I18nProvider';
import {
  TRAVELER_ICONS,
  TRAVELER_TYPES,
  travelerDescriptionKey,
  travelerLabelKey,
  type TravelerType,
} from '../../contracts/travelerPools';
import { OptionTiles } from '../../routes/plan-trip/PlannerControls';
import { saveTravelerType } from '../../lib/profile';
import { Button } from '../ui/Button';
import { ErrorBanner } from './ErrorBanner';
import styles from './TravellerScreen.module.css';

/**
 * The chooser — the only thing on this site that sets `users.traveler_type`, a column that
 * is null on 25 of 25 accounts because the question has never been put to anyone.
 *
 * **A card, not a page.** It renders inside the same `Modal` as `InterestsScreen`, so it
 * inherits the focus trap, Escape, the scroll lock and — since phase 6 — the enter and
 * exit motion, without opting into any of them. "My CyprusWay" is the name of a question
 * and its consequences (a rail on the homepage, a filter on Explore, the party the planner
 * falls back to), not of a destination; there is no route.
 *
 * **The body is the planner's step 4.** `OptionTiles` with the same four options, the same
 * icons and the same eight strings — a real `fieldset` + `legend` + `input[type=radio]`,
 * so the group is a radio group rather than four buttons, and arrow keys work because the
 * browser makes them work.
 *
 * **Signed in** writes the column and adopts the answer into the session so the rail
 * appears without a refetch. **A guest writes nothing**: an answer given before there was
 * an account is not consent to change the account, and there is no account to change. The
 * guest's choice goes to `/explore?with=…` and lives in the URL, which is also what makes
 * it shareable. Either way Continue lands on Explore, filtered.
 *
 * **Skip is "Not now"** and writes nothing. The question is an invitation: the web's
 * onboarding is one screen by phase-1 ruling, and the app's forced picker has a 0-of-25
 * answer rate, which is the best available evidence that forcing it does not work.
 */
export function TravellerScreen({
  user,
  current,
  titleId,
  onChosen,
  onSkip,
}: {
  /** Null for a guest — the card is fully usable, it just writes nothing. */
  user: User | null;
  current: TravelerType | null;
  titleId: string;
  /** Called with the choice once any write has succeeded. */
  onChosen: (type: TravelerType) => void;
  onSkip: () => void;
}) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<TravelerType | null>(current);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  async function submit() {
    if (saving || !selected) return;
    setFailed(false);

    if (!user) {
      onChosen(selected);
      return;
    }

    setSaving(true);
    try {
      await saveTravelerType(user.id, selected);
      onChosen(selected);
    } catch (error) {
      /* The card stays open with the selection intact so it can be retried — a zero-row
         update is treated as a failure, not as a silent success (`saveInterests`'s rule). */
      console.warn('[traveller] write failed:', error);
      setSaving(false);
      setFailed(true);
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <h2 id={titleId} className={styles.title}>
          {t('ui_traveller_title')}
        </h2>
        <p className={styles.subtitle}>{t('ui_traveller_sub')}</p>
      </div>

      <OptionTiles<TravelerType>
        name="cw-traveller"
        legend={t('ui_traveller_title')}
        hideLegend
        rows
        options={TRAVELER_TYPES.map((type) => ({
          value: type,
          label: t(travelerLabelKey(type)),
          description: t(travelerDescriptionKey(type)),
          icon: TRAVELER_ICONS[type],
        }))}
        value={selected}
        onChange={setSelected}
      />

      {/* Only for a signed-in visitor: a guest's choice touches no account, so promising
          that it changes the app would be false. */}
      {user && <p className={styles.shared}>{t('ui_traveller_shared')}</p>}

      <ErrorBanner message={failed ? t('ui_traveller_failed') : null} />

      <div className={styles.actions}>
        <Button variant="dark" onClick={onSkip} disabled={saving}>
          {t('ui_traveller_skip')}
        </Button>
        <Button
          variant="primary"
          fullWidth
          disabled={selected == null || saving}
          onClick={() => void submit()}
        >
          {saving ? t('onb_saving') : t('ui_trip_continue')}
        </Button>
      </div>
    </div>
  );
}
