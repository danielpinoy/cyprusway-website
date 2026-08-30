import { useId } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Armchair,
  AudioWaveform,
  Heart,
  Moon,
  PartyPopper,
  PersonStanding,
  SunMedium,
  Sunrise,
  User,
  Users,
} from 'lucide-react';

import { useI18n } from '../../i18n/I18nProvider';
import {
  INTEREST_SLUGS,
  interestImage,
  interestLabelKey,
  type InterestSlug,
} from '../../contracts/interests';
import type { MorningPreference, PacePreference } from '../../lib/profile';
import { MAX_TRIP_DAYS, type BaseLocation } from '../../lib/trips';
import {
  MAX_INTEREST_TAGS,
  type ChildAgeRange,
  type PartyType,
  type TripDraft,
} from '../../lib/tripGenerate';
import { formatDate } from '../../lib/tripDates';
import { CheckboxChips, OptionTiles, RadioChips } from './PlannerControls';
import styles from './PlanTrip.module.css';

/**
 * The five steps' bodies. The chrome around them — heading, indicator, footer, focus —
 * is `PlanTrip.tsx`; these are the fields and nothing else.
 *
 * Step 1 writes `public.users`. Steps 2 to 4 fill the request. Step 5 spends a generation.
 */

/* Labels are the frame's; values are the column's. "Balanced" is `moderate`. */
const PACE_ICONS: Record<PacePreference, LucideIcon> = {
  relaxed: Armchair,
  moderate: AudioWaveform,
  packed: PersonStanding,
};

const MORNING_ICONS: Record<MorningPreference, LucideIcon> = {
  early_bird: Sunrise,
  normal: SunMedium,
  late_riser: Moon,
};

const PARTY_ICONS: Record<PartyType, LucideIcon> = {
  solo: User,
  couple: Heart,
  family: Users,
  friends: PartyPopper,
};

export function PreferencesStep({
  pace,
  morning,
  onPace,
  onMorning,
  failed,
}: {
  pace: PacePreference;
  morning: MorningPreference;
  onPace: (value: PacePreference) => void;
  onMorning: (value: MorningPreference) => void;
  failed: boolean;
}) {
  const { t } = useI18n();

  /* Three morning options, one per stored value.
   *
   * The app draws two and rules that neither selected means `normal`, because the frame
   * it was built from (`3603:16697`) had two cards for a three-value column and it said
   * so: "Inferred, not drawn — flagged for the designer." That frame has since been
   * deleted and its replacement (`3791-27032` / `27227`, and the web frame) draws three.
   * The question is answered; the web takes the answer and the inference disappears. */
  return (
    <div className={styles.form}>
      <OptionTiles<PacePreference>
        name="cw-plan-pace"
        legend={t('ui_plan_pace_label')}
        options={[
          { value: 'relaxed', label: t('ui_plan_pace_relaxed'), icon: PACE_ICONS.relaxed },
          { value: 'moderate', label: t('ui_plan_pace_moderate'), icon: PACE_ICONS.moderate },
          { value: 'packed', label: t('ui_plan_pace_packed'), icon: PACE_ICONS.packed },
        ]}
        value={pace}
        onChange={onPace}
      />
      <OptionTiles<MorningPreference>
        name="cw-plan-morning"
        legend={t('ui_plan_morning_label')}
        options={[
          { value: 'early_bird', label: t('ui_plan_morning_early'), icon: MORNING_ICONS.early_bird },
          { value: 'normal', label: t('ui_plan_morning_normal'), icon: MORNING_ICONS.normal },
          { value: 'late_riser', label: t('ui_plan_morning_late'), icon: MORNING_ICONS.late_riser },
        ]}
        value={morning}
        onChange={onMorning}
      />
      {failed && (
        <p className={styles.error} role="status">
          {t('ui_plan_prefs_failed')}
        </p>
      )}
    </div>
  );
}

export function DatesStep({
  draft,
  minStart,
  maxEnd,
  span,
  spanError,
  onStart,
  onEnd,
}: {
  draft: TripDraft;
  minStart: string;
  maxEnd: string | undefined;
  span: number;
  spanError: boolean;
  onStart: (value: string) => void;
  onEnd: (value: string) => void;
}) {
  const { t } = useI18n();
  const fromId = useId();
  const toId = useId();

  /* Native date inputs, not the frame's month grid. The browser's control is
     keyboard-accessible, localised, mirrors under RTL and honours min/max for free; the
     app hand-built one only because React Native has no date control. Phase 5 made the
     same call for /build-trip.

     `min` is strictly after today on BOTH clocks (lib/tripDates.minTripStart), because
     the server's same-day refusal compares UTC while the traveller is on local time. The
     stricter bound can never 400 and never dates a trip to the user's own today.

     `max` is start + 30: 31 inclusive days is the server's ceiling, and 32 is a 400
     (probed). MAX_TRIP_DAYS is already 31 in lib/trips from the trip-edit contract — this
     does NOT inherit the app's MAX_DURATION_DAYS = 32, whose "17 day+" chip produces a
     request the server refuses. */
  return (
    <div className={styles.form}>
      <fieldset className={styles.group}>
        <legend className={styles.legend}>{t('ui_trip_dates_label')}</legend>
        <div className={styles.dates}>
          <div className={styles.dateField}>
            <label className={styles.dateLabel} htmlFor={fromId}>
              {t('ui_trip_from')}
            </label>
            <input
              id={fromId}
              type="date"
              className={styles.input}
              value={draft.startIso ?? ''}
              min={minStart}
              onChange={(event) => onStart(event.target.value)}
            />
          </div>
          <div className={styles.dateField}>
            <label className={styles.dateLabel} htmlFor={toId}>
              {t('ui_trip_to')}
            </label>
            <input
              id={toId}
              type="date"
              className={styles.input}
              value={draft.endIso ?? ''}
              min={draft.startIso ?? minStart}
              max={maxEnd}
              onChange={(event) => onEnd(event.target.value)}
            />
          </div>
        </div>
        <p className={styles.groupStatus} role="status">
          {spanError
            ? t('ui_trip_span_error', { max: MAX_TRIP_DAYS })
            : span > 0
              ? t('ui_trip_span', { count: span })
              : ' '}
        </p>
      </fieldset>
    </div>
  );
}

export function PlacesStep({
  draft,
  regions,
  onRegion,
  onInterest,
}: {
  draft: TripDraft;
  regions: readonly { slug: string; name: string }[];
  onRegion: (slug: BaseLocation) => void;
  onInterest: (slug: InterestSlug) => void;
}) {
  const { t } = useI18n();
  const atCap = draft.interestTags.length >= MAX_INTEREST_TAGS;

  return (
    <div className={styles.form}>
      {/* Single-select: `base_location` is one value, whatever the frame's plural label
          says, and "ayia_napa" is a 400 — the six slugs come from the catalogue,
          intersected with what the server accepts, so `famagusta` reads "Ayia Napa &
          Protaras" in the reader's language rather than as a slug.

          Text only. The frame gives each chip a 24px photo disc and
          `destination.hero_image` is null on all six — the standing departure phase 3
          made for Explore's region chips and phase 5 repeated for /build-trip. */}
      <RadioChips
        name="cw-plan-region"
        legend={t('ui_trip_region_label')}
        options={regions.map((region) => ({ value: region.slug, label: region.name }))}
        value={draft.baseLocation}
        onChange={(slug) => onRegion(slug as BaseLocation)}
      />
      {/* Eleven chips, 1 to 5 chosen. `petes_picks` is a valid request tag and is
          deliberately absent: no frame draws a chip for it, and it cannot be written to
          `users.interests` (23514), so this would be the only place in either client that
          knew about it. Not prefilled from the stored profile either — that column holds
          up to eleven and this takes five, so prefilling would truncate somebody's stated
          interests into a per-trip choice they never made. */}
      <CheckboxChips
        legend={t('ui_plan_interests_label')}
        status={
          atCap
            ? t('ui_plan_interests_full', { max: MAX_INTEREST_TAGS })
            : t('ui_plan_interests_count', {
                count: draft.interestTags.length,
                max: MAX_INTEREST_TAGS,
              })
        }
        options={INTEREST_SLUGS.map((slug) => ({
          value: slug,
          label: t(interestLabelKey(slug)),
          image: interestImage(slug),
        }))}
        selected={draft.interestTags}
        atCap={atCap}
        onToggle={(slug) => onInterest(slug as InterestSlug)}
      />
    </div>
  );
}

export function PartyStep({
  draft,
  onParty,
  onChildAge,
}: {
  draft: TripDraft;
  onParty: (value: PartyType) => void;
  onChildAge: (value: ChildAgeRange) => void;
}) {
  const { t } = useI18n();

  return (
    <div className={styles.form}>
      <OptionTiles<PartyType>
        name="cw-plan-party"
        legend={t('ui_plan_party_title')}
        options={[
          {
            value: 'solo',
            label: t('ui_plan_party_solo'),
            description: t('ui_plan_party_solo_desc'),
            icon: PARTY_ICONS.solo,
          },
          {
            value: 'couple',
            label: t('ui_plan_party_couple'),
            description: t('ui_plan_party_couple_desc'),
            icon: PARTY_ICONS.couple,
          },
          {
            value: 'family',
            label: t('ui_plan_party_family'),
            description: t('ui_plan_party_family_desc'),
            icon: PARTY_ICONS.family,
          },
          {
            value: 'friends',
            label: t('ui_plan_party_friends'),
            description: t('ui_plan_party_friends_desc'),
            icon: PARTY_ICONS.friends,
          },
        ]}
        value={draft.partyType}
        onChange={onParty}
        rows
        hideLegend
      />
      {/* Drawn in no frame, and in the contract: `child_age_range` is accepted with any
          type but only `family` + `under_5` does anything — it adds the `young_children`
          consideration. Shown only where it can matter, and sent only from there.
          `group_size` is accepted, stored and never used in generation, so it is not
          collected: a control that changes nothing is the same error as the fifth tile. */}
      {draft.partyType === 'family' && (
        <OptionTiles<ChildAgeRange>
          name="cw-plan-child-age"
          legend={t('ui_plan_children_label')}
          options={[
            { value: 'under_5', label: t('ui_plan_children_under_5') },
            { value: 'age_5_12', label: t('ui_plan_children_age_5_12') },
            { value: 'teenagers', label: t('ui_plan_children_teenagers') },
          ]}
          value={draft.childAgeRange}
          onChange={onChildAge}
        />
      )}
    </div>
  );
}

export function ReviewStep({
  draft,
  regionName,
  span,
  quotaLine,
  storedTravelerType,
}: {
  draft: TripDraft;
  regionName: string;
  span: number;
  quotaLine: string;
  /** `users.traveler_type` — what a skipped step 4 falls back to, or null. */
  storedTravelerType: string | null;
}) {
  const { t, lang } = useI18n();

  const interests = draft.interestTags
    .map((slug) => t(interestLabelKey(slug)))
    .join(', ');

  /* What will actually be sent, which is not always what was chosen.
   *
   * Skipping step 4 omits `trip_party`, and the server then reads `users.traveler_type`
   * instead (`index.ts:1630`). So a skip means one of two different things, and the row
   * decides which: with a stored type, that type is used and the line says so; with none
   * — which is almost every account here, since nothing on the web writes the column —
   * no party reaches the request at all and the honest word is "none". Said once, here,
   * rather than promised on the step itself. */
  const party = draft.partyType
    ? t(`ui_plan_party_${draft.partyType}` as 'ui_plan_party_solo')
    : storedTravelerType
      ? t('ui_plan_review_party_profile')
      : t('ui_plan_review_party_none');

  return (
    <div className={styles.form}>
      <dl className={styles.summary}>
        <SummaryRow label={t('ui_plan_review_where')} value={regionName} />
        <SummaryRow
          label={t('ui_plan_review_when')}
          value={`${formatDate(draft.startIso, lang)} – ${formatDate(draft.endIso, lang)}`}
        />
        <SummaryRow label={t('ui_plan_review_days')} value={String(span)} />
        <SummaryRow label={t('ui_plan_review_interests')} value={interests} />
        <SummaryRow label={t('ui_plan_review_party')} value={party} />
      </dl>
      <p className={styles.quota}>{quotaLine}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.summaryRow}>
      <dt className={styles.summaryLabel}>{label}</dt>
      <dd className={styles.summaryValue}>{value}</dd>
    </div>
  );
}
