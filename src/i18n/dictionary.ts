/* The dictionary: ported strings plus the strings the React build added.
 *
 * English is imported statically because the prerender pass and the first paint both
 * need it synchronously. The other four are dynamic imports, so a visitor downloads
 * one language, not five.
 */

import { generatedEn } from './generated/en';
import { stringsEn } from './strings/en';
import type { LanguageCode } from './languages';

export const en = { ...generatedEn, ...stringsEn };

/** Every key the site can render. A mistyped key is a compile error, which is the
 *  whole reason for not carrying the `data-i18n` string-attribute scheme forward. */
export type TranslationKey = keyof typeof en;

export type Dictionary = Readonly<Partial<Record<TranslationKey, string>>>;

const LOADERS: Record<Exclude<LanguageCode, 'en'>, () => Promise<Dictionary>> = {
  pl: async () => {
    const [g, s] = await Promise.all([import('./generated/pl'), import('./strings/pl')]);
    return { ...g.generatedPl, ...s.stringsPl };
  },
  de: async () => {
    const [g, s] = await Promise.all([import('./generated/de'), import('./strings/de')]);
    return { ...g.generatedDe, ...s.stringsDe };
  },
  el: async () => {
    const [g, s] = await Promise.all([import('./generated/el'), import('./strings/el')]);
    return { ...g.generatedEl, ...s.stringsEl };
  },
  sv: async () => {
    const [g, s] = await Promise.all([import('./generated/sv'), import('./strings/sv')]);
    return { ...g.generatedSv, ...s.stringsSv };
  },
};

export async function loadDictionary(code: LanguageCode): Promise<Dictionary> {
  if (code === 'en') return en;
  return LOADERS[code]();
}

/** Values substituted into a string's {placeholders}. */
export type TranslationParams = Readonly<Record<string, string | number>>;

/**
 * Resolve a key, falling back to English. The vanilla switcher did the same, so a key
 * with no translation renders English rather than disappearing.
 *
 * `{name}` placeholders are substituted so a translator can put the number where their
 * language needs it — "Day 2 of 4" is not word order every language shares. Deliberately
 * the whole of the interpolation: no plurals, no dates, no nesting. When the command
 * centre needs those, Intl.PluralRules and Intl.DateTimeFormat cover them without a
 * dependency.
 */
export function translate(
  dictionary: Dictionary,
  key: TranslationKey,
  params?: TranslationParams,
): string {
  const value = dictionary[key] ?? en[key];
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
