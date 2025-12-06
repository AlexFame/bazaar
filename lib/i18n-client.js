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

    // 1. Пытаемся взять из Telegram WebApp (наивысший приоритет для авто-синхронизации)
    const tgLangRaw = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
    let tgLangDetected = null;
    
    if (tgLangRaw) {
       const lower = tgLangRaw.toLowerCase();
       if (lower.startsWith("ru") || lower === "be" || lower === "kz") tgLangDetected = "ru";
       else if (lower.startsWith("uk") || lower.startsWith("ua")) tgLangDetected = "ua";
       else tgLangDetected = "en"; // Default fallback for telegram users if not ru/ua? Or keep null?
       
       // Actually, let's stick to supported logic
       if (lower.startsWith("ru") || lower === "be" || lower === "kz") tgLangDetected = "ru";
       else if (lower.startsWith("uk") || lower.startsWith("ua")) tgLangDetected = "ua";
       else tgLangDetected = "en"; 
    }

    if (tgLangDetected && SUPPORTED_LANGS.includes(tgLangDetected)) {
       // Если язык телеграма отличается от текущего state, обновляем
       setLang(tgLangDetected);
       window.localStorage.setItem(LANG_KEY, tgLangDetected);
       return;
    }

    // 2. Если нет Telegram данных, проверяем localStorage (для браузера)
    const saved = window.localStorage.getItem(LANG_KEY);
    if (saved && SUPPORTED_LANGS.includes(saved)) {
      setLang(saved);
      return;
    }

    // 3. Если нет сохраненного, пытаемся определить по браузеру
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
      window.localStorage.setItem(LANG_KEY, detectedLang);
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
