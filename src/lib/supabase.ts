import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/* One client for the whole app, created lazily.
 *
 * Lazily, for two reasons. The prerender pass runs in Node with no `window` and no
 * `localStorage`, and it must never construct an auth client. And a visitor who is
 * not signed in and has no OAuth parameters in the URL never needs one at all — the
 * client and its chunk are only fetched when there is something to resolve.
 *
 * flowType: 'pkce' — the auth code arrives in the query string and the SDK exchanges
 * it. The vanilla implementation used the implicit flow, which put tokens in the
 * fragment; see readAuthParams() in ./auth for why that difference matters.
 */

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    /* Almost always a deployment built without the Cloudflare build-environment
       variables set. Vite inlines VITE_* at build time, so this cannot be fixed at
       runtime — fail loudly rather than let every auth call return a confusing 401. */
    throw new Error(
      'Supabase credentials are missing. VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY ' +
        'must be set in the build environment.',
    );
  }

  client = createClient(url, anonKey, {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return client;
}
