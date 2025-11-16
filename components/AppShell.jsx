"use client";

import { useState, useEffect } from "react";
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

  // Поддерживаем значение поиска из URL (?q=...)
  useEffect(() => {
    const q = searchParams.get("q") || "";
    setSearch(q);
  }, [searchParams]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    const term = search.trim();

    const params = new URLSearchParams();
    if (term) params.set("q", term);

    const basePath = "/";
    const url = params.toString()
      ? `${basePath}?${params.toString()}`
      : basePath;

    router.push(url);
  }

  return (
    <div className="w-full min-h-screen bg-[#FFD500] flex flex-col">
      {/* ВЕРХ */}
      <header className="w-full bg-[#FFD500] pt-3 pb-2">
        <div className="w-full flex flex-col gap-2 px-4">
          {/* ПОИСК */}
          <form
            onSubmit={handleSearchSubmit}
            className="w-full flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={t("search_main_ph")}
              className="w-full bg-white rounded-full px-4 py-2 text-xs md:text-sm shadow-sm outline-none placeholder:text-black/40"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-full bg-black text-white text-xs md:text-sm font-medium"
            >
              {t("btn_search")}
            </button>
          </form>

          {/* МЕНЮ */}
          <div className="w-full flex items-center gap-2 nav-tabs">
            {/* Главная */}
            <Link href="/">
              <button
                className={`w-[100px] text-center px-3 py-1.5 rounded-full text-xs font-medium ${
                  pathname === "/"
                    ? "bg-black text-white"
                    : "bg-white text-black"
                }`}
              >
                {t("navbar_brand")}
              </button>
            </Link>

            {/* Создать */}
            <Link href="/create">
              <button
                className={`w-[100px] text-center px-3 py-1.5 rounded-full text-xs font-medium ${
                  pathname === "/create"
                    ? "bg-black text-white"
                    : "bg-white text-black"
                }`}
              >
                {t("navbar_create")}
              </button>
            </Link>

            {/* Мои объявления */}
            <Link href="/my">
              <button
                className={`w-[100px] text-center px-3 py-1.5 rounded-full text-xs font-medium ${
                  pathname === "/my"
                    ? "bg-black text-white"
                    : "bg-white text-black"
                }`}
              >
                {t("navbar_myAds")}
              </button>
            </Link>

            {/* ЯЗЫК */}
            <div className="ml-auto">
              <LangSwitcher />
            </div>
          </div>
        </div>
      </header>

      {/* Контент */}
      <main className="flex-1 w-full">{children}</main>

      {/* Футер */}
      <footer className="text-center text-xs py-6 opacity-60">
        Bazaar © 2025
      </footer>
    </div>
  );
}
