import styles from './MisconfiguredNotice.module.css';

/**
 * Shown instead of the designed error page when the failure is Supabase credentials.
 *
 * The two are indistinguishable on screen otherwise — "Cyprus is still there", no network
 * request in the panel, nothing anywhere naming the cause — and only one of them is a
 * two-line fix by the person reading it. This has cost twenty minutes twice.
 *
 * Dev only. In production a visitor cannot fix a build-time variable, so they keep the
 * designed error page; `npm run check:env` on `prebuild` is what stops it reaching them,
 * and the console still names the cause.
 */
export function MisconfiguredNotice({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <p className={styles.tag}>Development only</p>
        <h1 className={styles.title}>Supabase credentials are missing or invalid</h1>
        <p className={styles.body}>
          This is a configuration problem, not a data outage. Nothing is wrong with the
          database or the network.
        </p>

        <ol className={styles.steps}>
          <li>
            <code>cp .env.example .env</code>
          </li>
          <li>
            Fill in <code>VITE_SUPABASE_ANON_KEY</code> — Supabase dashboard, Project
            Settings → API → Project API keys → anon public.
          </li>
          <li>
            <code>npm run check:env</code> to verify, then restart the dev server. Vite
            reads <code>.env</code> at startup, so an edit while it is running changes
            nothing.
          </li>
        </ol>

        <p className={styles.body}>
          A key that is present but rejected as <em>Invalid API key</em> is usually a
          doubled or truncated paste — <code>check:env</code> tests the JWT shape, not just
          that the line exists.
        </p>

        <button type="button" className={styles.retry} onClick={onRetry}>
          Try again
        </button>
      </div>
    </div>
  );
}
