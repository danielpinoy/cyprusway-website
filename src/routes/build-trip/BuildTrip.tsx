import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { UserPlus } from 'lucide-react';

import { Layout } from '../../components/shell/Layout';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../lib/SessionProvider';

import {
  createTrip,
  isBaseLocation,
  MAX_TRIP_DAYS,
  MAX_TRIP_NAME,
  type BaseLocation,
} from '../../lib/trips';
import { addDays, daysBetween, minTripStart, parseIso, toIso } from '../../lib/tripDates';
import { regionOptions } from '../../lib/explore';
import { explorePool } from '../../lib/rails';
import { useHomeData } from '../home/useHomeData';
import { ShellError } from '../home/ShellError';
import styles from './BuildTrip.module.css';

/**
 * Build My Trip — setup. Figma `3427-15775`.
 *
 * Creates an empty itinerary and hands off to the editor. This is the one screen that
 * writes `itinerary_data` directly, and it writes `{"days": []}`; everything after this
 * goes through `trip-edit`.
 *
 * **Prerendered, so the first render reads no session** — same rule as Ask Pete. A
 * signed-in visitor hydrates against a file that has no session in it, and React keeps
 * server attributes when they disagree.
 */
export default function BuildTrip() {
  const { t, lang } = useI18n();
  const { user, status: sessionStatus, openAuth } = useSession();
  const navigate = useNavigate();
  const data = useHomeData();

  const [name, setName] = useState('');
  const [region, setRegion] = useState<BaseLocation | null>(null);
  const minStart = useMemo(() => toIso(minTripStart()), []);
  const [start, setStart] = useState(minStart);
  const [end, setEnd] = useState(() => toIso(addDays(minTripStart(), 2)));
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  /**
   * The chips.
   *
   * From the catalogue, so the labels are translated and a seventh destination appearing
   * in Directus needs no code change — **intersected with the six slugs `trip-generate`
   * accepts**, because `base_location` has no CHECK and a manual trip never reaches that
   * validation. A row stored with an unknown region is only refused much later, by
   * something else.
   *
   * The frame's own six chips are not this set: it draws Paphos, Ayia Napa, Larnaka,
   * Limassol, Paralimni and "Other". "Ayia Napa" and "Paralimni" are both inside the one
   * `famagusta` destination; **"Other" is not a slug at all**; and Troodos and Nicosia,
   * two of the six real regions, have no chip.
   *
   * Text-only. The frame gives each a 24px photo disc and `destination.hero_image` is null
   * on all six — the same standing departure phase 3 made for Explore's region chips.
   */
  const regions = useMemo(() => {
    const places = explorePool(data.places);
    return regionOptions(places, null, lang).filter((option) => isBaseLocation(option.slug));
  }, [data.places, lang]);

  const startYmd = parseIso(start);
  const endYmd = parseIso(end);
  const span = startYmd && endYmd ? daysBetween(startYmd, endYmd) + 1 : 0;

  const nameError = name.trim().length === 0;
  const spanError = span < 1 || span > MAX_TRIP_DAYS;
  const startError = start < minStart;
  const canCreate =
    !nameError && !spanError && !startError && region != null && !busy && user != null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canCreate || !user || !region) return;
    setBusy(true);
    setFailed(false);
    try {
      const id = await createTrip({
        userId: user.id,
        name: name.trim().slice(0, MAX_TRIP_NAME),
        baseLocation: region,
        startIso: start,
        endIso: end,
      });
      navigate(`/trip/${id}`);
    } catch (error) {
      console.warn('[build-trip] create failed:', error);
      setFailed(true);
      setBusy(false);
    }
  }

  if (import.meta.env.DEV && data.status === 'misconfigured') {
    return <ShellError onReload={data.retry} />;
  }

  const resolving = sessionStatus === 'resolving';
  const signedOut = !resolving && !user;

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.inner}>
          <header className={styles.head}>
            <h1 className={styles.title}>{t('ui_trip_setup_title')}</h1>
            <p className={styles.subtitle}>{t('ui_trip_setup_sub')}</p>
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
            <form className={styles.form} onSubmit={submit}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="cw-trip-name">
                  {t('ui_trip_name_label')}
                </label>
                <input
                  id="cw-trip-name"
                  className={styles.input}
                  value={name}
                  maxLength={MAX_TRIP_NAME}
                  placeholder={t('ui_trip_name_placeholder')}
                  onChange={(event) => setName(event.target.value)}
                  disabled={resolving}
                />
              </div>

              <fieldset className={styles.field}>
                <legend className={styles.label}>{t('ui_trip_region_label')}</legend>
                <ul className={styles.chips}>
                  {regions.map((option) => (
                    <li key={option.slug}>
                      <button
                        type="button"
                        className={styles.chip}
                        aria-pressed={region === option.slug}
                        onClick={() =>
                          setRegion(
                            isBaseLocation(option.slug) ? (option.slug as BaseLocation) : null,
                          )
                        }
                      >
                        {option.name}
                      </button>
                    </li>
                  ))}
                </ul>
                {regions.length === 0 && data.status === 'loading' && (
                  <p className={styles.hint}>{t('ui_loading')}</p>
                )}
              </fieldset>

              <fieldset className={styles.field}>
                <legend className={styles.label}>{t('ui_trip_dates_label')}</legend>
                {/* Native date inputs rather than the app's hand-rolled month grid: the app
                    builds one because React Native has no date control, and the browser's
                    is keyboard-accessible, localised and honours min/max for free. */}
                <div className={styles.dates}>
                  <div className={styles.dateField}>
                    <label className={styles.small} htmlFor="cw-trip-from">
                      {t('ui_trip_from')}
                    </label>
                    <input
                      id="cw-trip-from"
                      type="date"
                      className={styles.input}
                      value={start}
                      min={minStart}
                      onChange={(event) => {
                        setStart(event.target.value);
                        if (event.target.value > end) setEnd(event.target.value);
                      }}
                    />
                  </div>
                  <div className={styles.dateField}>
                    <label className={styles.small} htmlFor="cw-trip-to">
                      {t('ui_trip_to')}
                    </label>
                    <input
                      id="cw-trip-to"
                      type="date"
                      className={styles.input}
                      value={end}
                      min={start}
                      max={startYmd ? toIso(addDays(startYmd, MAX_TRIP_DAYS - 1)) : undefined}
                      onChange={(event) => setEnd(event.target.value)}
                    />
                  </div>
                </div>
                <p className={styles.hint} role="status">
                  {spanError
                    ? t('ui_trip_span_error', { max: MAX_TRIP_DAYS })
                    : t('ui_trip_span', { count: span })}
                </p>
              </fieldset>

              {failed && (
                <p className={styles.error} role="status">
                  {t('ui_trip_create_failed')}
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={!canCreate}
                aria-disabled={!canCreate}
              >
                {busy ? t('ui_trip_creating') : t('ui_trip_create')}
              </Button>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
