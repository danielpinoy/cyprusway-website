import { Lock } from 'lucide-react';

import { Icon } from '../ui/Icon';
import styles from './ErrorBanner.module.css';

/**
 * The alert region always exists, even when empty, so the announcement actually
 * fires — a live region inserted at the same moment as its message is frequently
 * missed by screen readers.
 *
 * Copy is neutral by rule: never "something went wrong on our end". Apple rate-limits
 * rapid repeat sign-ins and returns its own failure before anything reaches us, so
 * claiming fault would often be wrong as well as unhelpful.
 */
export function ErrorBanner({ message }: { message: string | null }) {
  return (
    <div role="status" aria-live="polite" className={styles.region}>
      {message && (
        <div className={styles.banner}>
          <Icon as={Lock} size={16} className={styles.icon} />
          <span className={styles.text}>{message}</span>
        </div>
      )}
    </div>
  );
}
