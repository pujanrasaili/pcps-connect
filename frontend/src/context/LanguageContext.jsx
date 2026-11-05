import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { translate, format, normalizeLang } from "../i18n/translate";
import { getNe, loadNe } from "../i18n/dictionary";

const LanguageContext = createContext({ lang: "en", setLang: () => {}, t: (text) => text });

const STORAGE_KEY = "pcps_lang";

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      return normalizeLang(localStorage.getItem(STORAGE_KEY));
    } catch {
      return "en";
    }
  });

  // The Nepali dictionary is fetched on demand; until it arrives text stays English.
  const [dictionary, setDictionary] = useState(getNe);
  useEffect(() => {
    if (lang !== "ne" || dictionary) return undefined;
    let cancelled = false;
    loadNe()
      .then((loaded) => !cancelled && setDictionary(loaded))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [lang, dictionary]);

  // Screen readers and the browser's own tools pick the right voice and
  // hyphenation from the page language.
  useEffect(() => {
    document.documentElement.lang = lang === "ne" ? "ne" : "en";
  }, [lang]);

  const setLang = useCallback((next) => {
    const value = normalizeLang(next);
    setLangState(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Not remembering the choice is fine; it still applies for this visit.
    }
  }, []);

  const t = useCallback((text, values) => format(translate(dictionary || {}, lang, text), values), [lang, dictionary]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLang = () => useContext(LanguageContext);
