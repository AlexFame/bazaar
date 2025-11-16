"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useLang } from "@/lib/i18n-client";

export default function SearchBar() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useLang();

  const initialSearch = params.get("q") || "";
  const [searchTerm, setSearchTerm] = useState(initialSearch);

  useEffect(() => {
    setSearchTerm(initialSearch);
  }, [initialSearch]);

  function handleSearch() {
    const q = searchTerm.trim();
    if (q) {
      router.push(`/?q=${encodeURIComponent(q)}`);
    } else {
      router.push("/");
    }
  }

  return (
    <div className="bg-white rounded-2xl p-3 shadow-sm mb-3">
      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 border border-black rounded-xl px-3 py-1.5 text-xs"
          // оставляем твой существующий плейсхолдер как есть,
          // если у тебя уже есть ключ в i18n - подставишь его сам
          placeholder={t("search_main_ph") || "Поиск по объявлениям"}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
        />

        <button
          type="button"
          onClick={handleSearch}
          className="px-4 py-2 bg-black text-white rounded-xl text-xs font-medium whitespace-nowrap"
        >
          {t("btn_search")}
        </button>
      </div>
    </div>
  );
}
