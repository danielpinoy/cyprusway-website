import { useEffect, useId, useRef, useState } from 'react';
import { Globe } from 'lucide-react';

import { useI18n } from '../../i18n/I18nProvider';
import { LANGUAGES } from '../../i18n/languages';
import { Icon } from '../ui/Icon';
import styles from './LanguageSwitcher.module.css';

/**
 * The Figma has no language control anywhere — not in the header, not in the footer,
 * not in the overlay menu — in a product with five languages and a switcher on every
 * page today. Building the design as drawn would have removed a shipped feature, so
 * the control lives here, beside search, which is where it lives now.
 */
export function LanguageSwitcher({ tone = 'light' }: { tone?: 'light' | 'dark' | undefined }) {
  const { lang, setLanguage, t } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`${styles.wrap} ${tone === 'dark' ? styles.dark : styles.light}`}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={t('ui_language')}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon as={Globe} size={20} />
        <span className={styles.code}>{lang.toUpperCase()}</span>
      </button>

      {open && (
        <ul id={menuId} role="menu" className={styles.menu}>
          {LANGUAGES.map((language) => (
            <li key={language.code} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={language.code === lang}
                className={styles.option}
                lang={language.code}
                onClick={() => {
                  setLanguage(language.code);
                  setOpen(false);
                }}
              >
                {language.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
