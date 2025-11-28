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

    // 1. Проверяем сохраненный язык
    const saved = window.localStorage.getItem(LANG_KEY);
    if (saved && SUPPORTED_LANGS.includes(saved)) {
      setLang(saved);
      return;
    }

    // 2. Если нет сохраненного, пытаемся определить
    let detectedLang = "en"; // По умолчанию английский для всех остальных (Венесуэла и т.д.)

    // Пробуем взять из Telegram WebApp
    const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
    // Или из браузера
    const browserLang = navigator.language || navigator.userLanguage;
    
    const userLang = (tgLang || browserLang || "").toLowerCase();

    if (userLang.startsWith("ru") || userLang === "be" || userLang === "kz") {
      detectedLang = "ru";
    } else if (userLang.startsWith("uk") || userLang.startsWith("ua")) {
      detectedLang = "ua";
    }
    
    // Если определенный язык поддерживается, используем его
    if (SUPPORTED_LANGS.includes(detectedLang)) {
      setLang(detectedLang);
      // Сохраняем, чтобы в следующий раз не гадать
      window.localStorage.setItem(LANG_KEY, detectedLang);
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
