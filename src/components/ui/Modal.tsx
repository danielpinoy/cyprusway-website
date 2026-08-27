import { useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

import { useT } from '../../i18n/I18nProvider';
import { Icon } from './Icon';
import { useDialog } from './useDialog';
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

  useDialog(cardRef, { open, dismissible, onClose });

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={styles.overlay}
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
