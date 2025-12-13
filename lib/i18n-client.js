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
  // при монтировании читаем язык из localStorage или определяем автоматически
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Пытаемся взять из Telegram WebApp (Высший приоритет для Mini App)
    const tgLangRaw = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
    let tgLangDetected = null;
    
    if (tgLangRaw) {
       const lower = tgLangRaw.toLowerCase();
       if (lower.startsWith("ru") || lower === "be" || lower === "kz") tgLangDetected = "ru";
       else if (lower.startsWith("uk") || lower.startsWith("ua")) tgLangDetected = "ua";
       else tgLangDetected = "en"; 
    }

    if (tgLangDetected && SUPPORTED_LANGS.includes(tgLangDetected)) {
       setLang(tgLangDetected);
       // LocalStorage обновится в соседнем useEffect
       return;
    }

    // 2. Проверяем localStorage
    const saved = window.localStorage.getItem(LANG_KEY);
    if (saved && SUPPORTED_LANGS.includes(saved)) {
      setLang(saved);
      return;
    }

    // 3. Если нет ничего, определяем по браузеру
    let detectedLang = "en"; 
    const browserLang = navigator.language || navigator.userLanguage;
    const userLang = (browserLang || "").toLowerCase();

    if (userLang.startsWith("ru") || userLang === "be" || userLang === "kz") {
      detectedLang = "ru";
    } else if (userLang.startsWith("uk") || userLang.startsWith("ua")) {
      detectedLang = "ua";
    }
    
    if (SUPPORTED_LANGS.includes(detectedLang)) {
      setLang(detectedLang);
    }
  }, []);

  // при смене языка сохраняем и обновляем html тег
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang;
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
