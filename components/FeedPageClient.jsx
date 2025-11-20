"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ListingCard from "./ListingCard";
import { CATEGORY_DEFS } from "@/lib/categories";
import { useLang } from "@/lib/i18n-client";
import { expandSearchTerm, detectCategory, SYNONYMS } from "@/lib/searchUtils";
import { getUserLocation, saveUserLocation, getSavedUserLocation, clearUserLocation, calculateDistance } from "@/lib/geocoding";

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
    filters: "Фильтры",
    category: "Категория",
    price: "Цена",
    condition: "Состояние",
    type: "Тип",
    more: "Ещё",
    foundInCategory: "Найдено в категории:",
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
    filters: "Фільтри",
    category: "Категорія",
    price: "Ціна",
    condition: "Стан",
    type: "Тип",
    more: "Ще",
    foundInCategory: "Знайдено в категорії:",
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
    filters: "Filters",
    category: "Category",
    price: "Price",
    condition: "Condition",
    type: "Type",
    more: "More",
    foundInCategory: "Found in category:",
  },
};

// Компонент слайдера цены
const PriceSlider = ({ min, max, onChange, minLimit = 0, maxLimit = 100000 }) => {
    const minVal = min === "" ? minLimit : Number(min);
    const maxVal = max === "" ? maxLimit : Number(max);
    const [localMin, setLocalMin] = useState(minVal);
    const [localMax, setLocalMax] = useState(maxVal);

    useEffect(() => {
        setLocalMin(min === "" ? minLimit : Number(min));
        setLocalMax(max === "" ? maxLimit : Number(max));
    }, [min, max, minLimit, maxLimit]);

    const handleMinChange = (e) => {
        const value = Math.min(Number(e.target.value), localMax - 100);
        setLocalMin(value);
        onChange(value, localMax);
    };

    const handleMaxChange = (e) => {
        const value = Math.max(Number(e.target.value), localMin + 100);
        setLocalMax(value);
        onChange(localMin, value);
    };

    const minPercent = ((localMin - minLimit) / (maxLimit - minLimit)) * 100;
    const maxPercent = ((localMax - minLimit) / (maxLimit - minLimit)) * 100;

    return (
        <div className="w-full px-2 py-4">
            <div className="relative w-full h-1 bg-gray-200 rounded-full">
                <div
                    className="absolute h-full bg-black rounded-full"
                    style={{ left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }}
                ></div>
                <input
                    type="range"
                    min={minLimit}
                    max={maxLimit}
                    value={localMin}
                    onChange={handleMinChange}
                    className="absolute w-full h-full opacity-0 cursor-pointer z-10"
                    style={{ pointerEvents: 'none' }}
                />
                <input
                    type="range"
                    min={minLimit}
                    max={maxLimit}
                    value={localMax}
                    onChange={handleMaxChange}
                    className="absolute w-full h-full opacity-0 cursor-pointer z-20"
                    style={{ pointerEvents: 'none' }}
                />
                
                {/* Custom Thumbs */}
                <div 
                    className="absolute w-4 h-4 bg-white border-2 border-black rounded-full -top-1.5 shadow-sm"
                    style={{ left: `${minPercent}%`, transform: 'translateX(-50%)' }}
                ></div>
                <div 
                    className="absolute w-4 h-4 bg-white border-2 border-black rounded-full -top-1.5 shadow-sm"
                    style={{ left: `${maxPercent}%`, transform: 'translateX(-50%)' }}
                ></div>
            </div>
            <div className="flex justify-between mt-4 gap-2">
                <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500">От</span>
                    <input 
                        type="number" 
                        value={localMin} 
                        onChange={(e) => {
                            const val = Number(e.target.value);
                            setLocalMin(val);
                            onChange(val, localMax);
                        }}
                        className="w-20 border rounded px-1 py-0.5 text-xs"
                    />
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[10px] text-gray-500">До</span>
                    <input 
                        type="number" 
                        value={localMax} 
                        onChange={(e) => {
                            const val = Number(e.target.value);
                            setLocalMax(val);
                            onChange(localMin, val);
                        }}
                        className="w-20 border rounded px-1 py-0.5 text-xs text-right"
                    />
                </div>
            </div>
             <style jsx>{`
                input[type=range]::-webkit-slider-thumb {
                    pointer-events: auto;
                    width: 20px;
                    height: 20px;
                    -webkit-appearance: none;
                }
            `}</style>
        </div>
    );
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
  
  // Location-based filtering
  const [userLocation, setUserLocation] = useState(null); // { lat, lng }
  const [radiusFilter, setRadiusFilter] = useState(null); // null | 1 | 5 | 10 | 25 | 50 (km)
  const [gettingLocation, setGettingLocation] = useState(false);
  const [withPhotoFilter, setWithPhotoFilter] = useState("all"); // all | yes | no
  const [dateFilter, setDateFilter] = useState("all"); // all | today | 3d | 7d | 30d

  // Динамические фильтры (JSONB)
  const [dynamicFilters, setDynamicFilters] = useState({});

  // Состояние для компактных выпадающих фильтров
  const [openDropdown, setOpenDropdown] = useState(null); // 'category', 'price', 'condition', etc.
  const dropdownRef = useRef(null);

  // Закрытие дропдауна при клике вне
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // когда меняется ?q= в урле (верхний поиск) - подхватываем в searchTerm
  useEffect(() => {
    setSearchTerm(urlQuery);
    
    // Умное определение категории
    if (urlQuery) {
        const detectedCat = detectCategory(urlQuery);
        if (detectedCat) {
            setCategoryFilter(detectedCat);
        }
    }
  }, [urlQuery]);

  // Сброс динамических фильтров при смене категории
  useEffect(() => {
    setDynamicFilters({});
  }, [categoryFilter]);

  // Load saved user location on mount
  useEffect(() => {
    const saved = getSavedUserLocation();
    if (saved) {
      setUserLocation(saved);
    }
  }, []);

  // Handler for getting user location
  async function handleGetLocation() {
    setGettingLocation(true);
    try {
      const location = await getUserLocation();
      if (location) {
        setUserLocation(location);
        saveUserLocation(location.lat, location.lng);
        console.log('✅ Геолокация получена:', location);
      } else {
        console.warn('⚠️ Не удалось получить геолокацию (пользователь отказал в разрешении или браузер не поддерживает)');
      }
    } catch (error) {
      console.error('❌ Ошибка получения геолокации:', error);
    } finally {
      setGettingLocation(false);
    }
  }

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
        // Умный поиск: расширяем запрос синонимами
        const allTerms = expandSearchTerm(term);
        
        if (allTerms.length > 0) {
            // Формируем сложный OR запрос
            const orConditions = allTerms.map(t => `title.ilike.%${t}%,description.ilike.%${t}%,location_text.ilike.%${t}%`).join(",");
            query = query.or(orConditions);
        }
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
      if (categoryFilter !== "all" && Object.keys(dynamicFilters).length > 0) {
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

      let chunk = data || [];
      
      // Client-side distance filtering
      if (userLocation && radiusFilter && chunk.length > 0) {
        chunk = chunk.filter(listing => {
          if (!listing.latitude || !listing.longitude) {
            return false; // Exclude listings without coordinates
          }
          
          const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            listing.latitude,
            listing.longitude
          );
          
          return distance <= radiusFilter;
        });
      }
      
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
    radiusFilter,
    userLocation,
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

  // --- КОМПОНЕНТЫ ФИЛЬТРОВ (Compact Mode) ---

  const FilterDropdown = ({ label, active, children, id, align = 'left' }) => (
      <div className="relative inline-block text-left mr-2 mb-2">
          <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === id ? null : id)}
              className={`inline-flex justify-between items-center w-full rounded-lg border px-3 py-2 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none ${active ? 'border-black ring-1 ring-black' : 'border-gray-300'}`}
          >
              {label}
              <svg className="-mr-1 ml-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
          </button>

          {openDropdown === id && (
              <div className={`absolute mt-2 w-64 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50 p-3 ${align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'}`}>
                  {children}
              </div>
          )}
      </div>
  );

  // Рендер компактных фильтров
  const renderCompactFilters = () => {
      return (
          <div className="flex flex-wrap items-center mb-4" ref={dropdownRef}>
              {/* Категория */}
              <FilterDropdown 
                  id="category" 
                  label={categoryFilter === 'all' ? txt.allCategories : (CATEGORY_DEFS.find(c => c.key === categoryFilter)?.[lang] || CATEGORY_DEFS.find(c => c.key === categoryFilter)?.ru)}
                  active={categoryFilter !== 'all'}
              >
                  <div className="max-h-60 overflow-y-auto">
                      <button
                          className={`block w-full text-left px-2 py-1.5 text-xs rounded-md ${categoryFilter === 'all' ? 'bg-gray-100 font-bold' : 'hover:bg-gray-50'}`}
                          onClick={() => { setCategoryFilter('all'); setOpenDropdown(null); }}
                      >
                          {txt.allCategories}
                      </button>
                      {CATEGORY_DEFS.map(cat => (
                          <button
                              key={cat.key}
                              className={`block w-full text-left px-2 py-1.5 text-xs rounded-md ${categoryFilter === cat.key ? 'bg-gray-100 font-bold' : 'hover:bg-gray-50'}`}
                              onClick={() => { setCategoryFilter(cat.key); setOpenDropdown(null); }}
                          >
                              {cat.icon} {cat[lang] || cat.ru}
                          </button>
                      ))}
                  </div>
              </FilterDropdown>

              {/* Цена (Слайдер) */}
              <FilterDropdown 
                  id="price" 
                  label={`${txt.price}${minPrice || maxPrice ? ': ' + (minPrice || '0') + ' - ' + (maxPrice || '∞') : ''}`}
                  active={!!minPrice || !!maxPrice}
              >
                  <PriceSlider 
                      min={minPrice} 
                      max={maxPrice} 
                      onChange={(min, max) => { setMinPrice(min); setMaxPrice(max); }}
                  />
              </FilterDropdown>

              {/* Состояние */}
              <FilterDropdown 
                  id="condition" 
                  label={conditionFilter === 'all' ? txt.condition : (conditionFilter === 'new' ? txt.conditionNew : conditionFilter === 'used' ? txt.conditionUsed : txt.conditionLikeNew)}
                  active={conditionFilter !== 'all'}
              >
                  <div className="flex flex-col">
                      {['all', 'new', 'used', 'like_new'].map(cond => (
                          <button
                              key={cond}
                              className={`block w-full text-left px-2 py-1.5 text-xs rounded-md ${conditionFilter === cond ? 'bg-gray-100 font-bold' : 'hover:bg-gray-50'}`}
                              onClick={() => { setConditionFilter(cond); setOpenDropdown(null); }}
                          >
                              {cond === 'all' ? txt.conditionAny : cond === 'new' ? txt.conditionNew : cond === 'used' ? txt.conditionUsed : txt.conditionLikeNew}
                          </button>
                      ))}
                  </div>
              </FilterDropdown>

               {/* Тип */}
               <FilterDropdown 
                  id="type" 
                  label={typeFilter === 'all' ? txt.type : (typeFilter === 'buy' ? txt.typeBuy : typeFilter === 'sell' ? txt.typeSell : typeFilter === 'services' ? txt.typeServices : txt.typeFree)}
                  active={typeFilter !== 'all'}
              >
                  <div className="flex flex-col">
                      {['all', 'buy', 'sell', 'services', 'free'].map(t => (
                          <button
                              key={t}
                              className={`block w-full text-left px-2 py-1.5 text-xs rounded-md ${typeFilter === t ? 'bg-gray-100 font-bold' : 'hover:bg-gray-50'}`}
                              onClick={() => { setTypeFilter(t); setOpenDropdown(null); }}
                          >
                              {t === 'all' ? txt.typeAny : t === 'buy' ? txt.typeBuy : t === 'sell' ? txt.typeSell : t === 'services' ? txt.typeServices : txt.typeFree}
                          </button>
                      ))}
                  </div>
              </FilterDropdown>

              {/* Динамические фильтры категории */}
              {categoryFilter !== 'all' && categoryFiltersDef.map(filter => {
                  if (filter.key === 'condition') return null; // пропускаем, так как есть общий
                  const val = dynamicFilters[filter.key];
                  const label = filter.label[lang] || filter.label.ru;
                  
                  return (
                      <FilterDropdown
                          key={filter.key}
                          id={filter.key}
                          label={`${label}${val ? ': ' + val : ''}`}
                          active={!!val}
                      >
                          <div className="flex flex-col">
                              {filter.type === 'select' && (
                                  <>
                                      <button
                                          className={`block w-full text-left px-2 py-1.5 text-xs rounded-md ${!val ? 'bg-gray-100 font-bold' : 'hover:bg-gray-50'}`}
                                          onClick={() => { setDynamicFilters({...dynamicFilters, [filter.key]: ''}); setOpenDropdown(null); }}
                                      >
                                          {txt.allCategories}
                                      </button>
                                      {filter.options.map(opt => (
                                          <button
                                              key={opt.value}
                                              className={`block w-full text-left px-2 py-1.5 text-xs rounded-md ${val === opt.value ? 'bg-gray-100 font-bold' : 'hover:bg-gray-50'}`}
                                              onClick={() => { setDynamicFilters({...dynamicFilters, [filter.key]: opt.value}); setOpenDropdown(null); }}
                                          >
                                              {opt.label[lang] || opt.label.ru}
                                          </button>
                                      ))}
                                  </>
                              )}
                              {filter.type === 'boolean' && (
                                  <>
                                      <button className={`block w-full text-left px-2 py-1.5 text-xs rounded-md ${val === '' ? 'bg-gray-100 font-bold' : 'hover:bg-gray-50'}`} onClick={() => { setDynamicFilters({...dynamicFilters, [filter.key]: ''}); setOpenDropdown(null); }}>-</button>
                                      <button className={`block w-full text-left px-2 py-1.5 text-xs rounded-md ${val === true ? 'bg-gray-100 font-bold' : 'hover:bg-gray-50'}`} onClick={() => { setDynamicFilters({...dynamicFilters, [filter.key]: true}); setOpenDropdown(null); }}>{txt.yes}</button>
                                      <button className={`block w-full text-left px-2 py-1.5 text-xs rounded-md ${val === false ? 'bg-gray-100 font-bold' : 'hover:bg-gray-50'}`} onClick={() => { setDynamicFilters({...dynamicFilters, [filter.key]: false}); setOpenDropdown(null); }}>{txt.no}</button>
                                  </>
                              )}
                              {(filter.type === 'text' || filter.type === 'number' || filter.type === 'range') && (
                                  <input
                                      type={filter.type === 'number' ? 'number' : 'text'}
                                      className="border border-gray-300 rounded-md px-2 py-1.5 text-xs w-full"
                                      value={val || ''}
                                      onChange={(e) => setDynamicFilters({...dynamicFilters, [filter.key]: e.target.value})}
                                      placeholder={label}
                                  />
                              )}
                          </div>
                      </FilterDropdown>
                  );
              })}
              
              {/* Чекбоксы (Фото, Бартер) как кнопки */}
              <button
                  onClick={() => setWithPhotoFilter(withPhotoFilter === 'yes' ? 'all' : 'yes')}
                  className={`mr-2 mb-2 px-3 py-2 rounded-lg border text-xs font-medium ${withPhotoFilter === 'yes' ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              >
                  {txt.withPhoto}
              </button>
               <button
                  onClick={() => setBarterFilter(barterFilter === 'yes' ? 'all' : 'yes')}
                  className={`mr-2 mb-2 px-3 py-2 rounded-lg border text-xs font-medium ${barterFilter === 'yes' ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              >
                  {txt.barter}
              </button>

              {/* Радиус поиска */}
              <FilterDropdown
                  id="radius"
                  label={radiusFilter ? `📍 ${radiusFilter} км` : '📍 Радиус'}
                  active={!!radiusFilter}
                  align="right"
              >
                  <div className="flex flex-col">
                      {!userLocation && (
                          <button
                              onClick={handleGetLocation}
                              disabled={gettingLocation}
                              className="mb-2 px-3 py-2 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700 disabled:bg-gray-400"
                          >
                              {gettingLocation ? 'Определяю...' : '📍 Определить мое местоположение'}
                          </button>
                      )}
                      {userLocation && (
                          <>
                              <button
                                  className={`block w-full text-left px-2 py-1.5 text-xs rounded-md ${!radiusFilter ? 'bg-gray-100 font-bold' : 'hover:bg-gray-50'}`}
                                  onClick={() => { setRadiusFilter(null); setOpenDropdown(null); }}
                              >
                                  Вся страна
                              </button>
                              {[1, 5, 10, 25, 50].map(km => (
                                  <button
                                      key={km}
                                      className={`block w-full text-left px-2 py-1.5 text-xs rounded-md ${radiusFilter === km ? 'bg-gray-100 font-bold' : 'hover:bg-gray-50'}`}
                                      onClick={() => { setRadiusFilter(km); setOpenDropdown(null); }}
                                  >
                                      {km} км
                                  </button>
                              ))}
                              <button
                                  onClick={() => { clearUserLocation(); setUserLocation(null); setRadiusFilter(null); setOpenDropdown(null); }}
                                  className="mt-2 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-md"
                              >
                                  ✕ Очистить геолокацию
                              </button>
                          </>
                      )}
                  </div>
              </FilterDropdown>

          </div>
      );
  };


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

              {/* 2. Компактные фильтры (вместо больших кнопок) */}
              {renderCompactFilters()}

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
