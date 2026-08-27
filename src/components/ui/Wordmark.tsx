import { Logomark } from '../../assets/Logomark';
import styles from './Wordmark.module.css';

/**
 * Logomark + wordmark.
 *
 * The two-tone wordmark is the established identity — "Cyprus" in the ground's dark,
 * "Way" in gold — and the brief holds it above the Figma, which draws a single flat
 * colour. Navy on a navy header is not available, so on dark grounds "Cyprus" becomes
 * white and "Way" stays gold. The identity survives; only the half that would be
 * invisible changes.
 */
export function Wordmark({
  tone = 'dark',
  compact = false,
}: {
  tone?: 'dark' | 'light' | undefined;
  /** Drops the text below 480px, keeping the logomark. Used in the header, where the
   *  row also has to hold a gold button and a menu control; the footer and the error
   *  page have the room for the full lockup. The name stays in the accessibility tree. */
  compact?: boolean | undefined;
}) {
  return (
    <span
      className={[
        styles.wordmark,
        tone === 'light' ? styles.light : styles.dark,
        compact ? styles.compact : null,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Logomark className={styles.logomark} />
      <span className={styles.text}>
        <span className={styles.cyprus}>Cyprus</span>
        <span className={styles.way}>Way</span>
      </span>
    </span>
  );
}
