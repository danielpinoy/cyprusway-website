import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import { Button } from '../../components/ui/Button';
import { useI18n } from '../../i18n/I18nProvider';
import type { TranslationKey } from '../../i18n/dictionary';
import { formatDate } from '../../lib/tripDates';
import {
  dayAfter,
  failureCounted,
  GENERATE_SLOW_AFTER_MS,
  type GenerationFailure,
  type GenerationState,
  type QuotaReport,
} from '../../lib/tripGenerate';
import styles from './Generating.module.css';

/**
 * The one screen a generation is watched from, and every way it can end.
 *
 * The frame (`3603-16826`) draws **only** the in-flight state: Pete, one line, three dots.
 * Everything else here is inferred and flagged in docs/PHASE-6-PLAN.md §11.
 *
 * THE RULE THAT SHAPES ALL OF IT. `trip-generate` consumes one of the day's three at
 * `index.ts:1567`, before the embedding and before either model call, and there is no
 * refund — entry 63 ruled one and nothing was built. So a 422 or a 502 costs a generation
 * and returns nothing. Every ending below therefore states whether the attempt counted and
 * what is left, because "something went wrong, try again" invites a second spend against a
 * counter the reader cannot see.
 *
 * AND NO CANCEL. There is nothing to cancel: the allowance is gone the moment the request
 * clears the RPC, and a client abort stops neither the handler nor the OpenAI calls. A
 * Cancel button would imply both.
 */

export function Generating({
  state,
  onViewTrip,
  onRetry,
  onChangeDetails,
  onBack,
}: {
  state: Extract<GenerationState, { phase: 'running' } | { phase: 'error' }>;
  onViewTrip: (id: string) => void;
  onRetry: () => void;
  onChangeDetails: () => void;
  onBack: () => void;
}) {
  if (state.phase === 'running') return <Waiting startedAt={state.startedAt} />;
  if (state.recoveredTripId) {
    return <Recovered tripId={state.recoveredTripId} onViewTrip={onViewTrip} />;
  }
  return (
    <Failed
      kind={state.kind}
      quota={state.quota}
      onRetry={onRetry}
      onChangeDetails={onChangeDetails}
      onBack={onBack}
    />
  );
}

function Waiting({ startedAt }: { startedAt: number }) {
  const { t } = useI18n();
  const [slow, setSlow] = useState(Date.now() - startedAt >= GENERATE_SLOW_AFTER_MS);

  /* One timer, not a tick: the copy changes once, at 45 s. Polling the clock every second
     to render the same sentence would announce it to a screen reader every second too. */
  useEffect(() => {
    if (slow) return;
    const remaining = Math.max(0, GENERATE_SLOW_AFTER_MS - (Date.now() - startedAt));
    const timer = setTimeout(() => setSlow(true), remaining);
    return () => clearTimeout(timer);
  }, [slow, startedAt]);

  return (
    <div className={styles.centre} aria-busy="true">
      {/* The same illustration the Book with Pete card and the Ask Pete thread use — the
          frame draws this character on this screen, and it is already in the repo. */}
      <img
        className={styles.pete}
        src="/images/pete.webp"
        alt=""
        width={560}
        height={745}
        decoding="async"
      />
      <p className={styles.waitingCopy} role="status">
        {slow ? t('ui_plan_building_long') : t('ui_plan_building')}
      </p>
      <p className={styles.waitingSub}>{t('ui_plan_duration_hint')}</p>
      <Dots />
    </div>
  );
}

const DOT_COUNT = 3;

function Dots() {
  /* Decoration only: the state is in the line above it, which is the live region. */
  return (
    <span className={styles.dots} aria-hidden="true">
      {Array.from({ length: DOT_COUNT }, (_, index) => (
        <span key={index} className={styles.dot} data-index={index} />
      ))}
    </span>
  );
}

function Recovered({
  tripId,
  onViewTrip,
}: {
  tripId: string;
  onViewTrip: (id: string) => void;
}) {
  const { t } = useI18n();
  /* NEVER a retry beside this. The row exists and was paid for; offering "try again" here
     is an invitation to buy the same trip twice. */
  return (
    <div className={styles.centre}>
      <h2 className={styles.failTitle}>{t('ui_plan_recovered_title')}</h2>
      <p className={styles.failBody} role="status">
        {t('ui_plan_recovered_body')}
      </p>
      <Button variant="primary" onClick={() => onViewTrip(tripId)}>
        {t('ui_plan_view_trip')}
      </Button>
    </div>
  );
}

interface FailureCopy {
  title: TranslationKey;
  body: TranslationKey;
  retry: boolean;
  change: boolean;
}

const FAILURES: Record<GenerationFailure, FailureCopy> = {
  /* 422, after both model attempts. Counted. Changing the inputs is the move that most
     often works, so it is offered beside the retry rather than instead of it. */
  generation: {
    title: 'ui_plan_fail_generation_title',
    body: 'ui_plan_fail_generation_body',
    retry: true,
    change: true,
  },
  /* 500 or 502, and the re-query found no row. Counted. */
  server: {
    title: 'ui_plan_fail_server_title',
    body: 'ui_plan_fail_server_body',
    retry: true,
    change: false,
  },
  /* Our own 120 s abort, and four re-queries over fifteen seconds found nothing.
     NO RETRY: the server may still be working, and a second attempt would spend a second
     generation against a first that may yet land. */
  slow: {
    title: 'ui_plan_fail_slow_title',
    body: 'ui_plan_fail_slow_body',
    retry: false,
    change: false,
  },
  /* `fetch` threw before any response AND the re-query agrees nothing was created. The
     only ending where "trying again is safe" is a statement rather than a hope. */
  offline: {
    title: 'ui_plan_fail_offline_title',
    body: 'ui_plan_fail_offline_body',
    retry: true,
    change: false,
  },
  /* 429. Nothing consumed — migration 0047 rejects an over-cap call without incrementing.
     The body is composed from the wire's own numbers below. */
  quota: {
    title: 'ui_plan_fail_quota_title',
    body: 'ui_plan_quota_unknown',
    retry: false,
    change: false,
  },
  /* 400. Every rule this endpoint enforces is pre-validated in the wizard, so reaching
     here is a defect on this side; it is logged as one and the reader is sent back. */
  invalid: {
    title: 'ui_plan_fail_invalid_title',
    body: 'ui_plan_fail_invalid_body',
    retry: false,
    change: true,
  },
  auth: {
    title: 'ui_plan_fail_auth_title',
    body: 'ui_plan_fail_auth_body',
    retry: false,
    change: false,
  },
  /* 403 `account_required`: an authenticated session with no linked identity. This site
     creates no anonymous sessions, so it is unreachable — handled as the session problem
     it is rather than left to fall through to a blank screen. */
  account: {
    title: 'ui_plan_fail_auth_title',
    body: 'ui_plan_fail_auth_body',
    retry: false,
    change: false,
  },
  /* Never rendered here: PlanTrip shows the Premium page for this one. Present so the
     record is total. */
  premium: {
    title: 'ui_plan_premium_title',
    body: 'ui_plan_premium_note',
    retry: false,
    change: false,
  },
};

function Failed({
  kind,
  quota,
  onRetry,
  onChangeDetails,
  onBack,
}: {
  kind: GenerationFailure;
  quota: QuotaReport | null;
  onRetry: () => void;
  onChangeDetails: () => void;
  onBack: () => void;
}) {
  const { t, lang } = useI18n();
  const copy = FAILURES[kind];

  /* The quota line, and it is three different sentences.
   *
   * On a counted failure the row was just re-read, and because `consume_trip_generation`
   * writes today's Cyprus day on every branch it takes, that row's own `reset_at` IS the
   * server's today — so the number is exact rather than a floor, and the copy can name it.
   * When the read failed there is no number and the line says only that it counted.
   * On a 429 the wire carried `remaining`, `daily_cap` and `quota_day`. */
  let counted: string | null = null;
  if (kind === 'quota') {
    counted =
      quota?.day != null
        ? t('ui_plan_quota_none', {
            cap: quota.cap,
            date: formatDate(dayAfter(quota.day), lang),
          })
        : t('ui_plan_quota_unknown', { cap: quota?.cap ?? 3 });
  } else if (failureCounted(kind) || kind === 'slow') {
    counted =
      quota && quota.certain
        ? t('ui_plan_counted', { n: quota.remaining, cap: quota.cap })
        : t('ui_plan_counted_unknown');
  }

  return (
    <div className={styles.centre}>
      <h2 className={styles.failTitle}>{t(copy.title)}</h2>
      <div role="status">
        {kind !== 'quota' && <p className={styles.failBody}>{t(copy.body)}</p>}
        {counted && <p className={styles.counted}>{counted}</p>}
      </div>
      <div className={styles.failActions}>
        {copy.retry && (
          <Button variant="primary" onClick={onRetry}>
            {t('ui_plan_retry')}
          </Button>
        )}
        {copy.change && (
          <Button variant="dark" onClick={onChangeDetails}>
            {t('ui_plan_change')}
          </Button>
        )}
        {kind === 'slow' && (
          <Link className={styles.link} to="/trips">
            {t('ui_plan_check_trips')}
          </Link>
        )}
        <button type="button" className={styles.link} onClick={onBack}>
          {t('ui_plan_back')}
        </button>
      </div>
    </div>
  );
}
