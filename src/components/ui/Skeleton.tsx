import styles from './Skeleton.module.css';

interface SkeletonProps {
  /** Any CSS length; the loading frame's blocks are pixel-sized. */
  width?: string | undefined;
  height?: string | undefined;
  radius?: string | undefined;
  tone?: 'navy' | 'sand' | undefined;
  className?: string | undefined;
}

/** A placeholder block. Always aria-hidden — the loading state is announced once, by
 *  the region's aria-busy and its status text, not eleven times by empty boxes. */
export function Skeleton({
  width = '100%',
  height = '16px',
  radius = 'var(--cw-radius-sm)',
  tone = 'sand',
  className,
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={[styles.skeleton, styles[tone], className].filter(Boolean).join(' ')}
      style={{ inlineSize: width, blockSize: height, borderRadius: radius }}
    />
  );
}
