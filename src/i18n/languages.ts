/* The languages the site ships, and their writing direction.
 *
 * Direction is DATA, not code. Nothing in the app branches on a language code to
 * decide layout; it reads `dir` from the record below and every stylesheet uses
 * logical properties. Adding Hebrew later is therefore two things and no rewrite:
 *
 *   1. a sixth record here — { code: 'he', label: 'עברית', dir: 'rtl' }
 *   2. src/i18n/generated/he.ts and src/i18n/strings/he.ts
 *
 * plus the `users_preferred_language_check` CHECK constraint, which admits exactly
 * {en, pl, de, el, sv} today and is a backend change, not a web one.
 */

export type Direction = 'ltr' | 'rtl';

export type LanguageCode = 'en' | 'pl' | 'de' | 'el' | 'sv';

export interface Language {
  readonly code: LanguageCode;
  /** Endonym — a language picker shows each language in its own language. */
  readonly label: string;
  readonly dir: Direction;
}

export const LANGUAGES: readonly Language[] = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'pl', label: 'Polski', dir: 'ltr' },
  { code: 'de', label: 'Deutsch', dir: 'ltr' },
  { code: 'el', label: 'Ελληνικά', dir: 'ltr' },
  { code: 'sv', label: 'Svenska', dir: 'ltr' },
];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

/** The key the vanilla switcher used. Kept so a stored preference survives the rebuild. */
export const LANGUAGE_STORAGE_KEY = 'cw_lang';

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === 'string' && LANGUAGES.some((l) => l.code === value);
}

export function directionOf(code: LanguageCode): Direction {
  return LANGUAGES.find((l) => l.code === code)?.dir ?? 'ltr';
}
