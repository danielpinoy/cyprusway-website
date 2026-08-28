import { useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowUp } from 'lucide-react';

import { Icon } from '../../components/ui/Icon';
import { useI18n } from '../../i18n/I18nProvider';
import { MESSAGE_MAX_LENGTH } from '../../lib/askPete';
import styles from './Composer.module.css';

/**
 * The message box.
 *
 * **The frame's `+` is not here.** It is drawn as a 32px circle with a Carbon Add-Large
 * glyph at the inline start of the action bar, and it has no defined behaviour anywhere:
 * no handler or variant in the frame, no equivalent in the app (whose composer has one
 * control, send), and no request shape that could carry an attachment — `mike` accepts
 * exactly `message` and `place_id` and 400s on anything else. Drawing a control that
 * cannot do anything, or inventing an upload the backend refuses, are both worse than
 * leaving the row with one button. Recorded in docs/PARKED.md.
 *
 * Enter sends, Shift+Enter breaks the line. It is a real `<form>` with a real submit
 * button, so the keyboard behaviour is the browser's and not a click handler on a div.
 */
export function Composer({
  value,
  onChange,
  onSend,
  disabled,
  disabledReason,
  sending,
}: {
  value: string;
  onChange: (next: string) => void;
  onSend: () => void;
  /** True while the box must not accept a new question. */
  disabled: boolean;
  /** Why, for the accessible name of the send button. A control that is off without
   *  saying why is the complaint phase 1 fixed twice. */
  disabledReason: string | null;
  sending: boolean;
}) {
  const { t } = useI18n();
  const textarea = useRef<HTMLTextAreaElement>(null);

  /* Grow with the content rather than scrolling inside a fixed box: an answer is worth
     re-reading before sending, and three lines is common. */
  useEffect(() => {
    const element = textarea.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 200)}px`;
  }, [value]);

  const empty = value.trim().length === 0;
  const canSend = !empty && !disabled && !sending;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (canSend) onSend();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (canSend) onSend();
    }
  }

  const sendLabel = sending
    ? t('ui_pete_sending')
    : disabledReason
      ? `${t('ui_pete_send')} — ${disabledReason}`
      : t('ui_pete_send');

  return (
    <form className={styles.composer} onSubmit={submit}>
      <label className="cw-visually-hidden" htmlFor="cw-pete-input">
        {t('ui_pete_input_label')}
      </label>
      <textarea
        id="cw-pete-input"
        ref={textarea}
        className={styles.input}
        rows={2}
        value={value}
        maxLength={MESSAGE_MAX_LENGTH}
        placeholder={t('ui_pete_placeholder')}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
      />
      <div className={styles.actions}>
        {/* Only once it is close enough to matter — a counter that runs from the first
            character reads as a warning about a limit nobody is near. */}
        <span className={styles.count} aria-hidden="true">
          {value.length > MESSAGE_MAX_LENGTH - 100
            ? `${value.length} / ${MESSAGE_MAX_LENGTH}`
            : ''}
        </span>
        <button
          type="submit"
          className={styles.send}
          disabled={!canSend}
          aria-label={sendLabel}
        >
          {/* ArrowUp does not mirror under RTL — it points along no reading order. It is
              deliberately absent from MIRRORED in lib/dir.ts. */}
          <Icon as={ArrowUp} size={20} />
        </button>
      </div>
    </form>
  );
}
