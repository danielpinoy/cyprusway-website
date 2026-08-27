import { Link } from 'react-router';

import { useT } from '../../i18n/I18nProvider';
import { Icon } from '../ui/Icon';
import type { NavItem } from './navigation';
import styles from './NavLabel.module.css';

/**
 * A navigation entry that is either a link or, when the surface does not exist yet, a
 * dimmed label that says so.
 *
 * The "coming soon" note is a real string in the accessibility tree, not a `title`
 * attribute: `title` is not announced reliably and is unreachable by touch, so the
 * reduced opacity would be the only signal for anyone not using a mouse.
 */
export function NavLabel({
  item,
  className,
  showIcon = false,
  onNavigate,
}: {
  item: NavItem;
  className?: string | undefined;
  showIcon?: boolean | undefined;
  onNavigate?: (() => void) | undefined;
}) {
  const t = useT();
  const label = t(item.labelKey);
  const icon = showIcon && item.icon ? <Icon as={item.icon} size={20} /> : null;

  if (item.pending || !item.to) {
    return (
      <span className={[styles.item, styles.pending, className].filter(Boolean).join(' ')}>
        {icon}
        <span>{label}</span>
        <span className="cw-visually-hidden">{` — ${t('ui_coming_soon')}`}</span>
      </span>
    );
  }

  return (
    <Link
      to={item.to}
      className={[styles.item, styles.link, className].filter(Boolean).join(' ')}
      onClick={onNavigate}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
