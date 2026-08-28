import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Map as MapIcon, Pencil, UserPlus } from 'lucide-react';

import { Layout } from '../../components/shell/Layout';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Modal } from '../../components/ui/Modal';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../lib/SessionProvider';
import { deleteTrip, MAX_TRIP_DAYS } from '../../lib/trips';
import { fetchIsPremium } from '../../lib/profile';
import { downloadTripPdf } from '../../lib/tripPdf';
import { formatDayHeading, formatTime } from '../../lib/tripDates';
import type { TripElement } from '../../lib/tripEdit';
import { AddToTrip } from './AddToTrip';
import { DayList } from './DayList';
import { useTripEditor } from './useTripEditor';
import styles from './Trip.module.css';

/**
 * The trip editor, `/trip/:id`.
 *
 * **Every change goes through `trip-edit`** — reorder, add, remove, add a day, remove a
 * day, rename. The one exception is deleting the whole trip, which `trip-edit` has no
 * operation for and which is a row delete rather than a document edit.
 *
 * **Private, and never indexed.** This renders one person's data behind their session, so
 * it is not prerendered, the Worker serves the SPA shell for `/trip/*`, and the page sets
 * `noindex` unconditionally — not only when the trip is missing.
 */
export default function Trip() {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useI18n();
  const { user, status: sessionStatus, openAuth } = useSession();
  const editor = useTripEditor(id, sessionStatus !== 'resolving' && user != null);
  const { state, status } = editor;

  const [view, setView] = useState<'list' | 'map'>('list');
  const [collapsed, setCollapsed] = useState<ReadonlySet<number>>(new Set());
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [premium, setPremium] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfFailed, setPdfFailed] = useState(false);

  /* Never indexed, whatever the outcome — the content is one account's itinerary. */
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);

  /* This route owns its head: `useDocumentHead` deliberately leaves dynamic paths alone,
     because falling through to the 404 metadata is what it used to do to them. */
  useEffect(() => {
    document.title = state.name
      ? `${state.name} — CyprusWay`
      : t('ui_meta_trips_title');
  }, [state.name, t]);

  /* `trip-pdf` is premium-gated (403 `premium_required`). The button is rendered only for
     an account that can use it and is absent otherwise — never disabled, the same call
     phase 4 made for "Unlock Unlimited". */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void fetchIsPremium(user.id).then((value) => {
      if (!cancelled) setPremium(value);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const existingByDay = useMemo(
    () =>
      state.days.map((day) =>
        day.pois
          .filter((element: TripElement) => element.type === 'poi')
          .map((element) => element.place_id)
          .filter((value): value is number => typeof value === 'number'),
      ),
    [state.days],
  );

  /**
   * Signed out.
   *
   * Checked BEFORE the load result, because RLS makes a trip that exists and a trip that
   * is not yours indistinguishable — a signed-out read returns no row, and reporting that
   * as "this trip is not here" would be telling somebody their own trip is gone because
   * they are not logged in. The link is theirs; the session is what is missing.
   */
  if (sessionStatus !== 'resolving' && !user) {
    return (
      <Layout>
        <div className={styles.page}>
          <div className={styles.inner}>
            <div className={styles.signIn}>
              <span className={styles.signInMark} aria-hidden="true">
                <Icon as={UserPlus} size={24} />
              </span>
              <div className={styles.signInCopy}>
                <p className={styles.signInTitle}>{t('ui_trip_signin_title')}</p>
                <p className={styles.signInBody}>{t('ui_trip_signin_body')}</p>
              </div>
              <Button variant="primary" onClick={() => openAuth('signin')}>
                {t('ui_pete_signin_cta')}
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (sessionStatus === 'resolving' || status === 'loading') {
    return (
      <Layout>
        <div className={styles.page}>
          <div className={styles.inner} aria-busy="true">
            <p className="cw-visually-hidden" role="status">
              {t('ui_loading')}
            </p>
            <div className={styles.skeletonTitle} aria-hidden="true" />
            <div className={styles.skeletonBlock} aria-hidden="true" />
          </div>
        </div>
      </Layout>
    );
  }

  if (deleted) return <Gone message={t('ui_trip_deleted')} />;
  if (status === 'missing') return <Gone message={t('ui_trip_not_found_body')} />;
  if (status === 'error') return <Gone message={t('ui_error_body')} />;

  const dayCount = state.days.length;

  return (
    <Layout>
      <article className={styles.page}>
        <div className={styles.inner}>
          <header className={styles.head}>
            {renaming ? (
              <form
                className={styles.renameForm}
                onSubmit={(event) => {
                  event.preventDefault();
                  editor.rename(draftName);
                  setRenaming(false);
                }}
              >
                <label className="cw-visually-hidden" htmlFor="cw-trip-rename">
                  {t('ui_trip_rename')}
                </label>
                <input
                  id="cw-trip-rename"
                  className={styles.renameInput}
                  value={draftName}
                  maxLength={120}
                  onChange={(event) => setDraftName(event.target.value)}
                />
                <Button type="submit" variant="primary">
                  {t('ui_trip_rename_save')}
                </Button>
                <Button type="button" variant="provider" onClick={() => setRenaming(false)}>
                  {t('ui_trip_cancel')}
                </Button>
              </form>
            ) : (
              <h1 className={styles.title}>
                <span>{state.name || t('ui_trip_untitled')}</span>
                <button
                  type="button"
                  className={styles.rename}
                  onClick={() => {
                    setDraftName(state.name ?? '');
                    setRenaming(true);
                  }}
                  aria-label={t('ui_trip_rename')}
                >
                  <Icon as={Pencil} size={16} />
                </button>
              </h1>
            )}

            <div className={styles.toggle} role="group" aria-label={t('ui_trip_list')}>
              <button
                type="button"
                className={styles.toggleButton}
                aria-pressed={view === 'list'}
                onClick={() => setView('list')}
              >
                {t('ui_trip_list')}
              </button>
              <button
                type="button"
                className={styles.toggleButton}
                aria-pressed={view === 'map'}
                onClick={() => setView('map')}
              >
                {t('ui_trip_map')}
              </button>
            </div>
          </header>

          {/* One polite region for everything the server says back. */}
          <p className="cw-visually-hidden" role="status" aria-live="polite">
            {state.saving ? t('ui_trip_saving') : ''}
          </p>

          {state.notice && (
            <p className={styles.notice} role="status">
              {state.notice.kind === 'conflict'
                ? t('ui_trip_conflict')
                : state.notice.kind === 'auth'
                  ? t('ui_trip_auth_failed')
                  : state.notice.kind === 'gone'
                    ? t('ui_trip_gone')
                    : state.notice.kind === 'offline'
                      ? t('ui_trip_offline')
                      : state.notice.kind === 'blocked'
                        ? t('ui_trip_blocked')
                        : t('ui_trip_save_failed')}
            </p>
          )}

          {state.warnings.length > 0 && (
            <ul className={styles.warnings}>
              {state.warnings.map((warning, index) => (
                /* Server-authored English prose. It is not in the dictionary and cannot
                   be — see docs/TRANSLATION-QUEUE.md. */
                <li key={`${warning.rule}-${index}`} lang="en">
                  {warning.message}
                </li>
              ))}
            </ul>
          )}

          {view === 'list' ? (
            <DayList
              days={state.days}
              collapsed={collapsed}
              onToggleDay={(key) =>
                setCollapsed((previous) => {
                  const next = new Set(previous);
                  if (next.has(key)) next.delete(key);
                  else next.add(key);
                  return next;
                })
              }
              onMoveStop={editor.moveStop}
              onMoveStopToDay={editor.moveStopToDay}
              onRemoveStop={editor.removeStop}
              onRemoveDay={editor.removeDay}
            />
          ) : (
            <MapPanel days={state.days} lang={lang} />
          )}

          <div className={styles.actions}>
            <Button variant="primary" onClick={() => setAdding(true)}>
              {t('ui_trip_add_stops')}
            </Button>
            <Button
              variant="provider"
              disabled={dayCount >= MAX_TRIP_DAYS}
              onClick={() => editor.addDay()}
            >
              {t('ui_trip_add_day')}
            </Button>
            {premium && (
              <button
                type="button"
                className={styles.plain}
                disabled={pdfBusy}
                onClick={() => {
                  if (!id) return;
                  setPdfBusy(true);
                  setPdfFailed(false);
                  void downloadTripPdf(id, state.name)
                    .catch(() => setPdfFailed(true))
                    .finally(() => setPdfBusy(false));
                }}
              >
                {t('ui_trip_pdf')}
              </button>
            )}
            <button
              type="button"
              className={styles.danger}
              onClick={() => setConfirmDelete(true)}
            >
              {t('ui_trip_delete')}
            </button>
          </div>

          {pdfFailed && (
            <p className={styles.notice} role="status">
              {t('ui_trip_pdf_failed')}
            </p>
          )}
        </div>
      </article>

      <AddToTrip
        open={adding}
        onClose={() => setAdding(false)}
        days={dayCount}
        initialDay={0}
        existingByDay={existingByDay}
        onAdd={(dayIndex, placeIds) => editor.addStops(dayIndex, placeIds)}
      />

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        labelledBy="cw-trip-delete-title"
      >
        <h2 id="cw-trip-delete-title" className={styles.confirmTitle}>
          {t('ui_trip_delete_title')}
        </h2>
        <p className={styles.confirmBody}>{t('ui_trip_delete_body')}</p>
        <div className={styles.confirmActions}>
          <Button
            variant="primary"
            disabled={deleting}
            onClick={() => {
              if (!id) return;
              setDeleting(true);
              void deleteTrip(id)
                .then(() => setDeleted(true))
                .catch(() => {
                  setDeleting(false);
                  setConfirmDelete(false);
                });
            }}
          >
            {t('ui_trip_delete')}
          </Button>
          <Button variant="provider" onClick={() => setConfirmDelete(false)}>
            {t('ui_trip_cancel')}
          </Button>
        </div>
      </Modal>
    </Layout>
  );
}

/**
 * The map, parked since phase 3 and shipped here as a placeholder panel rather than by
 * removing the toggle.
 *
 * Unlike Explore, where Map was a toggle on a list, here it is a designed screen with its
 * own day tabs and its own stop rail — removing the toggle would delete a named
 * destination. So the shape stays, the rail beside it is real data, and only the map
 * surface says what is missing.
 */
function MapPanel({
  days,
  lang,
}: {
  days: ReturnType<typeof useTripEditor>['state']['days'];
  lang: string;
}) {
  const { t } = useI18n();
  const [dayIndex, setDayIndex] = useState(0);
  const day = days[Math.min(dayIndex, Math.max(days.length - 1, 0))];

  return (
    <div className={styles.map}>
      <ul className={styles.dayTabs}>
        {days.map((entry, index) => (
          <li key={entry.key}>
            <button
              type="button"
              className={styles.dayTab}
              aria-pressed={index === dayIndex}
              onClick={() => setDayIndex(index)}
            >
              {t('ui_trip_day_n', { n: index + 1 })}
            </button>
          </li>
        ))}
      </ul>

      <div className={styles.mapBody}>
        <ol className={styles.rail}>
          {(day?.pois ?? [])
            .filter((element) => element.type === 'poi')
            .map((element, index) => (
              <li key={`${element.place_id}-${index}`} className={styles.railItem}>
                <span className={styles.pin}>{index + 1}</span>
                <span className={styles.railName} lang="en">
                  {element.name}
                </span>
                <span className={styles.railTime}>{formatTime(element.start_time, lang)}</span>
              </li>
            ))}
          {day && day.pois.filter((element) => element.type === 'poi').length === 0 && (
            <li className={styles.railEmpty}>{t('ui_trip_empty_day')}</li>
          )}
        </ol>

        <div className={styles.placeholder}>
          <Icon as={MapIcon} size={32} className={styles.placeholderIcon} />
          <p className={styles.placeholderTitle}>{t('ui_trip_map_title')}</p>
          <p className={styles.placeholderBody}>{t('ui_trip_map_body')}</p>
          {day?.date && <p className={styles.placeholderDate}>{formatDayHeading(day.date, lang)}</p>}
        </div>
      </div>
    </div>
  );
}

function Gone({ message }: { message: string }) {
  const { t } = useI18n();
  return (
    <Layout>
      <div className={styles.gone}>
        <h1 className={styles.goneTitle}>{t('ui_trip_not_found_title')}</h1>
        <p className={styles.goneBody}>{message}</p>
        <Link to="/trips" className={styles.goneCta}>
          {t('ui_trips_title')}
        </Link>
      </div>
    </Layout>
  );
}
