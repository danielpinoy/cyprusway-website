import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { UserPlus } from 'lucide-react';

import { Layout } from '../../components/shell/Layout';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../lib/SessionProvider';
import {
  applyLimit,
  ASSUMED_FREE_DAILY_CAP,
  currentAccessToken,
  fetchHistory,
  fetchPlaceRefs,
  fetchQuota,
  MESSAGE_MAX_LENGTH,
  rejectedBeforeRecording,
  streamAskPete,
  type AskPeteFailureKind,
  type MikePlace,
  type Quota,
} from '../../lib/askPete';
import { Composer } from './Composer';
import { Thread, type ChatItem, type NoticeKind } from './Thread';
import styles from './AskPete.module.css';

/**
 * Ask Pete, `/ask-pete`.
 *
 * Phase 1 wired no path — both nav tables carried `{ id: 'ask-pete', pending: true }`
 * with no `to`, and there is no `ask-pete.html` on `main`, so nothing legacy is owed.
 * `/ask-pete` matches the app's own route and the id already in the table.
 *
 * **The thread is shared with the phone.** `ai_conversations` is UNIQUE (user_id): one
 * rolling conversation per person, one counter. Somebody who asked three questions on
 * their phone this morning opens this and sees those messages and "3 of 5 today". That
 * is the design, not a bug to reconcile away.
 *
 * **Prerendered, and the first render must not read a session.** This file ships as a
 * static HTML page with no session in it, and a signed-in visitor hydrates against it.
 * React does not patch attribute mismatches found during hydration — it keeps what the
 * server sent — which is exactly how phase 3's Explore chips ended up permanently wrong.
 * It is safe here because `useSession` starts `resolving` on both sides and this screen
 * renders its loading shape until that lands. Nothing on it may be derived from a
 * session, a query string or `localStorage` during the first render.
 */

/** The app's own starters, word for word, and identical to the frame. */
const STARTER_KEYS = ['ui_pete_starter_1', 'ui_pete_starter_2', 'ui_pete_starter_3'] as const;

/** How close to the bottom still counts as following the stream. */
const STICK_TO_BOTTOM_PX = 48;

let itemSeq = 0;
function nextId(prefix: string): string {
  itemSeq += 1;
  return `${prefix}-${itemSeq}`;
}

export default function AskPete() {
  const { t, lang } = useI18n();
  const { user, status: sessionStatus, openAuth } = useSession();
  const location = useLocation();
  const userId = user?.id ?? null;

  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [quota, setQuota] = useState<Quota | null>(null);
  /**
   * Whether the history read has RESOLVED — not whether it returned rows. The greeting
   * is only correct when the server confirmed an empty window; "not read yet" is not the
   * same as empty, and rendering the greeting on a cold open would flash a fresh start at
   * somebody who has a thread.
   */
  const [historyResolved, setHistoryResolved] = useState(false);
  /** The finished answer, announced once. See the live region below. */
  const [announcement, setAnnouncement] = useState('');

  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const abort = useRef<AbortController | null>(null);

  const starters = useMemo(() => STARTER_KEYS.map((key) => t(key)), [t]);

  /* A question handed over from the homepage hero. Router state, not a query parameter:
     `/ask-pete` is prerendered as one file, so a `?q=` would be read during the first
     client render and disagree with markup that never had it — the hydration hazard
     above. State lives outside the URL, so it cannot. */
  useEffect(() => {
    const handoff = (location.state as { question?: unknown } | null)?.question;
    if (typeof handoff === 'string' && handoff.trim()) {
      setInput(handoff.slice(0, MESSAGE_MAX_LENGTH));
    }
  }, [location.state]);

  /**
   * The last `quota_day` the server sent, in a ref rather than state.
   *
   * It is an input to reading the counter, not something rendered, and it must be
   * readable by the read it feeds without adding a dependency that re-runs it. Once the
   * server has named a day, a counter row from an earlier one is known to be spent —
   * which is the whole of the rollover correction, with nothing computed on this side.
   */
  const serverDay = useRef<string | null>(null);

  const refreshQuota = useCallback(async () => {
    if (!userId) return;
    const next = await fetchQuota(userId, serverDay.current);
    if (next) setQuota(next);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setItems([]);
      setQuota(null);
      setHistoryResolved(false);
      return;
    }

    let cancelled = false;
    setHistoryResolved(false);

    void (async () => {
      const [history, nextQuota] = await Promise.all([
        fetchHistory(userId),
        fetchQuota(userId, serverDay.current),
      ]);
      if (cancelled) return;

      /* null means the read FAILED. Start empty rather than asserting an empty history
         that was never confirmed — and leave `historyResolved` false, so the greeting
         does not claim a fresh start on the strength of a failed query. */
      if (history) {
        /* One extra read, only when a restored turn actually injected something, so the
           chips survive a reload instead of being an artefact of the live stream. */
        const ids = history.flatMap((message) => message.placeIds);
        const refs = await fetchPlaceRefs(ids, lang);
        if (cancelled) return;

        setItems(
          history.map((message) => ({
            kind: message.role === 'assistant' ? 'answer' : 'user',
            id: `db-${message.id}`,
            at: message.at,
            text: message.content,
            streaming: false,
            places: message.placeIds
              .map((id) => refs.get(id))
              .filter((place): place is MikePlace => place !== undefined),
          })) as ChatItem[],
        );
        setHistoryResolved(true);
      }
      if (nextQuota) setQuota(nextQuota);
    })();

    return () => {
      cancelled = true;
    };
    /* `lang` is read inside for the name projection but is deliberately NOT a dependency:
       re-running this on a language change would replace `items` wholesale and could
       clobber a turn that is still streaming. It buys nothing today either — place names
       are English on all 181 rows, so the projection falls back to English whatever the
       language is. If names are ever translated, the right fix is to re-resolve the chip
       names rather than to reload the thread. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  /* Abort any live read on unmount. The server persists both messages after the stream
     completes regardless of whether anyone is still listening, so history reconciles on
     the next load either way. */
  useEffect(() => () => abort.current?.abort(), []);

  useEffect(() => {
    if (!stickToBottom.current) return;
    const element = scroller.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [items]);

  function onScroll() {
    const element = scroller.current;
    if (!element) return;
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    stickToBottom.current = distance <= STICK_TO_BOTTOM_PX;
  }

  const isPremium = quota?.isPremium === true;
  /**
   * Only ever from a count the server stands behind.
   *
   * An uncertain count — the cold-open read, before anything on the wire has named the
   * day — does NOT lock the composer. The asymmetry is the reason: locking somebody whose
   * Cyprus day has already rolled over leaves them stuck until they reload, while letting
   * somebody at the cap press send costs a refusal that the server makes before it spends
   * anything, returns their question to the box, and carries the `quota_day` that settles
   * the question for the rest of the session.
   */
  const exhausted =
    quota != null && quota.certain && !quota.isPremium && quota.used >= quota.cap;
  /* Not a bare 5: the only copy of that number lives in askPete.ts with the TODO
     explaining what would delete it. */
  const cap = quota?.cap ?? ASSUMED_FREE_DAILY_CAP;

  const disabledReason = exhausted
    ? t('ui_pete_disabled_quota')
    : sending
      ? t('ui_pete_sending')
      : null;

  function pushNotice(failure: NoticeKind) {
    setItems((previous) => [
      ...previous,
      { kind: 'notice', id: nextId('notice'), at: Date.now(), failure },
    ]);
  }

  async function send() {
    const message = input.trim();
    if (!message || sending || exhausted || !userId) return;

    const token = await currentAccessToken();
    if (!token) {
      pushNotice('auth');
      return;
    }

    const userItemId = nextId('user');
    const answerItemId = nextId('answer');
    const at = Date.now();

    setInput('');
    setSending(true);
    setAnnouncement('');
    stickToBottom.current = true;
    setItems((previous) => [
      ...previous,
      { kind: 'user', id: userItemId, at, text: message },
      { kind: 'answer', id: answerItemId, at: at + 1, text: '', streaming: true, places: [] },
    ]);

    const controller = new AbortController();
    abort.current = controller;

    let answered = '';
    let places: MikePlace[] = [];

    const outcome = await streamAskPete({
      message,
      accessToken: token,
      signal: controller.signal,
      onDelta: (delta) => {
        answered += delta;
        setItems((previous) =>
          previous.map((item) =>
            item.id === answerItemId && item.kind === 'answer'
              ? { ...item, text: item.text + delta }
              : item,
          ),
        );
      },
      onMeta: (meta) => {
        places = meta.places;
        setItems((previous) =>
          previous.map((item) =>
            item.id === answerItemId && item.kind === 'answer'
              ? { ...item, places: meta.places }
              : item,
          ),
        );
        if (meta.quotaDay) serverDay.current = meta.quotaDay;
        setQuota((previous) => applyLimit(previous, meta));
      },
    });

    abort.current = null;
    setSending(false);

    if (outcome.ok) {
      setItems((previous) =>
        previous.map((item) =>
          item.id === answerItemId && item.kind === 'answer'
            ? { ...item, streaming: false, places }
            : item,
        ),
      );
      /* Announced ONCE, complete. A live region that fired per token would have a screen
         reader read a word, interrupt itself, read two words — unusable. */
      setAnnouncement(answered);
      return;
    }

    if (outcome.kind === 'aborted') return;

    /* A 429 reports the allowance the same way a successful turn does, so the limit state
       becomes certain here rather than waiting for a re-read. */
    if (outcome.kind === 'quota') {
      if (outcome.limit.quotaDay) serverDay.current = outcome.limit.quotaDay;
      setQuota((previous) => applyLimit(previous, { ...outcome.limit, remaining: 0 }));
    }

    /* The turn failed. Drop the empty answer placeholder — an empty bubble beside Pete's
       face is a silence he did not choose. */
    setItems((previous) =>
      previous.filter((item) => !(item.id === answerItemId && item.kind === 'answer' && !answered)),
    );
    if (answered) {
      setItems((previous) =>
        previous.map((item) =>
          item.id === answerItemId && item.kind === 'answer'
            ? { ...item, streaming: false }
            : item,
        ),
      );
    }

    /* Where the server refused before writing anything, the question is retracted and put
       back in the box: a question left on screen that Pete has no record of is what makes
       him look like he ignored it. Where the client cannot know — transport, 500 — it is
       kept, because over-claiming in either direction is worse than the ambiguity. */
    if (rejectedBeforeRecording(outcome.kind as AskPeteFailureKind)) {
      setItems((previous) => previous.filter((item) => item.id !== userItemId));
      setInput(message);
    }

    pushNotice(outcome.kind);
    void refreshQuota();
  }

  const resolving = sessionStatus === 'resolving';
  const signedOut = !resolving && !userId;
  const showGreeting = historyResolved && items.length === 0;

  /**
   * A question a signed-out visitor is holding — typed into the homepage hero, or chosen
   * from a starter chip — shown where it will be asked.
   *
   * Without this the handoff is invisible: they type a question, press go, and land on a
   * page with no composer and no sign of what they wrote. It is kept in state and does
   * reach the box after signing in, but a promise nobody can see is not a promise. The
   * bubble carries `at: 0`, which is what marks it unsent — it gets no timestamp, and it
   * is never in `items`, so nothing can mistake it for something the server recorded.
   */
  const pending = signedOut && input.trim();
  const displayItems: ChatItem[] = pending
    ? [...items, { kind: 'user', id: 'pending', at: 0, text: input.trim() }]
    : items;

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.inner}>
          <header className={styles.head}>
            <h1 className={styles.title}>{t('ui_pete_title')}</h1>
            <p className={styles.subtitle}>{t('ui_pete_subtitle')}</p>
          </header>

          {/* The counter row. Hidden entirely for premium — the frame removes the whole
              row, not just the pill — and for a signed-out visitor, who has no allowance
              to report. The frame's "Unlock Unlimited" link is absent: `stripeEnabled` is
              false, so there is no purchase to make, and it is not rendered disabled
              either. See docs/PARKED.md. */}
          {!signedOut && !resolving && !isPremium && quota && (
            <div className={styles.counterRow}>
              <p
                className={`${styles.counter} ${exhausted ? styles.counterSpent : ''}`}
                role="status"
                aria-label={t('ui_pete_counter_label', { used: quota.used, cap: quota.cap })}
              >
                <span aria-hidden="true">
                  {t('ui_pete_counter', { used: quota.used, cap: quota.cap })}
                </span>
              </p>
            </div>
          )}

          <div className={styles.scroller} ref={scroller} onScroll={onScroll}>
            {resolving ? (
              <div className={styles.loading} aria-busy="true">
                <p className="cw-visually-hidden" role="status">
                  {t('ui_loading')}
                </p>
                <span className={styles.skeletonBubble} aria-hidden="true" />
                <span className={styles.skeletonBubbleShort} aria-hidden="true" />
              </div>
            ) : (
              <Thread
                items={displayItems}
                cap={cap}
                showGreeting={signedOut || showGreeting}
                starters={starters}
                onStarter={(text) => {
                  setInput(text);
                  /* Signed out there is no box to put it in, so the press has to do
                     something: it keeps the question and opens sign-up. Somebody who has
                     just chosen a question is the best moment to ask for an account, and
                     the question is still in the composer when they come back. Without
                     this the chip would be a dead click on the one screen where the
                     starters are the only thing to press. */
                  if (signedOut) openAuth('signup');
                }}
              />
            )}
          </div>

          {/* One polite region for the whole screen, written to only on completion. */}
          <p className="cw-visually-hidden" role="status" aria-live="polite">
            {announcement}
          </p>

          {signedOut ? (
            <SignInPanel onSignIn={() => openAuth('signup')} />
          ) : (
            <Composer
              value={input}
              onChange={setInput}
              onSend={() => void send()}
              disabled={resolving || exhausted}
              disabledReason={disabledReason}
              sending={sending}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}

/**
 * In place of the composer for a signed-out visitor — never a disabled text box.
 *
 * The request is never sent, because there is no useful answer to send it for. A
 * signed-out browser has no session, so `supabase-js` sends the project anon key; that
 * key clears the gateway, reaches the handler, and dies at `getUser()` as
 * `{"error":"unauthorized"}`, 401. Probed against the deployed function, 28 Aug 2026.
 *
 * The thread above still shows Pete's opening message and the three starters, and the
 * starters still work — they put the question in the box, so the intent survives signing
 * in. Somebody who has just chosen a question is the best possible moment to ask for an
 * account, and it is the only honest demonstration of what this screen is.
 */
function SignInPanel({ onSignIn }: { onSignIn: () => void }) {
  const { t } = useI18n();

  return (
    <div className={styles.signIn}>
      <span className={styles.signInMark} aria-hidden="true">
        <Icon as={UserPlus} size={24} />
      </span>
      <div className={styles.signInCopy}>
        <p className={styles.signInTitle}>{t('ui_pete_signin_title')}</p>
        <p className={styles.signInBody}>{t('ui_pete_signin_body')}</p>
      </div>
      <Button variant="primary" onClick={onSignIn}>
        {t('ui_pete_signin_cta')}
      </Button>
    </div>
  );
}
