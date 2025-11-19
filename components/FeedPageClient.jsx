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
    typeSell: "Продать",
    typeServices: "Услуги",
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
    conditionAny: "Любое состояние",
    conditionNew: "Новое",
    conditionUsed: "Б/у",
    conditionLikeNew: "Как новое",
    barter: "Бартер",
    withPhoto: "С фото",
    yes: "Да",
    no: "Нет",
  },
  ua: {
    searchPlaceholder: "Пошук по тексту",
    locationPlaceholder: "Місто / район",
    priceFrom: "Ціна від",
    priceTo: "Ціна до",
    allCategories: "Усі категорії",
    typeAny: "Будь-який тип",
    typeBuy: "Купити",
    typeSell: "Продати",
    typeServices: "Послуги",
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
    conditionAny: "Будь-який стан",
    conditionNew: "Нове",
    conditionUsed: "Б/в",
    conditionLikeNew: "Як нове",
    barter: "Бартер",
    withPhoto: "З фото",
    yes: "Так",
    no: "Ні",
  },
  en: {
    searchPlaceholder: "Search text",
    locationPlaceholder: "City / district",
    priceFrom: "Price from",
    priceTo: "Price to",
    allCategories: "All categories",
    typeAny: "Any type",
    typeBuy: "Buy",
    typeSell: "Sell",
    typeServices: "Services",
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
    conditionAny: "Any condition",
    conditionNew: "New",
    conditionUsed: "Used",
    conditionLikeNew: "Like new",
    barter: "Barter",
    withPhoto: "With photo",
    yes: "Yes",
    no: "No",
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
  
  // Общие фильтры
  const [typeFilter, setTypeFilter] = useState("all"); // all | buy | sell | services | free
  const [conditionFilter, setConditionFilter] = useState("all"); // all | new | used | like_new
  const [barterFilter, setBarterFilter] = useState("all"); // all | yes | no
  const [withPhotoFilter, setWithPhotoFilter] = useState("all"); // all | yes | no
  const [dateFilter, setDateFilter] = useState("all"); // all | today | 3d | 7d | 30d

  // Динамические фильтры (JSONB)
  const [dynamicFilters, setDynamicFilters] = useState({});

  // когда меняется ?q= в урле (верхний поиск) - подхватываем в searchTerm
  useEffect(() => {
    setSearchTerm(urlQuery);
  }, [urlQuery]);

  // Сброс динамических фильтров при смене категории
  useEffect(() => {
    setDynamicFilters({});
  }, [categoryFilter]);

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

      // Тип объявления
      if (typeFilter !== "all") {
        query = query.eq("type", typeFilter);
      }

      // Цена
      if (minPrice) {
        const v = Number(minPrice);
        if (!Number.isNaN(v)) query = query.gte("price", v);
      }
      if (maxPrice) {
        const v = Number(maxPrice);
        if (!Number.isNaN(v)) query = query.lte("price", v);
      }

      // Состояние
      if (conditionFilter !== "all") {
        query = query.eq("condition", conditionFilter);
      }

      // С фото (проверяем main_image_path не null)
      if (withPhotoFilter === "yes") {
        query = query.not("main_image_path", "is", null);
      } else if (withPhotoFilter === "no") {
        query = query.is("main_image_path", null);
      }

      // Дата
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

      // Динамические фильтры (JSONB)
      // parameters @> '{"key": "value"}'
      if (categoryFilter !== "all" && Object.keys(dynamicFilters).length > 0) {
        // Фильтруем пустые значения
        const activeFilters = Object.entries(dynamicFilters).reduce((acc, [k, v]) => {
            if (v !== "" && v !== false) acc[k] = v;
            return acc;
        }, {});

        if (Object.keys(activeFilters).length > 0) {
             query = query.contains("parameters", activeFilters);
        }
      }

      // Бартер
      if (barterFilter === "yes") {
          query = query.contains("parameters", { barter: true });
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

  // первоначальная загрузка и обновление при изменении фильтров
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
    conditionFilter,
    barterFilter,
    withPhotoFilter,
    dateFilter,
    dynamicFilters,
    lang,
  ]);

  async function handleLoadMore() {
    if (loadingMore || !hasMore) return;
    await fetchPage(page + 1, { append: true });
  }

  function handlePopularClick(term) {
    setSearchTerm(term);
  }

  // Рендер динамических фильтров
  const currentCategory = CATEGORY_DEFS.find((c) => c.key === categoryFilter);
  const categoryFiltersDef = currentCategory?.filters || [];

  const renderDynamicFilter = (filter) => {
      if (filter.key === "condition") return null; // Уже есть общий фильтр

      const label = filter.label[lang] || filter.label.ru;
      const value = dynamicFilters[filter.key] || "";

      if (filter.type === "select") {
          return (
              <div key={filter.key} className="flex flex-col">
                  <label className="text-[10px] font-semibold mb-1">{label}</label>
                  <select
                      className="border border-black rounded-xl px-2 py-1.5 text-xs bg-white"
                      value={value}
                      onChange={(e) => setDynamicFilters({...dynamicFilters, [filter.key]: e.target.value})}
                  >
                      <option value="">{txt.allCategories}</option> {/* "Все" */}
                      {filter.options.map(opt => (
                          <option key={opt.value} value={opt.value}>
                              {opt.label[lang] || opt.label.ru}
                          </option>
                      ))}
                  </select>
              </div>
          )
      }
      
      if (filter.type === "boolean") {
           return (
              <div key={filter.key} className="flex flex-col">
                  <label className="text-[10px] font-semibold mb-1">{label}</label>
                  <select
                      className="border border-black rounded-xl px-2 py-1.5 text-xs bg-white"
                      value={value}
                      onChange={(e) => setDynamicFilters({...dynamicFilters, [filter.key]: e.target.value === "true" ? true : e.target.value === "false" ? false : ""})}
                  >
                      <option value="">-</option>
                      <option value="true">{txt.yes}</option>
                      <option value="false">{txt.no}</option>
                  </select>
              </div>
          )
      }

      // text, number, range (как input)
      return (
          <div key={filter.key} className="flex flex-col">
              <label className="text-[10px] font-semibold mb-1">{label}</label>
              <input
                  type={filter.type === "number" ? "number" : "text"}
                  className="border border-black rounded-xl px-2 py-1.5 text-xs"
                  value={value}
                  onChange={(e) => setDynamicFilters({...dynamicFilters, [filter.key]: e.target.value})}
              />
          </div>
      )
  }


  return (
    <div className="w-full flex justify-center mt-3">
      <div className="w-full max-w-[520px] px-3">
        {/* ФИЛЬТРЫ – показываем ТОЛЬКО если есть ?q= в урле */}
        {hasSearchQuery && (
          <div className="bg-white rounded-2xl p-3 shadow-sm mb-3">
            <div className="flex flex-col gap-3">
              {/* 1. Поиск + Локация */}
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

              {/* 2. Категории */}
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

              {/* 3. Общие фильтры (всегда) */}
              <div className="grid grid-cols-2 gap-2">
                  {/* Цена */}
                  <div className="flex gap-1">
                      <input
                        type="number"
                        min="0"
                        placeholder={txt.priceFrom}
                        className="w-full border border-black rounded-xl px-2 py-1.5 text-xs"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                      />
                      <input
                        type="number"
                        min="0"
                        placeholder={txt.priceTo}
                        className="w-full border border-black rounded-xl px-2 py-1.5 text-xs"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                      />
                  </div>

                  {/* Тип объявления */}
                  <select
                      className="border border-black rounded-xl px-2 py-1.5 text-xs bg-white"
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                  >
                      <option value="all">{txt.typeAny}</option>
                      <option value="buy">{txt.typeBuy}</option>
                      <option value="sell">{txt.typeSell}</option>
                      <option value="services">{txt.typeServices}</option>
                      <option value="free">{txt.typeFree}</option>
                  </select>

                  {/* Состояние */}
                  <select
                      className="border border-black rounded-xl px-2 py-1.5 text-xs bg-white"
                      value={conditionFilter}
                      onChange={(e) => setConditionFilter(e.target.value)}
                  >
                      <option value="all">{txt.conditionAny}</option>
                      <option value="new">{txt.conditionNew}</option>
                      <option value="used">{txt.conditionUsed}</option>
                      <option value="like_new">{txt.conditionLikeNew}</option>
                  </select>

                  {/* Дата */}
                  <select
                      className="border border-black rounded-xl px-2 py-1.5 text-xs bg-white"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                  >
                      <option value="all">{txt.dateAll}</option>
                      <option value="today">{txt.dateToday}</option>
                      <option value="3d">{txt.date3d}</option>
                      <option value="7d">{txt.date7d}</option>
                      <option value="30d">{txt.date30d}</option>
                  </select>

                  {/* С фото */}
                   <select
                      className="border border-black rounded-xl px-2 py-1.5 text-xs bg-white"
                      value={withPhotoFilter}
                      onChange={(e) => setWithPhotoFilter(e.target.value)}
                  >
                      <option value="all">Фото: Все</option>
                      <option value="yes">{txt.withPhoto}</option>
                  </select>

                   {/* Бартер */}
                   <select
                      className="border border-black rounded-xl px-2 py-1.5 text-xs bg-white"
                      value={barterFilter}
                      onChange={(e) => setBarterFilter(e.target.value)}
                  >
                      <option value="all">Бартер: -</option>
                      <option value="yes">{txt.barter}</option>
                  </select>
              </div>

              {/* 4. Динамические фильтры категории */}
              {categoryFilter !== "all" && categoryFiltersDef.length > 0 && (
                  <div className="border-t border-black/10 pt-2 mt-1">
                      <div className="text-[11px] font-semibold mb-2 opacity-60">Фильтры категории:</div>
                      <div className="grid grid-cols-2 gap-2">
                          {categoryFiltersDef.map(renderDynamicFilter)}
                      </div>
                  </div>
              )}

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
