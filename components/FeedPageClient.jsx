"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ListingCard from "./ListingCard";
import { CATEGORY_DEFS } from "@/lib/categories";
import { useLang } from "@/lib/i18n-client";

const PAGE_SIZE = 10;

const popularQueries = [
  "шифер",
  "автоэлектрик",
  "ремонт холодильников",
  "аренда",
  "оренда",
  "дельта",
  "tekken 250",
  "заправка кондиционера",
  "geon gns 300",
  "альфа",
  "lifan 150",
  "питбайк 125",
  "питбайк",
  "установка кондиционера",
  "маска для квадробики",
  "yamaha r1",
  "honda dio",
  "Книги",
  "Мобільні додатки",
];

// Локальные тексты для фильтров
const filterTexts = {
  ru: {
    searchPlaceholder: "Поиск по тексту",
    locationPlaceholder: "Город / район",
    priceFrom: "Цена от",
    priceTo: "Цена до",
    allCategories: "Все категории",
    typeAny: "Любой тип",
    typeBuy: "Купить",
    typeSell: "Продать/услуги",
    typeFree: "Отдам бесплатно",
    dateAll: "За всё время",
    dateToday: "Сегодня",
    date3d: "За 3 дня",
    date7d: "За неделю",
    date30d: "За месяц",
    popularQueriesLabel: "Популярные запросы:",
    loading: "Загружаем объявления...",
    empty: "По этим фильтрам объявлений нет.",
    loadMore: "Показать ещё",
    loadingMore: "Загружаю...",
  },
  ua: {
    searchPlaceholder: "Пошук по тексту",
    locationPlaceholder: "Місто / район",
    priceFrom: "Ціна від",
    priceTo: "Ціна до",
    allCategories: "Усі категорії",
    typeAny: "Будь-який тип",
    typeBuy: "Купити",
    typeSell: "Продати/послуги",
    typeFree: "Віддам безкоштовно",
    dateAll: "За весь час",
    dateToday: "Сьогодні",
    date3d: "За 3 дні",
    date7d: "За тиждень",
    date30d: "За місяць",
    popularQueriesLabel: "Популярні запити:",
    loading: "Завантажуємо оголошення...",
    empty: "За цими фільтрами оголошень немає.",
    loadMore: "Показати ще",
    loadingMore: "Завантажую...",
  },
  en: {
    searchPlaceholder: "Search text",
    locationPlaceholder: "City / district",
    priceFrom: "Price from",
    priceTo: "Price to",
    allCategories: "All categories",
    typeAny: "Any type",
    typeBuy: "Buy",
    typeSell: "Sell/services",
    typeFree: "Give away",
    dateAll: "All time",
    dateToday: "Today",
    date3d: "Last 3 days",
    date7d: "Last week",
    date30d: "Last month",
    popularQueriesLabel: "Popular searches:",
    loading: "Loading listings...",
    empty: "No listings for these filters.",
    loadMore: "Show more",
    loadingMore: "Loading...",
  },
};

export default function FeedPageClient() {
  const { lang } = useLang();
  const txt = filterTexts[lang] || filterTexts.ru;

  const searchParams = useSearchParams();
  const urlQuery = (searchParams.get("q") || "").trim();
  const hasSearchQuery = urlQuery.length > 0;

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // фильтры
  const [searchTerm, setSearchTerm] = useState(urlQuery);
  const [locationFilter, setLocationFilter] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all"); // all | buy | sell | free
  const [dateFilter, setDateFilter] = useState("all"); // all | today | 3d | 7d | 30d

  // когда меняется ?q= в урле (верхний поиск) - подхватываем в searchTerm
  useEffect(() => {
    setSearchTerm(urlQuery);
  }, [urlQuery]);

  async function fetchPage(pageIndex, { append = false } = {}) {
    const from = pageIndex * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    if (!append) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      let query = supabase
        .from("listings")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to);

      const term = (searchTerm || "").trim();
      if (term) {
        query = query.or(
          `title.ilike.%${term}%,description.ilike.%${term}%,location_text.ilike.%${term}%`
        );
      }

      if (locationFilter.trim()) {
        query = query.ilike("location_text", `%${locationFilter.trim()}%`);
      }

      if (categoryFilter !== "all") {
        query = query.eq("category_key", categoryFilter);
      }

      if (typeFilter !== "all") {
        query = query.eq("type", typeFilter);
      }

      if (minPrice) {
        const v = Number(minPrice);
        if (!Number.isNaN(v)) {
          query = query.gte("price", v);
        }
      }
      if (maxPrice) {
        const v = Number(maxPrice);
        if (!Number.isNaN(v)) {
          query = query.lte("price", v);
        }
      }

      if (dateFilter !== "all") {
        const now = new Date();
        let fromDate = null;

        if (dateFilter === "today") {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          fromDate = d;
        } else if (dateFilter === "3d") {
          const d = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
          fromDate = d;
        } else if (dateFilter === "7d") {
          const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          fromDate = d;
        } else if (dateFilter === "30d") {
          const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          fromDate = d;
        }

        if (fromDate) {
          query = query.gte("created_at", fromDate.toISOString());
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error("Ошибка загрузки объявлений:", error);
        return;
      }

      const chunk = data || [];
      if (append) {
        setListings((prev) => [...prev, ...chunk]);
      } else {
        setListings(chunk);
      }

      setHasMore(chunk.length === PAGE_SIZE);
      setPage(pageIndex);
    } catch (err) {
      console.error("Неожиданная ошибка при загрузке ленты:", err);
    } finally {
      if (!append) setLoading(false);
      if (append) setLoadingMore(false);
    }
  }

  // первоначальная загрузка и обновление при изменении фильтров / языка / searchTerm
  useEffect(() => {
    setPage(0);
    setHasMore(true);
    fetchPage(0, { append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchTerm,
    locationFilter,
    minPrice,
    maxPrice,
    categoryFilter,
    typeFilter,
    dateFilter,
    lang,
  ]);

  async function handleLoadMore() {
    if (loadingMore || !hasMore) return;
    await fetchPage(page + 1, { append: true });
  }

  function handlePopularClick(term) {
    setSearchTerm(term);
  }

  return (
    <div className="w-full flex justify-center mt-3">
      <div className="w-full max-w-[520px] px-3">
        {/* ФИЛЬТРЫ – показываем ТОЛЬКО если есть ?q= в урле */}
        {hasSearchQuery && (
          <div className="bg-white rounded-2xl p-3 shadow-sm mb-3">
            <div className="flex flex-col gap-2">
              {/* Поиск + локация */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={txt.searchPlaceholder}
                  className="flex-1 border border-black rounded-xl px-3 py-1.5 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <input
                  type="text"
                  placeholder={txt.locationPlaceholder}
                  className="w-32 border border-black rounded-xl px-3 py-1.5 text-xs"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                />
              </div>

              {/* Цена */}
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder={txt.priceFrom}
                  className="w-1/2 border border-black rounded-xl px-3 py-1.5 text-xs"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  placeholder={txt.priceTo}
                  className="w-1/2 border border-black rounded-xl px-3 py-1.5 text-xs"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>

              {/* Категория */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setCategoryFilter("all")}
                  className={`px-3 py-1 rounded-full border text-[11px] font-medium ${
                    categoryFilter === "all"
                      ? "bg-black text-white border-black"
                      : "bg-white text-black border-black/20"
                  }`}
                >
                  {txt.allCategories}
                </button>
                {CATEGORY_DEFS.map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setCategoryFilter(cat.key)}
                    className={`px-3 py-1 rounded-full border text-[11px] font-medium flex items-center ${
                      categoryFilter === cat.key
                        ? "bg-black text-white border-black"
                        : "bg-white text-black border-black/20"
                    }`}
                  >
                    {cat.icon && (
                      <span className="mr-1" aria-hidden="true">
                        {cat.icon}
                      </span>
                    )}
                    <span>{cat[lang] || cat.ru}</span>
                  </button>
                ))}
              </div>

              {/* Тип сделки и дата */}
              <div className="flex gap-2">
                <select
                  className="flex-1 border border-black rounded-xl px-3 py-1.5 text-xs bg_white"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="all">{txt.typeAny}</option>
                  <option value="buy">{txt.typeBuy}</option>
                  <option value="sell">{txt.typeSell}</option>
                  <option value="free">{txt.typeFree}</option>
                </select>

                <select
                  className="flex-1 border border-black rounded-xl px-3 py-1.5 text-xs bg_white"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                >
                  <option value="all">{txt.dateAll}</option>
                  <option value="today">{txt.dateToday}</option>
                  <option value="3d">{txt.date3d}</option>
                  <option value="7d">{txt.date7d}</option>
                  <option value="30d">{txt.date30d}</option>
                </select>
              </div>

              {/* Популярные запросы */}
              <div className="mt-1">
                <div className="text-[11px] text-black/60 mb-1">
                  {txt.popularQueriesLabel}
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
                  {popularQueries.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handlePopularClick(q)}
                      className="flex-shrink-0 px-3 py-1 rounded-full bg-black text-white"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <style jsx>{`
              .no-scrollbar::-webkit-scrollbar {
                display: none;
              }
              .no-scrollbar {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}</style>
          </div>
        )}

        {/* ЛЕНТА */}
        {loading && listings.length === 0 ? (
          <div className="text-xs text-black/60 mb-4">{txt.loading}</div>
        ) : null}

        {!loading && listings.length === 0 && (
          <div className="text-xs text-black/60 mb-4">{txt.empty}</div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>

        {hasMore && listings.length > 0 && (
          <div className="mt-4 mb-6 flex justify-center">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-6 py-2 text-xs font-medium bg-black text-white rounded-full disabled:opacity-60"
            >
              {loadingMore ? txt.loadingMore : txt.loadMore}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
