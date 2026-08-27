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

/** Resolve a key, falling back to English. The vanilla switcher did the same, so a
 *  key with no translation renders English rather than disappearing. */
export function translate(dictionary: Dictionary, key: TranslationKey): string {
  return dictionary[key] ?? en[key];
}
