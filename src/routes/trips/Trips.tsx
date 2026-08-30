import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { CalendarRange, MapPin, UserPlus } from 'lucide-react';

import { Layout } from '../../components/shell/Layout';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../lib/SessionProvider';
import { directusImageSrcSet, directusImageUrl } from '../../lib/directusImage';
import { fetchAllTrips, type TripSummary } from '../../lib/trips';
import { PlannerEntry } from '../plan-trip/PlannerEntry';
import { formatDate } from '../../lib/tripDates';
import styles from './Trips.module.css';

const COVER = { width: 320, height: 180 };

/**
 * My Trips — every trip the account owns.
 *
 * Not in the frames, and built because without it the web is a dead end: a trip created
 * for next month is not "running today", so the homepage Continue card — which shows the
 * active trip plus one other by `updated_at` — cannot reach a third. Creating something
 * you then cannot find is a worse outcome than an unfamiliar screen, and this unparks the
 * `my-trips` navigation item at the same time.
 *
 * Prerendered like the other account-gated routes, so the first render reads no session.
 */
export default function Trips() {
  const { t, lang } = useI18n();
  const { user, status: sessionStatus, openAuth } = useSession();
  const [trips, setTrips] = useState<TripSummary[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) {
      setTrips(null);
      return;
    }
    let cancelled = false;
    void fetchAllTrips()
      .then((rows) => {
        if (!cancelled) setTrips(rows);
      })
      .catch((error) => {
        console.warn('[trips] read failed:', error);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const resolving = sessionStatus === 'resolving';
  const signedOut = !resolving && !user;

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.inner}>
          <header className={styles.head}>
            <h1 className={styles.title}>{t('ui_trips_title')}</h1>
            <p className={styles.subtitle}>{t('ui_trips_sub')}</p>
          </header>

          {signedOut ? (
            <div className={styles.signIn}>
              <span className={styles.signInMark} aria-hidden="true">
                <Icon as={UserPlus} size={24} />
              </span>
              <div className={styles.signInCopy}>
                <p className={styles.signInTitle}>{t('ui_trip_signin_title')}</p>
                <p className={styles.signInBody}>{t('ui_trip_signin_body')}</p>
              </div>
              <Button variant="primary" onClick={() => openAuth('signup')}>
                {t('ui_pete_signin_cta')}
              </Button>
            </div>
          ) : (
            <>
              {/* Both ways to make a trip, in one place: Pete builds the whole thing, or
                  you build it yourself. Signed-in only — signed out, the panel above is
                  the only thing on this page that can lead anywhere. */}
              <PlannerEntry />

              <p className={styles.newRow}>
                <Link to="/build-trip" className={styles.new}>
                  {t('ui_trips_new')}
                </Link>
              </p>

              {resolving || trips === null ? (
                failed ? (
                  <p className={styles.empty}>{t('ui_error_body')}</p>
                ) : (
                  <p className={styles.empty} role="status">
                    {t('ui_loading')}
                  </p>
                )
              ) : trips.length === 0 ? (
                <div className={styles.emptyState}>
                  <p className={styles.emptyTitle}>{t('ui_trips_empty_title')}</p>
                  <p className={styles.empty}>{t('ui_trips_empty_body')}</p>
                </div>
              ) : (
                <ul className={styles.grid}>
                  {trips.map((trip) => (
                    <li key={trip.id}>
                      <Link
                        to={`/trip/${trip.id}`}
                        className={styles.card}
                        aria-label={t('ui_trips_open', {
                          name: trip.name ?? t('ui_trip_untitled'),
                        })}
                      >
                        {trip.coverUrl ? (
                          <img
                            className={styles.cover}
                            src={directusImageUrl(trip.coverUrl, COVER)}
                            srcSet={directusImageSrcSet(trip.coverUrl, COVER)}
                            width={COVER.width}
                            height={COVER.height}
                            alt=""
                            loading="lazy"
                          />
                        ) : (
                          <span className={styles.coverEmpty} aria-hidden="true">
                            <Icon as={MapPin} size={24} />
                          </span>
                        )}
                        <span className={styles.body}>
                          <span className={styles.name}>
                            {trip.name ?? t('ui_trip_untitled')}
                          </span>
                          <span className={styles.meta}>
                            <Icon as={CalendarRange} size={12} />
                            <span>
                              {trip.tripStart ? formatDate(trip.tripStart, lang) : ''}
                              {trip.tripEnd ? ` – ${formatDate(trip.tripEnd, lang)}` : ''}
                            </span>
                          </span>
                          <span className={styles.days}>
                            {trip.dayCount === 1
                              ? t('ui_trips_days_one')
                              : t('ui_trips_days', { count: trip.dayCount })}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
