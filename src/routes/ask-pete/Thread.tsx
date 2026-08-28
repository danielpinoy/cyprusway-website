import { Link } from 'react-router';
import { Info, MapPin, TriangleAlert } from 'lucide-react';

import { Icon } from '../../components/ui/Icon';
import { useI18n } from '../../i18n/I18nProvider';
import type { TranslationKey } from '../../i18n/dictionary';
import type { AskPeteFailureKind, MikePlace } from '../../lib/askPete';
import styles from './Thread.module.css';

export type ChatItem =
  | { kind: 'user'; id: string; at: number; text: string }
  | {
      kind: 'answer';
      id: string;
      at: number;
      text: string;
      /** Deltas are still arriving. */
      streaming: boolean;
      /** Verified references from `meta.places`; never parsed from the prose. */
      places: MikePlace[];
    }
  /**
   * A notice is its own kind, NOT an assistant message carrying failure text. That
   * distinction is the point: a failure rendered in Pete's bubble, beside Pete's avatar,
   * in the position every real answer occupies, is the site putting words in his mouth —
   * every timeout and every 429 would read as something he said.
   */
  | { kind: 'notice'; id: string; at: number; failure: NoticeKind };

export type NoticeKind = Exclude<AskPeteFailureKind, 'aborted'>;

interface NoticeSpec {
  key: TranslationKey;
  /** `info` is for the refusals that cost the visitor nothing. */
  tone: 'alert' | 'info';
}

/**
 * Copy for every way a turn can fail, one entry per typed code the function returns.
 * `mike`'s own error strings name internal steps ("History fetch failed") and must never
 * be rendered.
 *
 * The `info` tone is for the rejections the server refuses at or before the quota gate,
 * which cost nothing — and their copy says so. Half of what made Pete look broken in the
 * app was benign refusals dressed as breakage.
 *
 * None offers a retry button, deliberately: the allowance is spent before OpenAI is
 * called, so a retry spends a second one on the same question. Where the turn was never
 * recorded the question goes back in the composer instead, which is a retry the visitor
 * controls and the server agrees with.
 */
const NOTICES: Record<NoticeKind, NoticeSpec> = {
  quota: { tone: 'info', key: 'ui_pete_err_quota' },
  account_required: { tone: 'info', key: 'ui_pete_err_account' },
  auth: { tone: 'alert', key: 'ui_pete_err_auth' },
  invalid_request: { tone: 'info', key: 'ui_pete_err_invalid' },
  transport: { tone: 'alert', key: 'ui_pete_err_transport' },
  server: { tone: 'alert', key: 'ui_pete_err_server' },
  stream: { tone: 'alert', key: 'ui_pete_err_stream' },
};

/** Local time, from the browser. The reset boundary is a separate question and this is
 *  not it — see fetchQuota. */
function stamp(at: number, lang: string): { short: string; full: string } | null {
  /* `0` marks a message that has not been sent — the pending question a signed-out
     visitor is holding. It has no time yet, so it gets no stamp. */
  if (!Number.isFinite(at) || at <= 0) return null;
  const date = new Date(at);
  return {
    short: new Intl.DateTimeFormat(lang, {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date),
    full: new Intl.DateTimeFormat(lang, { dateStyle: 'full', timeStyle: 'short' }).format(
      date,
    ),
  };
}

export function Thread({
  items,
  cap,
  showGreeting,
  starters,
  onStarter,
}: {
  items: readonly ChatItem[];
  /** Interpolated into the quota notice so the sentence cannot go stale. */
  cap: number;
  showGreeting: boolean;
  starters: readonly string[];
  onStarter: (text: string) => void;
}) {
  const { t, lang } = useI18n();

  return (
    <div className={styles.thread}>
      {showGreeting && <Greeting starters={starters} onStarter={onStarter} />}

      {items.map((item, index) => {
        /* One timestamp per group rather than per message: the frame shows a single
           "Wed 8:21 AM" above the conversation, and a stamp on every bubble in a
           three-second exchange is noise. */
        const previous = items[index - 1];
        const newGroup =
          index === 0 || !previous || item.at - previous.at > 5 * 60 * 1000;
        const time = newGroup ? stamp(item.at, lang) : null;

        return (
          <div key={item.id} className={styles.group}>
            {time && (
              <p className={styles.stamp}>
                <time dateTime={new Date(item.at).toISOString()} title={time.full}>
                  {time.short}
                </time>
              </p>
            )}

            {item.kind === 'user' && (
              <article className={styles.userRow}>
                <h2 className="cw-visually-hidden">{t('ui_pete_you_said')}</h2>
                <p className={styles.userBubble}>{item.text}</p>
              </article>
            )}

            {item.kind === 'answer' && <Answer item={item} />}

            {item.kind === 'notice' && (
              <Notice
                spec={NOTICES[item.failure]}
                text={t(NOTICES[item.failure].key, { cap })}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Client-side copy, never sent and never persisted.
 *
 * The caller renders this ONLY when the server's history window came back empty. Above a
 * loaded thread it would be a lie: `mike` keeps one rolling conversation per person and
 * shares it with the phone, so "Hi! I am Pete — what can I help with?" over three
 * exchanges from this morning is the screen claiming an amnesia the server does not have.
 */
function Greeting({
  starters,
  onStarter,
}: {
  starters: readonly string[];
  onStarter: (text: string) => void;
}) {
  const { t } = useI18n();

  return (
    <article className={styles.botRow}>
      <h2 className="cw-visually-hidden">{t('ui_pete_said')}</h2>
      <PeteAvatar />
      <div className={styles.botColumn}>
        <div className={styles.botBubble}>
          <p>{t('ui_pete_greeting')}</p>
        </div>
        <ul className={styles.starters}>
          {starters.map((starter) => (
            <li key={starter}>
              <button type="button" className={styles.starter} onClick={() => onStarter(starter)}>
                {starter}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function Answer({
  item,
}: {
  item: Extract<ChatItem, { kind: 'answer' }>;
}) {
  const { t } = useI18n();

  return (
    <article className={styles.botRow}>
      <h2 className="cw-visually-hidden">{t('ui_pete_said')}</h2>
      <PeteAvatar />
      <div className={styles.botColumn}>
        <div className={styles.botBubble}>
          {/* No `lang` attribute. Pete's reply follows the visitor's profile language and
              matches whatever language they wrote in, so it is not reliably any one of
              them — asserting lang="en" here would tell a screen reader to pronounce
              Greek with English phonemes. Inheriting the document language is the only
              honest answer. */}
          {item.text && <p className={styles.answerText}>{item.text}</p>}

          {item.streaming && !item.text && (
            <p className={styles.typing} aria-hidden="true">
              <span />
              <span />
              <span />
            </p>
          )}

          {item.places.length > 0 && (
            <ul className={styles.places}>
              {item.places.map((place) => (
                <li key={place.id}>
                  <Link
                    to={`/place/${place.slug}`}
                    className={styles.place}
                    aria-label={t('ui_pete_open_place', { name: place.name })}
                  >
                    <Icon as={MapPin} size={12} />
                    <span>{place.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </article>
  );
}

function Notice({ spec, text }: { spec: NoticeSpec; text: string }) {
  return (
    <div className={`${styles.notice} ${spec.tone === 'alert' ? styles.alert : styles.info}`}>
      <Icon as={spec.tone === 'alert' ? TriangleAlert : Info} size={16} />
      <p>{text}</p>
    </div>
  );
}

/** The same cutout phase 1 already ships and the frame draws. `aria-hidden` because the
 *  speaker is named in the visually hidden heading above — an alt text here would make a
 *  screen reader say "Pete" twice per message. */
function PeteAvatar() {
  return (
    <span className={styles.avatar} aria-hidden="true">
      <img src="/images/pete.webp" alt="" width={40} height={40} loading="lazy" />
    </span>
  );
}
