"use client";

import { useState, useEffect, useRef } from "react";
import { SUPPORTED_LANGS } from "@/lib/i18n";
import { useLang } from "@/lib/i18n-client";

export default function LangSwitcher() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Закрытие дропа по клику вне
  useEffect(() => {
    function handleClickOutside(e) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const currentLabel = (lang || "ru").toUpperCase();

  return (
    <div className="relative inline-block text-left" ref={wrapperRef}>
      {/* КНОПКА ТЕКУЩЕГО ЯЗЫКА В ЛИНИИ МЕНЮ */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="px-3 py-1.5 rounded-full text-xs font-medium bg-white text-black hover:bg-black hover:text-white transition"
      >
        {currentLabel}
      </button>

      {/* ДРОПДАУН С ЯЗЫКАМИ */}
      {open && (
        <div className="absolute right-0 mt-1 z-20 rounded-2xl border border-gray-200 bg-white shadow-lg px-1 py-1">
          <div className="flex gap-1">
            {SUPPORTED_LANGS.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setLang(code);
                  setOpen(false);
                }}
                className={`px-2 py-1 text-xs rounded-full ${
                  lang === code
                    ? "bg-black text-white"
                    : "text-gray-800 hover:bg-black/5"
                }`}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
