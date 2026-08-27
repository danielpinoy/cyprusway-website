import { useEffect, useState } from 'react';

import { Layout } from '../../components/shell/Layout';
import { useSession, type SessionStatus } from '../../lib/SessionProvider';
import { Hero } from './Hero';
import { HeroSkeleton } from './HeroSkeleton';
import { ShellError } from './ShellError';

/**
 * Dev-only state override, so the loading and error frames can be reviewed against
 * Figma 3562-24665 and 3558-21474 without having to make the network fail.
 * Read after mount, so it cannot desynchronise the prerendered markup from hydration.
 * Stripped from production builds.
 */
function useStateOverride(): SessionStatus | null {
  const [override, setOverride] = useState<SessionStatus | null>(null);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const value = new URLSearchParams(window.location.search).get('state');
    if (value === 'loading') setOverride('resolving');
    else if (value === 'error') setOverride('error');
  }, []);

  return override;
}

export default function Home() {
  const { status, retry } = useSession();
  const override = useStateOverride();
  const effective = override ?? status;

  /* The error frame has no header and no footer, so it replaces the shell rather than
     rendering inside it. Only the home route can reach this: the about, FAQ, privacy
     and terms pages do not depend on the session or the profile row, so a failure
     there never covers them. */
  if (effective === 'error') return <ShellError onReload={retry} />;

  return <Layout>{effective === 'resolving' ? <HeroSkeleton /> : <Hero />}</Layout>;
}
