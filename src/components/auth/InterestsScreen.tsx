import { useState } from 'react';
import type { User } from '@supabase/supabase-js';

import { useT } from '../../i18n/I18nProvider';
import {
  INTEREST_SLUGS,
  interestImage,
  interestLabelKey,
  type InterestSlug,
} from '../../contracts/interests';
import { saveInterests } from '../../lib/profile';
import { Button } from '../ui/Button';
import { ErrorBanner } from './ErrorBanner';
import styles from './InterestsScreen.module.css';

/**
 * Eleven chips, one enforced minimum, one button.
 *
 * One button, not the frame's two. "My CyprusWay" names a surface the web does not
 * have, and with both destinations generic the primary/secondary pair asserted a
 * recommendation it could not make. Saving now closes the card and returns to the
 * command centre signed in, which is the only honest destination in phase 1.
 *
 * The selected chip's label is navy-black, not gold. Gold on white measures 2.63:1
 * with the Figma palette; the gold border and tint carry the state, which also
 * satisfies WCAG 1.4.1 — the state is not signalled by colour alone, because
 * aria-pressed carries it too.
 */
export function InterestsScreen({
  user,
  titleId,
  onSaved,
}: {
  user: User;
  titleId: string;
  onSaved: () => void;
}) {
  const t = useT();
  const [selected, setSelected] = useState<readonly InterestSlug[]>([]);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  function toggle(slug: InterestSlug) {
    if (saving) return;
    setSelected((current) =>
      current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug],
    );
  }

  async function submit() {
    if (saving || selected.length === 0) return;
    setSaving(true);
    setFailed(false);
    try {
      await saveInterests(user.id, selected);
      onSaved();
    } catch {
      /* The screen stays open with the selection intact so it can be retried —
         a zero-row update is treated as failure, not as a silent success. */
      setSaving(false);
      setFailed(true);
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <h2 id={titleId} className={styles.title}>
          {t('onb_interests_title')}
        </h2>
        <p className={styles.subtitle}>{t('onb_interests_sub')}</p>
      </div>

      <ul className={styles.chips}>
        {INTEREST_SLUGS.map((slug) => {
          const isOn = selected.includes(slug);
          return (
            <li key={slug}>
              <button
                type="button"
                className={styles.chip}
                aria-pressed={isOn}
                disabled={saving}
                onClick={() => toggle(slug)}
              >
                <img
                  className={styles.chipImage}
                  src={interestImage(slug)}
                  alt=""
                  width={24}
                  height={24}
                  loading="lazy"
                />
                <span>{t(interestLabelKey(slug))}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <ErrorBanner message={failed ? t('onb_err_save') : null} />

      <Button
        variant="primary"
        fullWidth
        disabled={selected.length === 0 || saving}
        onClick={() => void submit()}
      >
        {saving ? t('onb_saving') : t('onb_start_exploring')}
      </Button>
    </div>
  );
}
