import type { LucideIcon } from 'lucide-react';

import { isMirroredGlyph } from '../../lib/dir';
import styles from './Icon.module.css';

interface IconProps {
  /** The Lucide component. Mirroring is decided from the component itself, not a
   *  string name, so the allowlist in lib/dir.ts cannot drift from what is rendered. */
  as: LucideIcon;
  size?: number | undefined;
  strokeWidth?: number | undefined;
  className?: string | undefined;
  /** Icons are decorative by default. Pass a label only when the icon IS the control
   *  and nothing else names it. */
  label?: string | undefined;
}

export function Icon({ as: Glyph, size = 20, strokeWidth = 1.75, className, label }: IconProps) {
  const classes = [isMirroredGlyph(Glyph) ? styles.mirror : null, className]
    .filter(Boolean)
    .join(' ');

  return (
    <Glyph
      size={size}
      strokeWidth={strokeWidth}
      className={classes || undefined}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      focusable="false"
    />
  );
}
