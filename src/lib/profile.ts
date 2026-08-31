import { getSupabase } from './supabase';
import type { InterestSlug } from '../contracts/interests';
import { isTravelerType, type TravelerType } from '../contracts/travelerPools';
import type { LanguageCode } from '../i18n/languages';

/* The profile row creates itself: the `on_auth_user_created` trigger fires inside
 * GoTrue's insert transaction, verified across 24 users with zero orphans. There is
 * deliberately no client-side row creation and no upsert anywhere in this file. */

/**
 * Read the one signal that decides whether onboarding runs.
 *
 * `onboarding_completed`, never `interests <> '{}'`. Measured on the live project:
 * 11 users true, 13 false, and 4 of the 11 completed users have empty interests via
 * the app's skip paths — so an interests-based check would re-run onboarding for a
 * third of the people who finished it, and disagree with the app's guard in both
 * directions.
 *
 * A missing row or a failed read is an error, never "treat as new". The caller shows
 * the error banner; it must not fall through to the sign-up card, because that path
 * ends with an existing paying user creating a duplicate account.
 */
export interface Profile {
  onboardingCompleted: boolean;
  /** Drives the Top Recommendations re-rank. Empty is normal, not an error: measured,
   *  4 of 11 completed users have `interests = '{}'` via the app's skip paths. */
  interests: string[];
  /**
   * Drives the traveller rail and the hero's "Travelling as" line.
   *
   * Null is the normal state and not an error: measured 30 Aug 2026, `traveler_type` is
   * null on **25 of 25** accounts, the developer's included. That is not evidence about
   * demand — the app's picker is reachable from one screen and has never been put to
   * anyone — it is why the chooser exists. A null column means no rail and no prompt
   * beyond the hero card; nothing bounces.
   */
  travelerType: TravelerType | null;
}

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await (await getSupabase())
    .from('users')
    .select('onboarding_completed, interests, traveler_type')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('profile_row_missing');

  return {
    onboardingCompleted: data.onboarding_completed === true,
    interests: Array.isArray(data.interests) ? (data.interests as string[]) : [],
    /* Narrowed rather than cast: the column is plain text with a CHECK, and a value from
       outside the four would otherwise reach the pool lookup as an undefined key. */
    travelerType: isTravelerType(data.traveler_type) ? data.traveler_type : null,
  };
}

/**
 * Write both columns in one call.
 *
 * `.select('id')` is required, not stylistic. Without it a zero-row update — missing
 * row, changed RLS, revoked column grant — returns success and saves nothing. Zero
 * rows is treated as an error so the interests screen stays open with the selection
 * intact rather than silently discarding it.
 *
 * TODO(contracts): where `onboarding_completed` flips is a client decision today and
 * the app flips it later, at entry-choice/traveller-type, so a web-onboarded user
 * reaches the app with the flag true and `traveler_type` NULL. The fix is the
 * server-side `complete_onboarding` RPC in the contracts work, not a client-side
 * reconciliation here.
 */
export async function saveInterests(
  userId: string,
  interests: readonly InterestSlug[],
): Promise<void> {
  const { data, error } = await (await getSupabase())
    .from('users')
    .update({ interests, onboarding_completed: true })
    .eq('id', userId)
    .select('id');

  if (error) throw error;
  if (!data || data.length === 0) throw new Error('zero_rows_updated');
}

/**
 * The chooser's write — the only thing on this site that sets `users.traveler_type`.
 *
 * The column is one of the nine in the `authenticated` UPDATE grant and carries a CHECK of
 * the four values, so the vocabulary is the database's: a fifth value is a 23514 at write
 * time rather than a silent no-op. `TravelerType` narrows to the same four on the way in.
 *
 * **It is one row, so it also changes what the phone shows** — the same property
 * `savePreferredLanguage` has, and the chooser says so rather than letting it be a
 * surprise. It also changes generated trips: `trip-generate` falls back to this column
 * when a request carries no `trip_party`, and the planner's review step already renders
 * "Your usual travel style" from it.
 *
 * `.select('id')` is required, not stylistic — the `saveInterests` rule. Without it a
 * zero-row update (missing row, changed RLS, revoked grant) returns success and saves
 * nothing, and the chooser would close on a write that never happened.
 *
 * Guests never reach here: with no session there is nothing to write to, and an answer
 * given before there was an account is not consent to change the account. Their choice
 * lives in the URL and nowhere else.
 */
export async function saveTravelerType(
  userId: string,
  type: TravelerType,
): Promise<void> {
  const { data, error } = await (await getSupabase())
    .from('users')
    .update({ traveler_type: type })
    .eq('id', userId)
    .select('id');

  if (error) throw error;
  if (!data || data.length === 0) throw new Error('zero_rows_updated');
}

/**
 * Persist the interface language onto the shared profile row.
 *
 * Why this exists at all: `mike` reads `public.users.preferred_language` and instructs the
 * model "Respond in {language}". The web switcher wrote only `localStorage`, so a
 * signed-in visitor who put the site into Greek got a Greek interface and Pete answering
 * in whatever their app profile said — English, for anyone who had never opened the app.
 * Greek chrome around English answers, in the same column, with no explanation.
 *
 * **It is one row, so it also changes the language of the app on their phone.** That is a
 * real consequence of a control that looks local, and the switcher says so rather than
 * letting it be a surprise. Called only from the explicit switcher and only for a
 * signed-in visitor — never from the `localStorage` restore path, which is not a choice
 * anybody just made.
 *
 * Best effort: a failure leaves the interface language changed and Pete's unchanged,
 * which is exactly where the site was before this existed. It is logged, never rendered.
 */
export async function savePreferredLanguage(
  userId: string,
  language: LanguageCode,
): Promise<void> {
  const { error } = await (await getSupabase())
    .from('users')
    .update({ preferred_language: language })
    .eq('id', userId)
    .select('id');

  if (error) console.warn('[profile] preferred_language write failed:', error.message);
}

/**
 * Whether this account is premium.
 *
 * One column off the profile row the caller already owns, under the existing "users can
 * read own profile" policy. The only consumer is the trip screen's Print/Download PDF
 * button: `trip-pdf` refuses a non-premium caller with 403 `premium_required`, so the
 * button is rendered for accounts that can use it and is absent otherwise — never
 * disabled, which is the call phase 4 made for "Unlock Unlimited" and for the same reason.
 *
 * A failed read reads as not premium: hiding a button nobody could have used is a smaller
 * error than showing one that 403s.
 */
export async function fetchIsPremium(userId: string): Promise<boolean> {
  const { data, error } = await (await getSupabase())
    .from('users')
    .select('is_premium')
    .eq('id', userId)
    .maybeSingle<{ is_premium: boolean }>();

  if (error || !data) return false;
  return data.is_premium === true;
}

// ---------------------------------------------------------------------------
// The AI Trip Planner's one profile read, and its one write.
// ---------------------------------------------------------------------------

export type PacePreference = 'relaxed' | 'moderate' | 'packed';
export type MorningPreference = 'early_bird' | 'normal' | 'late_riser';

export interface PlannerProfile {
  /**
   * `unknown` is not `free`.
   *
   * `fetchIsPremium` above reads a failed read as "not premium", which is right where it
   * is used: hiding a button nobody could have pressed is a small error. Here the same
   * reading would tell a paying account that the feature it paid for is not for it, which
   * is a large one. So a read failure is `unknown`, and the caller lets it through to the
   * server — `trip-generate`'s premium gate runs BEFORE the quota (`index.ts:1555`, then
   * `:1567`), so a 403 costs the account nothing at all. An optimistic pass is free; a
   * false refusal is not.
   */
  access: 'premium' | 'free' | 'unknown';
  /** For prefilling step 1. Null when the column is null or the read failed. */
  pace: PacePreference | null;
  morning: MorningPreference | null;
  /**
   * The stored traveller type, read for one sentence on the review step.
   *
   * Omitting `trip_party` from the request does not mean "no party" — the server falls
   * back to this column (`index.ts:1630`). So a skipped step 4 sends *something* when the
   * column is set and nothing at all when it is null, and the review has to be able to
   * tell the reader which. It is null on almost every account here, because the web's
   * onboarding never writes it and the app writes it on a screen the web has no
   * equivalent of.
   */
  travelerType: string | null;
  /**
   * The daily generation counter, exactly as stored. NOT interpreted here: the day it
   * belongs to is a Cyprus calendar day the server owns, and deriving one in the browser
   * is the mistake decision-log entry 64 names first. `lib/tripGenerate.ts` decides what
   * this means, and only when it has a day off the wire.
   */
  generationsToday: number | null;
  /** `users.trip_generations_reset_at` — the Cyprus day the count belongs to, or null. */
  generationsResetAt: string | null;
}

const PACE_VALUES: readonly string[] = ['relaxed', 'moderate', 'packed'];
const MORNING_VALUES: readonly string[] = ['early_bird', 'normal', 'late_riser'];

/**
 * The planner flow's one `users` read, made once at entry.
 *
 * Six columns answer four questions the flow would otherwise ask three times: whether
 * the gate opens, what step 1 starts from, how many generations are left, and what a
 * skipped party step would fall back to. All of them
 * are on the caller's own row, under the existing "users can read own profile" policy.
 */
export async function fetchPlannerProfile(userId: string): Promise<PlannerProfile> {
  const { data, error } = await (await getSupabase())
    .from('users')
    .select(
      'is_premium, pace_preference, morning_preference, traveler_type, trip_generations_today, trip_generations_reset_at',
    )
    .eq('id', userId)
    .maybeSingle<{
      is_premium: boolean | null;
      pace_preference: string | null;
      morning_preference: string | null;
      traveler_type: string | null;
      trip_generations_today: number | null;
      trip_generations_reset_at: string | null;
    }>();

  if (error || !data) {
    console.warn('[planner] profile read failed:', error?.message ?? 'no row');
    return {
      access: 'unknown',
      pace: null,
      morning: null,
      travelerType: null,
      generationsToday: null,
      generationsResetAt: null,
    };
  }

  return {
    access: data.is_premium === true ? 'premium' : 'free',
    pace: PACE_VALUES.includes(data.pace_preference ?? '')
      ? (data.pace_preference as PacePreference)
      : null,
    morning: MORNING_VALUES.includes(data.morning_preference ?? '')
      ? (data.morning_preference as MorningPreference)
      : null,
    travelerType: data.traveler_type,
    generationsToday:
      typeof data.trip_generations_today === 'number' ? data.trip_generations_today : null,
    generationsResetAt: data.trip_generations_reset_at,
  };
}

/**
 * Step 1's write. Pace and morning are **not** request fields — sending either to
 * `trip-generate` is a 400 that names the key (probed 30 Aug 2026). The server reads them
 * off `public.users` itself, so the only way to make the choice take effect is to store it.
 *
 * Both columns are in the nine-column `UPDATE` grant `authenticated` holds, and this is the
 * same write the app's `writeTripProfile` makes — deliberately, because two clients
 * disagreeing about where a shared column is written is worse than either choice.
 *
 * **It is one row, so it also changes how the app plans trips for this account**, the same
 * property `savePreferredLanguage` above has. And it lands on Continue rather than at the
 * end, so a wizard abandoned at step 2 has still changed the stored preferences. That is
 * the app's behaviour and phase 6 matches it; the alternative is a failed write arriving at
 * the same moment as a paid action.
 *
 * `.select('id')` is load-bearing: without it a zero-row update — missing row, changed RLS,
 * revoked grant — returns success and saves nothing, and the wizard would go on to generate
 * at the stored pace while the screen showed the chosen one.
 */
export async function saveTripPreferences(
  userId: string,
  pace: PacePreference,
  morning: MorningPreference,
): Promise<void> {
  const { data, error } = await (await getSupabase())
    .from('users')
    .update({ pace_preference: pace, morning_preference: morning })
    .eq('id', userId)
    .select('id');

  if (error) throw error;
  if (!data || data.length === 0) throw new Error('zero_rows_updated');
}
