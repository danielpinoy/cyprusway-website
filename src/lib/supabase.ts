import type { SupabaseClient } from '@supabase/supabase-js';

/* One client for the whole app, created lazily — and since phase "perf" (31 Aug 2026),
 * LOADED lazily too. The `import type` above is erased at compile time; the SDK's code
 * arrives through the dynamic import() below, in its own chunk.
 *
 * Before this, `supabase.ts` was statically imported by ten modules, which put the SDK
 * in the main chunk of every page: 203 KB raw / ~59 KB compressed, 30% of the chunk —
 * on the critical path of the catalogue fetch that every rail page makes before it can
 * render a card. Measured in docs/PERF-MEASUREMENT-2026-08-30.md. The catalogue read
 * itself no longer touches this module at all (see ./catalogueQuery.ts); what remains
 * behind getSupabase() is auth, profile, saved places, trips and Ask Pete.
 *
 * The prerender pass runs in Node with no `window` and no `localStorage`, and it must
 * never construct an auth client — nothing on that path calls getSupabase().
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

let pending: Promise<SupabaseClient> | null = null;

export async function getSupabase(): Promise<SupabaseClient> {
  /* The rejected promise is deliberately cached: the credentials are build-time
     constants, so a failure today cannot succeed on retry, and every caller awaits —
     the same MissingCredentialsError surfaces at each call site, exactly as the old
     synchronous throw did. */
  pending ??= createLazily();
  return pending;
}

async function createLazily(): Promise<SupabaseClient> {
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

  const { createClient } = await import('@supabase/supabase-js');

  return createClient(url, anonKey, {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}
