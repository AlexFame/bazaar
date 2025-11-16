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

  useEffect(() => {
    const q = searchParams.get("q") || "";
    setSearch(q);
  }, [searchParams]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    const term = search.trim();

    const params = new URLSearchParams();
    if (term) params.set("q", term);

    const url = params.toString() ? `/?${params.toString()}` : "/";
    router.push(url);
  }

  return (
    <div className="w-full min-h-screen bg-white flex flex-col">
      {/* ВЕРХ */}
      <header className="w-full bg-white pt-3 pb-2">
        <div className="w-full flex flex-col gap-2 px-4">
          {/* Текст сверху */}
          <div className="text-center text-[13px] font-semibold text-black/70">
            Bazaar — первый Telegram-маркетплейс для мигрантов в Германии
          </div>

          {/* Поиск */}
          <form
            onSubmit={handleSearchSubmit}
            className="w-full flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={t("search_main_ph")}
              className="w-full bg-white rounded-full px-4 py-2 text-xs md:text-sm shadow-sm outline-none border placeholder:text-black/40"
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

          {/* Навигация */}
          <div className="w-full flex items-center gap-2">
            <Link href="/">
              <button
                className={`w-[100px] text-center px-3 py-1.5 rounded-full text-xs font-medium ${
                  pathname === "/"
                    ? "bg-black text-white"
                    : "bg-white text-black border border-black/20"
                }`}
              >
                {t("navbar_brand")}
              </button>
            </Link>

            <Link href="/create">
              <button
                className={`w-[100px] text-center px-3 py-1.5 rounded-full text-xs font-medium ${
                  pathname === "/create"
                    ? "bg-black text-white"
                    : "bg-white text-black border border-black/20"
                }`}
              >
                {t("navbar_create")}
              </button>
            </Link>

            <Link href="/my">
              <button
                className={`w-[100px] text-center px-3 py-1.5 rounded-full text-xs font-medium ${
                  pathname === "/my"
                    ? "bg-black text-white"
                    : "bg-white text-black border border-black/20"
                }`}
              >
                {t("navbar_myAds")}
              </button>
            </Link>

            <div className="ml-auto">
              <LangSwitcher />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full">{children}</main>

      <footer className="text-center text-xs py-6 opacity-60">
        Bazaar © 2025
      </footer>
    </div>
  );
}
