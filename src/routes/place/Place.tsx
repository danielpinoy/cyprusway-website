import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Heart, MapPin } from 'lucide-react';

import { Layout } from '../../components/shell/Layout';
import { PlaceCard } from '../../components/home/PlaceCard';
import { Rail } from '../../components/home/Rail';
import { Icon } from '../../components/ui/Icon';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../lib/SessionProvider';
import { localised, type Place as PlaceRow } from '../../lib/places';
import { POPULAR_COUNT, popularBand, renderablePool } from '../../lib/rails';
import { seededShuffle, sessionSeed } from '../../lib/shuffle';
import { isPlaceSaved, savePlace, unsavePlace } from '../../lib/saved';
import { useHomeData } from '../home/useHomeData';
import { ShellError } from '../home/ShellError';
import { MisconfiguredNotice } from '../home/MisconfiguredNotice';
import { Gallery } from './Gallery';
import styles from './Place.module.css';

/**
 * The place detail page, `/place/<slug>`.
 *
 * Resolved from the catalogue already in memory, so arriving from Explore or a rail costs no
 * extra request; a cold direct load fetches the catalogue once, exactly as the homepage does.
 *
 * **Overview only, and no tab bar.** The frame draws Overview / Tours / Hotels / Activities;
 * three of the four are booking surfaces and `affiliate_routes` is empty, so a tab bar with
 * one tab would be chrome that explains nothing. The map panel and the Virtual Tour panel are
 * absent for the reasons in docs/PARKED.md — the tour panel is structured so it returns on its
 * own the day a place has one.
 *
 * **"Best time to visit" is not here.** `translations.en` carries exactly `name`,
 * `description` and `short_description` on all 181 rows, and there is no best-time column
 * anywhere on `places_sync`. The frame's line is editorial copy that does not exist.
 */
export default function Place() {
  const { slug } = useParams<{ slug: string }>();
  const { t, lang } = useI18n();
  const data = useHomeData();

  const place = useMemo(
    () => data.places.find((candidate) => candidate.slug === slug) ?? null,
    [data.places, slug],
  );

  /* Title AND description. The prerendered HTML carries both; this keeps them right after
     a client-side navigation, and it is the route's own job now that useDocumentHead
     leaves dynamic paths alone. */
  useEffect(() => {
    if (!place) return;
    document.title = t('ui_meta_place_title', { name: place.name });
    const region = localised(place.regionName, lang);
    const description =
      place.short?.trim() ||
      (region
        ? t('ui_meta_place_desc', { name: place.name, region })
        : t('ui_meta_place_desc_any', { name: place.name }));
    let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!tag) {
      tag = document.createElement('meta');
      tag.name = 'description';
      document.head.appendChild(tag);
    }
    tag.content = description;
  }, [place, t, lang]);

  if (import.meta.env.DEV && data.status === 'misconfigured') {
    return <MisconfiguredNotice onRetry={data.retry} />;
  }
  if (data.status === 'error' || data.status === 'misconfigured') {
    return <ShellError onReload={data.retry} />;
  }

  if (data.status === 'loading') {
    return (
      <Layout>
        <div className={styles.page}>
          <div className={styles.inner} aria-busy="true">
            <p className="cw-visually-hidden" role="status">
              {t('ui_loading')}
            </p>
            <div className={styles.skeletonTitle} aria-hidden="true" />
            <div className={styles.skeletonGallery} aria-hidden="true" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!place) return <PlaceNotFound />;

  return (
    <Layout>
      <article className={styles.page}>
        <div className={styles.inner}>
          <Header place={place} />
          <Gallery place={place} />
          <Details place={place} />
        </div>
        <PopularRail places={data.places} excludeId={place.id} />
      </article>
    </Layout>
  );
}

function Header({ place }: { place: PlaceRow }) {
  const { lang } = useI18n();
  const region = localised(place.regionName, lang);

  return (
    <header className={styles.header}>
      <div>
        {/* lang="en" because `translations` carries English on all 181 rows and nothing
            else. A screen reader switches voice rather than reading English with the
            interface language's phonemes; a no-op when the interface is English. */}
        <h1 className={styles.title} lang="en">
          {place.name}
        </h1>
        {region && (
          <p className={styles.region}>
            <Icon as={MapPin} size={14} />
            <span>{region}</span>
          </p>
        )}
      </div>
      <SaveButton place={place} />
    </header>
  );
}

/**
 * The save control — the affordance phase 2 recorded as the thing that unparks the Saved
 * Places rail, which until now no path could reach.
 *
 * Hidden entirely for a signed-out visitor rather than shown and then refused: `saved_places`
 * has nothing for `anon`, so the button would be an invitation to a 42501.
 */
function SaveButton({ place }: { place: PlaceRow }) {
  const { t } = useI18n();
  const { user } = useSession();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void isPlaceSaved(place.id)
      .then((value) => {
        if (!cancelled) setSaved(value);
      })
      .catch(() => {
        /* Reads are not worth an error state here; the button simply starts unpressed. */
      });
    return () => {
      cancelled = true;
    };
  }, [user, place.id]);

  if (!user) return null;

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    const next = !saved;
    try {
      if (next) await savePlace(user!.id, place.id);
      else await unsavePlace(place.id);
      setSaved(next);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.saveWrap}>
      <button
        type="button"
        className={styles.save}
        aria-pressed={saved}
        disabled={busy}
        onClick={() => void toggle()}
      >
        <Icon as={Heart} size={18} className={saved ? styles.saveIconOn : undefined} />
        <span>{saved ? t('ui_place_saved') : t('ui_place_save')}</span>
      </button>
      {failed && (
        <p className={styles.saveError} role="status">
          {t('ui_place_save_failed')}
        </p>
      )}
    </div>
  );
}

function Details({ place }: { place: PlaceRow }) {
  const { t, lang } = useI18n();

  return (
    <div className={styles.details}>
      {place.badges.length > 0 && (
        <section className={styles.section} aria-labelledby="cw-place-features">
          <h2 id="cw-place-features" className={styles.sectionTitle}>
            {t('ui_place_features')}
          </h2>
          <ul className={styles.badges}>
            {place.badges.map((badge) => (
              <li key={badge.slug} className={styles.badge}>
                {localised(badge.name, lang)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* The gallery fallback already carries `short` as its blurb, and 108 of 181 places
          have no images — printing it again directly underneath was the commonest case,
          not the edge one. */}
      {place.short && place.images.length > 0 && (
        <p className={styles.standfirst} lang="en">
          {place.short}
        </p>
      )}

      {place.description.length > 0 && (
        <section className={styles.section} aria-labelledby="cw-place-about">
          <h2 id="cw-place-about" className={styles.sectionTitle}>
            {t('ui_place_about', { name: place.name })}
          </h2>
          {/* EditorJS, measured across all 181 rows: paragraph blocks only, a single `text`
              field, no inline HTML. Rendered as text rather than through
              dangerouslySetInnerHTML — correct today and safe if markup ever appears. */}
          <div className={styles.prose} lang="en">
            {place.description.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </section>
      )}

      {place.visitDurationMinutes != null && (
        <p className={styles.duration}>
          {t('ui_place_duration', { minutes: place.visitDurationMinutes })}
        </p>
      )}
    </div>
  );
}

function PopularRail({ places, excludeId }: { places: readonly PlaceRow[]; excludeId: number }) {
  const popular = useMemo(() => {
    const pool = renderablePool(places);
    const band = popularBand(pool, new Set([excludeId]));
    return seededShuffle(band, sessionSeed()).slice(0, POPULAR_COUNT);
  }, [places, excludeId]);

  if (popular.length === 0) return null;

  return (
    <div className={styles.popular}>
      <div className={styles.inner}>
        <Rail titleKey="ui_rail_popular" scrollBy={204}>
          {popular.map((place) => (
            <PlaceCard key={place.id} place={place} size="small" />
          ))}
        </Rail>
      </div>
    </div>
  );
}

/**
 * A slug that does not resolve.
 *
 * The Worker serves the SPA shell for `/place/*` so a place published since the last deploy
 * still opens, which means a bad slug arrives here with a 200. The `noindex` is what keeps
 * that from becoming an indexed soft 404 — see docs/PHASE-3-PLAN.md §4.
 */
function PlaceNotFound() {
  const { t } = useI18n();

  useEffect(() => {
    document.title = t('ui_place_not_found_title');
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, [t]);

  return (
    <Layout>
      <div className={styles.notFound}>
        <h1 className={styles.notFoundTitle}>{t('ui_place_not_found_title')}</h1>
        <p className={styles.notFoundBody}>{t('ui_place_not_found_body')}</p>
        <Link to="/explore" className={styles.notFoundCta}>
          {t('ui_place_not_found_cta')}
        </Link>
      </div>
    </Layout>
  );
}
