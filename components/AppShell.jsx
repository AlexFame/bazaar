"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import LangSwitcher from "./LangSwitcher";
import { useLang } from "@/lib/i18n-client";

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLang();

  const [search, setSearch] = useState("");
  const [showFloatingSearch, setShowFloatingSearch] = useState(false);
  const lastScrollY = useRef(0);

  // Подтягиваем q из URL в инпут
  useEffect(() => {
    const q = searchParams.get("q") || "";
    setSearch(q);
  }, [searchParams]);

  // Липкий поиск: вниз - показываем, вверх - прячем (с плавной анимацией)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleScroll = () => {
      const currentY = window.scrollY;
      const prevY = lastScrollY.current;
      const isScrollingDown = currentY > prevY;

      if (currentY > 80 && isScrollingDown) {
        setShowFloatingSearch(true);
      } else if (!isScrollingDown) {
        setShowFloatingSearch(false);
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const term = search.trim();
    const params = new URLSearchParams();

    if (term) params.set("q", term);

    const url = params.toString() ? `/?${params.toString()}` : "/";
    router.push(url);
  };

  const navBtn =
    "flex-1 text-center px-4 py-2 rounded-full text-xs font-medium transition-colors whitespace-nowrap";

  const renderSearchBar = () => (
    <div className="flex items-center gap-2 bg-[#F2F3F7] rounded-full px-3 py-2 shadow-sm">
      <span className="text-base opacity-60" aria-hidden="true">
        🔍
      </span>
      <input
        type="text"
        placeholder={t("search_main_ph")}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-black/40"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <button
        type="submit"
        className="px-4 py-1.5 rounded-full bg-black text-white text-xs font-semibold"
      >
        {t("btn_search")}
      </button>
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-white flex flex-col items-center">
      {/* Шапка */}
      <header className="w-full bg-white pt-3 pb-3 border-b border-black/5">
        <div className="w-full max-w-[520px] px-3 mx-auto flex flex-col gap-3">
          {/* Текст сверху */}
          <div className="text-center text-xs font-semibold text-black/80">
            Bazaar – Telegram-маркетплейс для мигрантов в Германии
          </div>

          {/* Поиск в шапке */}
          <form onSubmit={handleSearchSubmit} className="w-full">
            {renderSearchBar()}
          </form>

          {/* НАВИГАЦИЯ + ЯЗЫК — СТРОГО ПО ЦЕНТРУ */}
          <div className="flex items-center justify-center gap-2">
            <nav className="flex gap-2">
              <Link href="/">
                <button
                  className={`${navBtn} ${
                    pathname === "/"
                      ? "bg-black text-white"
                      : "bg-[#F2F3F7] text-black"
                  }`}
                >
                  {t("navbar_brand")}
                </button>
              </Link>

              <Link href="/create">
                <button
                  className={`${navBtn} ${
                    pathname === "/create"
                      ? "bg-black text-white"
                      : "bg-[#F2F3F7] text-black"
                  }`}
                >
                  {t("navbar_create")}
                </button>
              </Link>

              <Link href="/my">
                <button
                  className={`${navBtn} ${
                    pathname === "/my"
                      ? "bg-black text-white"
                      : "bg-[#F2F3F7] text-black"
                  }`}
                >
                  {t("navbar_myAds")}
                </button>
              </Link>
            </nav>

            <LangSwitcher />
          </div>
        </div>
      </header>

      {/* Липкая панель поиска – всегда в DOM, плавная анимация */}
      <div
        className={`fixed top-2 left-1/2 -translate-x-1/2 w-full max-w-[520px] px-3 z-30 transition-all duration-200 ${
          showFloatingSearch
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-4 pointer-events-none"
        }`}
      >
        <form onSubmit={handleSearchSubmit}>{renderSearchBar()}</form>
      </div>

      {/* Контент под телегу по ширине */}
      <main className="flex-1 w-full max-w-[520px] mx-auto px-3 pb-4">
        {children}
      </main>

      <footer className="w-full max-w-[520px] mx-auto text-center text-[11px] py-5 opacity-60">
        Bazaar © 2025
      </footer>
    </div>
  );
}
