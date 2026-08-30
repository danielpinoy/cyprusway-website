import { useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

import { useT } from '../../i18n/I18nProvider';
import { Icon } from './Icon';
import { useDialog, useKeepMounted } from './useDialog';
import styles from './Modal.module.css';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** id of the element that names the dialog, for aria-labelledby. */
  labelledBy: string;
  dismissible?: boolean | undefined;
  size?: ('auth' | 'interests') | undefined;
  children: ReactNode;
}

/**
 * The card surface. Enters and leaves under the motion convention (docs/PARKED.md,
 * "The motion convention — built in phase 6"): the scrim fades and the card fades and
 * settles from a 0.98 scale, 200 ms each way, all of it in CSS.
 *
 * WHY IT STAYS MOUNTED AFTER THE FIRST OPEN. A node that did not exist a frame ago has no
 * *before* state for a transition to move from, and a node that has just been removed
 * cannot animate its way out. So from the first open onwards the portal stays in the
 * document: `data-open` drives the styles, `@starting-style` supplies the enter's before
 * state, and a discrete `display` transition holds the exit visible until its 200 ms are
 * up. No timer, no "closing" state — the browser owns the whole timeline, and under
 * `prefers-reduced-motion` the global 0.01 ms clamp collapses it to what it was.
 *
 * `inert` while closed: the departing card must not take a Tab press or a click during
 * its exit, and must not be read by a screen reader as still present.
 */
export function Modal({
  open,
  onClose,
  labelledBy,
  dismissible = true,
  size = 'auth',
  children,
}: ModalProps) {
  const t = useT();
  const cardRef = useRef<HTMLDivElement>(null);
  const mounted = useKeepMounted(open);

  useDialog(cardRef, { open, dismissible, onClose });

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={styles.overlay}
      data-open={open ? 'true' : 'false'}
      inert={!open}
      onMouseDown={(event) => {
        if (dismissible && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`${styles.card} ${size === 'interests' ? styles.interests : styles.auth}`}
      >
        {dismissible && (
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label={t('onb_close')}
          >
            <Icon as={X} size={20} />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
