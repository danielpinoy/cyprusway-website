import type { ReactNode } from 'react';

import styles from './ContentPage.module.css';

/** The measure and padding every long-form page shares. */
export function ContentPage({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>{children}</div>
    </div>
  );
}
