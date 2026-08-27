import type { Session, User } from '@supabase/supabase-js';

import { getSupabase } from './supabase';

export type Provider = 'google' | 'apple';

/** What the OAuth return leg left in the URL, read before anything async runs. */
export interface AuthParams {
  hasCode: boolean;
  hasError: boolean;
}

/* PKCE puts the authorisation code and any failure in the QUERY STRING:
 *   ?code=…
 *   ?error=access_denied&error_code=…&error_description=…
 *
 * The implicit flow put them in the fragment, and the vanilla implementation read
 * `location.hash` only. Ported unchanged under PKCE it would never fire — no error
 * banner, no interests screen, just a signed-in user on an untouched page. Both are
 * read here so the router is correct under either flow, query first.
 *
 * Read synchronously, before the client is constructed: detectSessionInUrl strips
 * these during initialisation, so this is the only safe moment.
 */
export function readAuthParams(): AuthParams {
  if (typeof window === 'undefined') return { hasCode: false, hasError: false };

  const query = new URLSearchParams(window.location.search);
  const fragment = new URLSearchParams(
    window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '',
  );

  const has = (name: string) => query.has(name) || fragment.has(name);

  return {
    hasCode: has('code') || has('access_token'),
    hasError: has('error') || has('error_code'),
  };
}

/** Drop the auth parameters so a reload cannot replay them. */
export function clearAuthParams(): void {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  for (const name of [
    'code',
    'error',
    'error_code',
    'error_description',
    'access_token',
    'refresh_token',
    'expires_in',
    'expires_at',
    'token_type',
    'provider_token',
  ]) {
    url.searchParams.delete(name);
  }
  url.hash = '';

  window.history.replaceState(null, '', `${url.pathname}${url.search}`);
}

/* Supabase persists its session under `sb-<project-ref>-auth-token`. Scanned rather
 * than reconstructed from the project ref, so changing project cannot silently break
 * the probe. Worst case if the key format ever changes: a signed-in visitor's shell
 * does not auto-resolve until they act, which is a degradation, not a failure. */
export function hasStoredSession(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && /^sb-.+-auth-token$/.test(key)) return true;
    }
  } catch {
    /* Storage blocked. Treat as no session. */
  }
  return false;
}

/** Sign in and sign up are the same action: signInWithOAuth creates the account if
 *  it does not exist, which is why there is no separate sign-up screen. */
export async function signInWithProvider(provider: Provider): Promise<void> {
  const { error } = await getSupabase().auth.signInWithOAuth({
    provider,
    options: {
      /* Built from the current origin at click time, never hardcoded. The allowlist
         covers production, 127.0.0.1:5500 and the Workers preview wildcard, so a
         preview deployment can complete a real sign-in unchanged. */
      redirectTo: window.location.origin + window.location.pathname,
    },
  });

  if (error) throw error;
  /* On success the browser is navigating away; the caller leaves the button pending. */
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await getSupabase().auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw error;
}

/** The header shows initials: `users` has no avatar column (20 columns, measured).
 *  TODO(contracts): avatar needs a column or a storage convention before the
 *  photo the Figma header draws can be rendered. */
export function initialsFor(user: User): string {
  const metadata = user.user_metadata as { full_name?: unknown; name?: unknown } | null;
  const name =
    (typeof metadata?.full_name === 'string' && metadata.full_name) ||
    (typeof metadata?.name === 'string' && metadata.name) ||
    user.email ||
    '';

  const words = name.split(/[\s@._-]+/).filter(Boolean);
  const letters = words.slice(0, 2).map((word) => word[0] ?? '');
  return letters.join('').toUpperCase() || '?';
}

export function displayNameFor(user: User): string {
  const metadata = user.user_metadata as { full_name?: unknown } | null;
  if (typeof metadata?.full_name === 'string' && metadata.full_name) return metadata.full_name;
  return user.email ?? '';
}
