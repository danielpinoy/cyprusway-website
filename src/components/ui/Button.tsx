import type { ButtonHTMLAttributes, ReactNode } from 'react';

import styles from './Button.module.css';

type Variant = 'primary' | 'dark' | 'provider';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant | undefined;
  fullWidth?: boolean | undefined;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  fullWidth = false,
  className,
  type = 'button',
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const classes = [styles.button, styles[variant], fullWidth ? styles.fullWidth : null, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      /* Both the attribute and the ARIA state: `disabled` alone is invisible to some
         screen-reader modes that skip disabled controls entirely, so the user is never
         told why the action is unavailable. */
      aria-disabled={disabled ? true : undefined}
      {...rest}
    >
      {children}
    </button>
  );
}
