"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { SUPPORTED_LANGS, translations } from "./i18n";

const LANG_KEY = "bazaar_lang";

const LanguageContext = createContext({
  lang: "ru",
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState("ru");

  // при монтировании читаем язык из localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(LANG_KEY);
    if (saved && SUPPORTED_LANGS.includes(saved)) {
      setLang(saved);
    }
  }, []);

  // при смене языка сохраняем
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LANG_KEY, lang);
  }, [lang]);

  const value = useMemo(() => {
    const dict = translations[lang] || translations.ru;

    return {
      lang,
      setLang,
      t: (key) => dict[key] || key,
    };
  }, [lang]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
