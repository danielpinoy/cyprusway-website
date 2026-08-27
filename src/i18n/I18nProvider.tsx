import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  directionOf,
  isLanguageCode,
  type Direction,
  type LanguageCode,
} from './languages';
import {
  en,
  loadDictionary,
  translate,
  type Dictionary,
  type TranslationKey,
} from './dictionary';

interface I18nValue {
  lang: LanguageCode;
  dir: Direction;
  t: (key: TranslationKey) => string;
  setLanguage: (code: LanguageCode) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

function readStoredLanguage(): LanguageCode | null {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguageCode(stored) ? stored : null;
  } catch {
    /* Private mode, or storage blocked. Not an error: fall back to English. */
    return null;
  }
}

/** Dev-only direction override, so the RTL layout can be reviewed against Figma
 *  node 3558-20716 without adding a sixth language. Stripped from production. */
function readDirectionOverride(): Direction | null {
  if (!import.meta.env.DEV) return null;
  try {
    const value = new URLSearchParams(window.location.search).get('dir');
    return value === 'rtl' || value === 'ltr' ? value : null;
  } catch {
    return null;
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  /* Always starts English, on the server and on the client, so the prerendered
     markup and the first client render agree. A stored preference is applied in the
     effect below — one extra render, no hydration mismatch. This is the same
     after-load swap the vanilla site did, so it is parity, not a regression. */
  const [lang, setLang] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [dictionary, setDictionary] = useState<Dictionary>(en);

  const dir = readDirectionOverride() ?? directionOf(lang);

  useEffect(() => {
    const stored = readStoredLanguage();
    if (stored && stored !== DEFAULT_LANGUAGE) setLang(stored);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadDictionary(lang).then((next) => {
      if (!cancelled) setDictionary(next);
    });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = dir;
  }, [lang, dir]);

  const setLanguage = useCallback((code: LanguageCode) => {
    setLang(code);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    } catch {
      /* Preference simply does not persist. Nothing else changes. */
    }
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      dir,
      t: (key: TranslationKey) => translate(dictionary, key),
      setLanguage,
    }),
    [lang, dir, dictionary, setLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>');
  return value;
}

/** Shorthand for the common case. */
export function useT(): (key: TranslationKey) => string {
  return useI18n().t;
}
