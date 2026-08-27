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

export class MissingCredentialsError extends Error {
  constructor() {
    super(
      'Supabase credentials are missing. VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are ' +
        'inlined by Vite at build time. Locally: cp .env.example .env and fill in the anon ' +
        'key. In production: set both in the Cloudflare build environment. ' +
        '`npm run check:env` verifies both, including that the key is a well-formed JWT.',
    );
    this.name = 'MissingCredentialsError';
  }
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    /* Vite inlines VITE_* at build time, so this cannot be fixed at runtime: locally it
       means no .env, and in production it means a deployment built without the Cloudflare
       build-environment variables. Thrown as a named class so callers can tell a
       configuration problem from a data problem — the generic error page looks identical
       for both, and that has cost real time twice. */
    throw new MissingCredentialsError();
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
