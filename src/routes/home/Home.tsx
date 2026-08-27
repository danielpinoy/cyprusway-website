import { useEffect, useState } from 'react';

import { Layout } from '../../components/shell/Layout';
import { useSession, type SessionStatus } from '../../lib/SessionProvider';
import { Hero } from './Hero';
import { HomeContent } from './HomeContent';
import { HomeSkeleton } from './HomeSkeleton';
import { MisconfiguredNotice } from './MisconfiguredNotice';
import { ShellError } from './ShellError';
import { useHomeData } from './useHomeData';

/**
 * Dev-only state override, so the loading and error frames can be reviewed against Figma
 * 3562-24665 and 3558-21474 without having to make the network fail. Read after mount, so
 * it cannot desynchronise the prerendered markup from hydration. Stripped from production.
 */
function useStateOverride(): { status: SessionStatus | null; asUser: boolean } {
  const [override, setOverride] = useState<SessionStatus | null>(null);
  const [asUser, setAsUser] = useState(false);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const params = new URLSearchParams(window.location.search);
    const value = params.get('state');
    if (value === 'loading') setOverride('resolving');
    else if (value === 'error') setOverride('error');
    /* `&as=user` previews the signed-in skeleton, which is otherwise unreachable without
       completing a real sign-in. Presentational only — it does not fake a session, so the
       rails behind it still need one. */
    setAsUser(params.get('as') === 'user');
  }, []);

  return { status: override, asUser };
}

export default function Home() {
  const { status: sessionStatus, user, retry: retrySession } = useSession();
  const data = useHomeData();
  const { status: override, asUser } = useStateOverride();

  const failed =
    override === 'error' ||
    sessionStatus === 'error' ||
    data.status === 'error' ||
    data.status === 'misconfigured';
  const loading = override === 'resolving' || data.status === 'loading';

  /* A missing or malformed .env is a two-line fix, and on the designed error page it is
     indistinguishable from a data outage. Developers get told which; visitors cannot fix a
     build-time variable, so in production they keep the designed page. */
  if (import.meta.env.DEV && data.status === 'misconfigured') {
    return <MisconfiguredNotice onRetry={data.retry} />;
  }

  /* The error frame has no header and no footer, so it replaces the shell rather than
     rendering inside it. Only the home route can reach this: the about, FAQ, privacy and
     terms pages depend on neither the session nor the catalogue, so a failure there never
     covers them. */
  if (failed) {
    return (
      <ShellError
        onReload={() => {
          retrySession();
          data.retry();
        }}
      />
    );
  }

  /* The hero renders immediately, always. It is static copy that depends on no query, so
     skeletoning it would pretend it was waiting for something — and gating it on the
     catalogue emptied the prerendered HTML of the one thing on this page a crawler can
     read. Only the rails below wait. (The Figma loading frame does skeleton its hero,
     because the app's hero carries a greeting and a place count; ours carries neither.) */
  return (
    <Layout>
      <Hero />
      {loading ? <HomeSkeleton signedIn={user != null || asUser} /> : <HomeContent data={data} />}
    </Layout>
  );
}
