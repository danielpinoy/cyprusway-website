import { getSupabase } from './supabase';
import type { InterestSlug } from '../contracts/interests';
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
}

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await getSupabase()
    .from('users')
    .select('onboarding_completed, interests')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('profile_row_missing');

  return {
    onboardingCompleted: data.onboarding_completed === true,
    interests: Array.isArray(data.interests) ? (data.interests as string[]) : [],
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
  const { data, error } = await getSupabase()
    .from('users')
    .update({ interests, onboarding_completed: true })
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
  const { error } = await getSupabase()
    .from('users')
    .update({ preferred_language: language })
    .eq('id', userId)
    .select('id');

  if (error) console.warn('[profile] preferred_language write failed:', error.message);
}
