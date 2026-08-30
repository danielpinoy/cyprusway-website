import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { UserPlus } from 'lucide-react';

import { Layout } from '../../components/shell/Layout';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { useI18n } from '../../i18n/I18nProvider';
import type { TranslationKey } from '../../i18n/dictionary';
import { useSession } from '../../lib/SessionProvider';
import type { InterestSlug } from '../../contracts/interests';
import {
  fetchPlannerProfile,
  saveTripPreferences,
  type MorningPreference,
  type PacePreference,
  type PlannerProfile,
} from '../../lib/profile';
import { isBaseLocation, MAX_TRIP_DAYS, type BaseLocation } from '../../lib/trips';
import { addDays, daysBetween, minTripStart, parseIso, toIso } from '../../lib/tripDates';
import { regionOptions } from '../../lib/explore';
import { explorePool } from '../../lib/rails';
import {
  acknowledgeGeneration,
  draftComplete,
  EMPTY_DRAFT,
  generationServerSnapshot,
  generationSnapshot,
  MAX_INTEREST_TAGS,
  quotaFromProfile,
  startGeneration,
  subscribeGeneration,
  TRIP_GENERATION_DAILY_CAP,
  type ChildAgeRange,
  type PartyType,
  type TripDraft,
} from '../../lib/tripGenerate';
import { useHomeData } from '../home/useHomeData';
import { Generating } from './Generating';
import {
  DatesStep,
  PartyStep,
  PlacesStep,
  PreferencesStep,
  ReviewStep,
} from './PlanSteps';
import { PremiumNeeded } from './PremiumNeeded';
import styles from './PlanTrip.module.css';

/**
 * The AI Trip Planner, `/plan-trip`. Web frame `3791-27422`.
 *
 * FIVE STEPS, AND THE COUNT DID NOT CHANGE. The frame heads its body "Where are you
 * going? / Choose as many as apply" over Pace, Morning and "What matters more for this
 * trip?" — a heading from a different screen over three groups, of which the third has
 * nowhere to go: there is no request field, no profile column and nothing in the pipeline
 * that could take it, a `trip_priority` enum was declined in Decision Log entry 54, and
 * the deployed function refuses the key by name (`400 unknown request keys: trip_priority`,
 * probed 30 Aug 2026). It is dropped. But it was a **group on step 1**, never a step of
 * its own — the mobile progress bars number preferences 1, dates 2, base + interests 3 and
 * party 4 — so the five positions survive intact, and the fifth is the review screen the
 * spend needs anyway.
 *
 * THE GATE IS A STATE, AND IT IS THE COMMON ONE. 25 accounts, one premium. The profile
 * read at entry decides, and a read that fails is `unknown` rather than `free` — see
 * `lib/profile.ts`. A 403 from the wire lands on the same page, because the column can
 * change underneath us and the refusal costs nothing when it does.
 *
 * **Prerendered, so the first render reads no session** — the same rule as Ask Pete and
 * /build-trip.
 */
export default function PlanTrip() {
  const { t, lang } = useI18n();
  const { user, status: sessionStatus, openAuth } = useSession();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const data = useHomeData();

  /* The run outlives this component: leaving the page and coming back shows a generation
     still in progress rather than restarting it or losing its ending. */
  const generation = useSyncExternalStore(
    subscribeGeneration,
    generationSnapshot,
    generationServerSnapshot,
  );

  const [profile, setProfile] = useState<PlannerProfile | null>(null);
  const [draft, setDraft] = useState<TripDraft>(EMPTY_DRAFT);
  const [pace, setPace] = useState<PacePreference>('moderate');
  const [morning, setMorning] = useState<MorningPreference>('normal');
  const [prefsFailed, setPrefsFailed] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  /* Recomputed on every render rather than memoised at mount: a tab left open across
     midnight would otherwise still offer the day that was "tomorrow" when it opened, and
     the server refuses a trip that starts today. Trivially cheap. */
  const minStart = toIso(minTripStart());

  /* One `users` read for the whole flow: the gate, step 1's prefill and the count. */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void fetchPlannerProfile(user.id).then((row) => {
      if (cancelled) return;
      setProfile(row);
      if (row.pace) setPace(row.pace);
      if (row.morning) setMorning(row.morning);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  /* Success hands off to the phase-5 editor. `replace` so Back does not return to a
     finished loading screen, and the machine is cleared first so a later visit is clean. */
  useEffect(() => {
    if (generation.phase !== 'success') return;
    const id = generation.tripId;
    acknowledgeGeneration();
    navigate(`/trip/${id}`, { replace: true });
  }, [generation, navigate]);

  /* Every ending re-reads the counter row, and the wizard adopts it. Without this the
     review step, reached by Back from a counted failure, showed the count from the read
     made at ENTRY — "3 of 3 left" after a spend. The row on the machine is the fresh one.

     A 403 from the wire also settles the gate for this session: the entry read may have
     failed (`unknown`) or the column may have changed underneath us, and the server has
     just said which. The machine is then cleared so a later visit — after a grant, say —
     starts from a fresh read rather than a remembered refusal. */
  useEffect(() => {
    if (generation.phase !== 'error') return;
    if (generation.profile) setProfile(generation.profile);
    if (generation.kind === 'premium') {
      setProfile((current) => (current ? { ...current, access: 'free' } : current));
      acknowledgeGeneration();
    }
  }, [generation]);

  const regions = useMemo(() => {
    /* From the catalogue, so the labels are translated and `famagusta` reads "Ayia Napa &
       Protaras" — intersected with the six slugs `trip-generate` accepts, because anything
       else is a 400 naming the six. */
    const places = explorePool(data.places);
    return regionOptions(places, null, lang).filter((option) => isBaseLocation(option.slug));
  }, [data.places, lang]);

  const startYmd = parseIso(draft.startIso);
  const endYmd = parseIso(draft.endIso);
  const span = startYmd && endYmd ? daysBetween(startYmd, endYmd) + 1 : 0;
  const spanError = span < 1 || span > MAX_TRIP_DAYS;
  /* The `min` attribute constrains the picker, not the keyboard: a typed date is set and
     `onChange` fires whatever `min` says. A past date is accepted by the server and would
     plan a trip in the past; today's date is a 400 the wizard would then log as its own
     defect. So the bound is checked here as well as drawn there. */
  const startEarly = draft.startIso != null && draft.startIso < minStart;
  const datesReady =
    draft.startIso != null && draft.endIso != null && !spanError && !startEarly;
  const placesReady =
    draft.baseLocation != null &&
    draft.interestTags.length > 0 &&
    draft.interestTags.length <= MAX_INTEREST_TAGS;

  /* Which steps a direct `?step=` may land on. Step 1 always completes — both preferences
     have a stored or default value — so step 2 is always reachable; the rest need the
     fields in front of them. A deep link past that lands on the first incomplete step
     rather than on a screen whose Continue could never build a request. */
  const maxStep = !datesReady ? 2 : !placesReady ? 3 : 5;
  const requestedStep = Number(searchParams.get('step') ?? '1');
  const step = Number.isFinite(requestedStep)
    ? Math.min(Math.max(Math.trunc(requestedStep), 1), maxStep)
    : 1;

  useEffect(() => {
    if (requestedStep === step) return;
    const next = new URLSearchParams(searchParams);
    next.set('step', String(step));
    setSearchParams(next, { replace: true });
  }, [requestedStep, step, searchParams, setSearchParams]);

  /* Focus the new question when the step changes — not on first paint, which would pull
     focus out of the page for a visitor who has not asked to move. */
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const previousStep = useRef<number | null>(null);
  useEffect(() => {
    if (previousStep.current !== null && previousStep.current !== step) {
      headingRef.current?.focus();
    }
    previousStep.current = step;
  }, [step]);

  function goTo(next: number) {
    const params = new URLSearchParams(searchParams);
    params.set('step', String(next));
    setSearchParams(params);
  }

  async function onContinue() {
    if (step === 1) {
      /* The one write in the flow. Blocking on failure is deliberate: proceeding would
         plan at the stored pace while the screen showed the chosen one. */
      if (!user || savingPrefs) return;
      setSavingPrefs(true);
      setPrefsFailed(false);
      try {
        await saveTripPreferences(user.id, pace, morning);
        setProfile((current) => (current ? { ...current, pace, morning } : current));
      } catch (error) {
        console.warn('[planner] preference write failed:', error);
        setPrefsFailed(true);
        setSavingPrefs(false);
        return;
      }
      setSavingPrefs(false);
    }
    goTo(Math.min(step + 1, 5));
  }

  function onSkip() {
    /* Legitimate on 1 and 4 only. Step 1's skip keeps whatever is stored, which is exactly
       what the server falls back to. Step 4's clears the party rather than leaving a
       half-answer on the request. */
    if (step === 4) setDraft((d) => ({ ...d, partyType: null, childAgeRange: null }));
    goTo(Math.min(step + 1, 5));
  }

  function toggleInterest(slug: InterestSlug) {
    setDraft((current) => {
      if (current.interestTags.includes(slug)) {
        return { ...current, interestTags: current.interestTags.filter((s) => s !== slug) };
      }
      if (current.interestTags.length >= MAX_INTEREST_TAGS) return current;
      return { ...current, interestTags: [...current.interestTags, slug] };
    });
  }

  const readyToCreate = datesReady && placesReady && draftComplete(draft);

  function onCreate() {
    if (!user || !readyToCreate) return;
    /* The bound is re-derived at the moment of the spend, not taken from the render that
       drew the button: `minStart` above is per render, but a click can land on a screen
       painted before midnight. A start that is no longer tomorrow goes back to step 2
       with the message rather than to the server for a 400. */
    if (draft.startIso != null && draft.startIso < toIso(minTripStart())) {
      goTo(2);
      return;
    }
    void startGeneration(user.id, draft);
  }

  // -- the states in front of the wizard -------------------------------------

  const resolving = sessionStatus === 'resolving';

  if (!resolving && !user) {
    return (
      <Shell>
        <div className={styles.signIn}>
          <span className={styles.signInMark} aria-hidden="true">
            <Icon as={UserPlus} size={24} />
          </span>
          <div className={styles.signInCopy}>
            <p className={styles.signInTitle}>{t('ui_trip_signin_title')}</p>
            <p className={styles.signInBody}>{t('ui_trip_signin_body')}</p>
          </div>
          <Button variant="primary" onClick={() => openAuth('signup')}>
            {t('ui_pete_signin_cta')}
          </Button>
        </div>
      </Shell>
    );
  }

  if (resolving || (user && !profile)) {
    return (
      <Shell>
        <div aria-busy="true">
          <p className="cw-visually-hidden" role="status">
            {t('ui_loading')}
          </p>
          <div className={styles.skeletonBlock} aria-hidden="true" />
        </div>
      </Shell>
    );
  }

  /* The gate. `unknown` is deliberately allowed through — the 403 is free, and refusing a
     paying account because one read failed is the larger error. */
  const gated =
    profile?.access === 'free' ||
    (generation.phase === 'error' && generation.kind === 'premium');
  if (gated) {
    return (
      <Shell>
        <PremiumNeeded />
      </Shell>
    );
  }

  if (generation.phase === 'running' || generation.phase === 'error') {
    return (
      <Shell>
        <Generating
          state={generation}
          onViewTrip={(id) => {
            acknowledgeGeneration();
            navigate(`/trip/${id}`, { replace: true });
          }}
          onRetry={() => {
            acknowledgeGeneration();
            onCreate();
          }}
          onChangeDetails={() => {
            acknowledgeGeneration();
            goTo(2);
          }}
          onBack={() => {
            acknowledgeGeneration();
            goTo(5);
          }}
        />
      </Shell>
    );
  }

  // -- the wizard ------------------------------------------------------------

  const quota = profile ? quotaFromProfile(profile) : null;
  const quotaLine =
    quota == null
      ? t('ui_plan_quota_unknown', { cap: TRIP_GENERATION_DAILY_CAP })
      : quota.certain
        ? t('ui_plan_quota_known', { n: quota.remaining, cap: quota.cap })
        : /* No day from the server yet, so the stored count may belong to an earlier day
             and the lazy reset may not have run. The cap is the only honest number here,
             and nothing is disabled on the strength of a guess — the server is the
             authority and a 429 costs nothing. */
          t('ui_plan_quota_unknown', { cap: quota.cap });

  const headings: Record<number, { title: TranslationKey; sub: TranslationKey }> = {
    1: { title: 'ui_plan_prefs_title', sub: 'ui_plan_prefs_sub' },
    2: { title: 'ui_plan_dates_title', sub: 'ui_plan_dates_sub' },
    3: { title: 'ui_plan_places_title', sub: 'ui_plan_places_sub' },
    4: { title: 'ui_plan_party_title', sub: 'ui_plan_party_sub' },
    5: { title: 'ui_plan_review_title', sub: 'ui_plan_review_sub' },
  };
  const heading = headings[step] as { title: TranslationKey; sub: TranslationKey };

  const canContinue =
    step === 1 ? !savingPrefs : step === 2 ? datesReady : step === 3 ? placesReady : true;
  const skippable = step === 1 || step === 4;

  const regionName =
    regions.find((option) => option.slug === draft.baseLocation)?.name ?? '—';

  return (
    <Shell>
      <div className={styles.stepHead}>
        <div className={styles.stepText}>
          <h2 className={styles.stepTitle} tabIndex={-1} ref={headingRef}>
            {t(heading.title)}
          </h2>
          <p className={styles.stepSub}>
            {step === 2 ? t(heading.sub, { max: MAX_TRIP_DAYS }) : t(heading.sub)}
          </p>
        </div>
        <StepIndicator current={step} />
      </div>

      {step === 1 && (
        <PreferencesStep
          pace={pace}
          morning={morning}
          onPace={setPace}
          onMorning={setMorning}
          failed={prefsFailed}
        />
      )}
      {step === 2 && (
        <DatesStep
          draft={draft}
          minStart={minStart}
          maxEnd={startYmd ? toIso(addDays(startYmd, MAX_TRIP_DAYS - 1)) : undefined}
          span={span}
          spanError={draft.endIso != null && spanError}
          startEarly={startEarly}
          onStart={(value) =>
            setDraft((current) => ({
              ...current,
              startIso: value || null,
              /* Keep the range valid rather than leaving an end before its start — the
                 server refuses that, and so would the To field's own `min`. */
              endIso:
                current.endIso && value && current.endIso < value ? value : current.endIso,
            }))
          }
          onEnd={(value) => setDraft((current) => ({ ...current, endIso: value || null }))}
        />
      )}
      {step === 3 && (
        <PlacesStep
          draft={draft}
          regions={regions}
          onRegion={(slug: BaseLocation) =>
            setDraft((current) => ({ ...current, baseLocation: slug }))
          }
          onInterest={toggleInterest}
        />
      )}
      {step === 4 && (
        <PartyStep
          draft={draft}
          onParty={(value: PartyType) =>
            setDraft((current) => ({
              ...current,
              partyType: value,
              /* An age only means something on `family`; carrying one across a change of
                 type would send a value the reader never chose for this party. */
              childAgeRange: value === 'family' ? current.childAgeRange : null,
            }))
          }
          onChildAge={(value: ChildAgeRange) =>
            setDraft((current) => ({ ...current, childAgeRange: value }))
          }
        />
      )}
      {step === 5 && (
        <ReviewStep
          draft={draft}
          regionName={regionName}
          span={span}
          quotaLine={quotaLine}
          storedTravelerType={profile?.travelerType ?? null}
        />
      )}

      <div className={styles.footer}>
        {step > 1 && (
          <Button variant="dark" onClick={() => goTo(step - 1)}>
            {t('ui_plan_back')}
          </Button>
        )}
        <span className={styles.footerSpacer} />
        {skippable && (
          <Button variant="dark" onClick={onSkip}>
            {t('ui_plan_skip')}
          </Button>
        )}
        {step < 5 ? (
          <Button
            variant="primary"
            disabled={!canContinue}
            onClick={() => void onContinue()}
          >
            {t('ui_plan_continue')}
          </Button>
        ) : (
          /* The only place money is spent, and it takes an explicit click. Never a side
             effect of Continue, and never disabled on a count this client is not sure of. */
          <Button variant="primary" disabled={!readyToCreate} onClick={onCreate}>
            {t('ui_plan_create')}
          </Button>
        )}
      </div>
      {step === 5 && <p className={styles.hint}>{t('ui_plan_duration_hint')}</p>}

      {/* Regions arrive with the catalogue; until they do, step 3 has nothing to choose. */}
      {step === 3 && regions.length === 0 && data.status === 'loading' && (
        <p className={styles.hint}>{t('ui_loading')}</p>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.inner}>
          <header className={styles.head}>
            <h1 className={styles.title}>{t('ui_plan_title')}</h1>
            <p className={styles.subtitle}>{t('ui_plan_sub')}</p>
          </header>
          {children}
        </div>
      </div>
    </Layout>
  );
}

const TOTAL_STEPS = 5;

/**
 * The frame's five dots, as an ordered list.
 *
 * Numbering carried by `aria-current` and by a visible "Step n of 5", not by five circles
 * and a colour — the colour is the wrong one anyway: the frame rings the current step in
 * `--cw-gold` on sand, which is 2.32:1 and fails WCAG 1.4.11 (see PlanTrip.module.css).
 */
function StepIndicator({ current }: { current: number }) {
  const { t } = useI18n();
  return (
    <div>
      <ol className={styles.steps} aria-label={t('ui_plan_steps_label')}>
        {Array.from({ length: TOTAL_STEPS }, (_, index) => index + 1).map((number) => (
          <li
            key={number}
            className={styles.stepDot}
            data-state={
              number === current ? 'current' : number < current ? 'done' : 'upcoming'
            }
            aria-current={number === current ? 'step' : undefined}
          >
            <span className={styles.stepMark}>{number}</span>
            {number < TOTAL_STEPS && <span className={styles.stepLine} aria-hidden="true" />}
          </li>
        ))}
      </ol>
      <p className="cw-visually-hidden" role="status">
        {t('ui_plan_step_of', { n: current, total: TOTAL_STEPS })}
      </p>
    </div>
  );
}
