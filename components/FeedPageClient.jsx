"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ListingCard from "./ListingCard";
import { ListingCardSkeleton } from "./SkeletonLoader";
import { CATEGORY_DEFS } from "@/lib/categories";
import { useLang } from "@/lib/i18n-client";
import { expandSearchTerm, detectCategory, SYNONYMS } from "@/lib/searchUtils";
import { getTelegramUser } from "@/lib/telegram";
import { getUserLocation, saveUserLocation, getSavedUserLocation, clearUserLocation, calculateDistance } from "@/lib/geocoding";
import { getSearchHistory, addToSearchHistory, clearSearchHistory, removeFromSearchHistory } from "@/lib/searchHistory";
import dynamic from "next/dynamic";
import PopularListingsScroll from "./PopularListingsScroll";

const MapComponent = dynamic(() => import("./MapComponent"), { 
    ssr: false, 
    loading: () => <div className="h-[60vh] w-full bg-gray-100 animate-pulse rounded-xl mt-4" /> 
});

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
                    <span className="text-xs text-gray-500">От</span>
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
                    <span className="text-xs text-gray-500">До</span>
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
  const { lang, t } = useLang();
  
  // ... existing code ...

  const txt = {
      searchPlaceholder: t("searchPlaceholder"),
      locationPlaceholder: t("locationPlaceholder"),
      priceFrom: t("priceFrom"),
      priceTo: t("priceTo"),
      allCategories: t("allCategories"),
      typeAny: t("typeAny"),
      typeBuy: t("typeBuy"),
      typeSell: t("typeSell"),
      typeServices: t("typeServices"),
      typeFree: t("typeFree"),
      dateAll: t("dateAll"),
      dateToday: t("dateToday"),
      date3d: t("date3d"),
      date7d: t("date7d"),
      date30d: t("date30d"),
      popularQueriesLabel: t("popularQueriesLabel"),
      loading: t("loading"),
      empty: t("empty"),
      loadMore: t("loadMore"),
      loadingMore: t("loadingMore"),
      conditionAny: t("conditionAny"),
      conditionNew: t("conditionNew"),
      conditionUsed: t("conditionUsed"),
      conditionLikeNew: t("conditionLikeNew"),
      barter: t("barter"),
      withPhoto: t("withPhoto"),
      yes: t("yes"),
      no: t("no"),
      filters: t("filters"),
      category: t("category"),
      price: t("price"),
      condition: t("condition"),
      type: t("type"),
      more: t("more"),
      foundInCategory: t("foundInCategory"),
  };

  const searchParams = useSearchParams();
  const urlQuery = (searchParams.get("q") || "").trim();
  const hasSearchQuery = urlQuery.length > 0;

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLive, setIsLive] = useState(false); // Pulsating feed indicator
  const lastRefreshRef = useRef(Date.now());

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
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'
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

  // Search History Logic
  const [searchHistory, setSearchHistory] = useState([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
      setSearchHistory(getSearchHistory());
  }, []);

  const handleSearchKeyDown = (e) => {
      if (e.key === 'Enter') {
          const newHistory = addToSearchHistory(searchTerm);
          setSearchHistory(newHistory);
          setShowSearchHistory(false);
          e.target.blur();
      }
  };

  const handleHistoryClick = (term) => {
      setSearchTerm(term);
      const newHistory = addToSearchHistory(term);
      setSearchHistory(newHistory);
      setShowSearchHistory(false);
  };

  // Sync state with URL params
  useEffect(() => {
      const q = searchParams.get("q") || "";
      setSearchTerm(q);
      
      setLocationFilter(searchParams.get("location") || "");
      setMinPrice(searchParams.get("price_min") || "");
      setMaxPrice(searchParams.get("price_max") || "");
      
      const cat = searchParams.get("category") || "all";
      setCategoryFilter(cat);
      
      // Smart category detection only if no category in URL and there is a query
      if (cat === "all" && q) {
           const detected = detectCategory(q);
           if (detected) setCategoryFilter(detected);
      }

      setTypeFilter(searchParams.get("type") || "all");
      setConditionFilter(searchParams.get("condition") || "all");
      setBarterFilter(searchParams.get("barter") || "all");
      setWithPhotoFilter(searchParams.get("photo") || "all");
      setDateFilter(searchParams.get("date") || "all");
      setRadiusFilter(searchParams.get("radius") ? Number(searchParams.get("radius")) : null);

      const dyn = {};
      for (const [key, value] of searchParams.entries()) {
          if (key.startsWith("dyn_")) {
              dyn[key.replace("dyn_", "")] = value;
          }
      }
      setDynamicFilters(dyn);

  }, [searchParams]);

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

  const [mapListings, setMapListings] = useState([]);

  async function fetchMapListings() {
    setLoading(true);
    try {
      let query = supabase
        .from("listings")
        .select("id, title, price, image_path, latitude, longitude, created_at, is_vip")
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      // Apply same filters as main list
      const term = (searchTerm || "").trim();
      if (term) {
        const allTerms = expandSearchTerm(term);
        if (allTerms.length > 0) {
            const orConditions = allTerms.map(t => `title.ilike.%${t}%,description.ilike.%${t}%,location_text.ilike.%${t}%`).join(",");
            query = query.or(orConditions);
        }
      }

      if (locationFilter.trim()) query = query.ilike("location_text", `%${locationFilter.trim()}%`);
      if (categoryFilter !== "all") query = query.eq("category_key", categoryFilter);
      if (typeFilter !== "all") query = query.eq("type", typeFilter);
      if (minPrice) query = query.gte("price", Number(minPrice));
      if (maxPrice) query = query.lte("price", Number(maxPrice));
      if (conditionFilter !== "all") query = query.eq("condition", conditionFilter);
      if (withPhotoFilter === "yes") query = query.not("main_image_path", "is", null);
      if (withPhotoFilter === "no") query = query.is("main_image_path", null);
      
      // Date filter
      if (dateFilter !== "all") {
        const now = new Date();
        let fromDate = null;
        if (dateFilter === "today") fromDate = new Date(new Date().setHours(0,0,0,0));
        else if (dateFilter === "3d") fromDate = new Date(now.getTime() - 3 * 86400000);
        else if (dateFilter === "7d") fromDate = new Date(now.getTime() - 7 * 86400000);
        else if (dateFilter === "30d") fromDate = new Date(now.getTime() - 30 * 86400000);
        
        if (fromDate) query = query.gte("created_at", fromDate.toISOString());
      }

      // Dynamic filters
      if (categoryFilter !== "all" && Object.keys(dynamicFilters).length > 0) {
        const activeFilters = Object.entries(dynamicFilters).reduce((acc, [k, v]) => {
            if (v !== "" && v !== false) acc[k] = v;
            return acc;
        }, {});
        if (Object.keys(activeFilters).length > 0) query = query.contains("parameters", activeFilters);
      }
      
      if (barterFilter === "yes") query = query.contains("parameters", { barter: true });

      const { data, error } = await query;
      if (error) throw error;
      
      setMapListings(data || []);
    } catch (err) {
      console.error("Error fetching map listings:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPage(pageIndex, { append = false } = {}) {
    // If in map mode, we use fetchMapListings instead
    if (viewMode === 'map') {
        return fetchMapListings();
    }

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
        .select("*, profiles!listings_created_by_fkey(*)")
        .order("is_vip", { ascending: false })
        .order("updated_at", { ascending: false })
        .order("created_at", { ascending: false }) // Fallback
        .eq("status", "active")
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

  // Pulsating Feed Logic: Auto-refresh every 30s if on first page and no active search/filters
  useEffect(() => {
      if (hasSearchQuery || categoryFilter !== 'all' || typeFilter !== 'all' || page > 0) return;

      const interval = setInterval(() => {
          // Only refresh if user hasn't scrolled down too much (to avoid jumping)
          if (window.scrollY < 200) {
              console.log("🔄 Pulsating Feed: Refreshing...");
              setIsLive(true);
              fetchPage(0, { append: false }).then(() => {
                  setTimeout(() => setIsLive(false), 2000); // Hide indicator after 2s
              });
          }
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
  }, [hasSearchQuery, categoryFilter, typeFilter, page]);

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
    viewMode,
  ]);

  async function handleLoadMore() {
    if (loadingMore || !hasMore) return;
    await fetchPage(page + 1, { append: true });
  }

  function handlePopularClick(term) {
    setSearchTerm(term);
  }

  async function handleSaveSearch() {
      const tgUser = getTelegramUser();
      if (!tgUser) {
          alert("Пожалуйста, войдите через Telegram, чтобы сохранять поиски.");
          return;
      }

      const name = prompt("Название для поиска:", searchTerm || "Мой поиск");
      if (name === null) return; // Cancelled

      const params = {
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
          radiusFilter
      };

      try {
        const { data: profile } = await supabase.from("profiles").select("id").eq("tg_user_id", tgUser.id).single();
        
        if (!profile) {
            alert("Профиль не найден.");
            return;
        }

        const { error } = await supabase.from("saved_searches").insert({
            user_id: profile.id,
            name: name || "Поиск",
            query_params: params
        });

        if (error) throw error;
        alert("Поиск сохранен!");
      } catch (e) {
        console.error(e);
        alert("Ошибка сохранения.");
      }
  }

  function handleResetFilters() {
      setSearchTerm("");
      setLocationFilter("");
      setMinPrice("");
      setMaxPrice("");
      setCategoryFilter("all");
      setTypeFilter("all");
      setConditionFilter("all");
      setBarterFilter("all");
      setWithPhotoFilter("all");
      setDateFilter("all");
      setDynamicFilters({});
      setRadiusFilter(null);
      setUserLocation(null);
  }

  // Рендер динамических фильтров
  const currentCategory = CATEGORY_DEFS.find((c) => c.key === categoryFilter);
  const categoryFiltersDef = currentCategory?.filters || [];

  // --- КОМПОНЕНТЫ ФИЛЬТРОВ (Compact Mode) ---

  // Опции для селектов
  const typeOptions = [
    { value: "all", label: txt.typeAny },
    { value: "sell", label: txt.typeSell },
    { value: "buy", label: txt.typeBuy },
    { value: "service", label: txt.typeServices },
    { value: "free", label: txt.typeFree },
  ];

  const dateOptions = [
    { value: "all", label: txt.dateAll },
    { value: "today", label: txt.dateToday },
    { value: "3d", label: txt.date3d },
    { value: "7d", label: txt.date7d },
    { value: "30d", label: txt.date30d },
  ];

  const conditionOptions = [
    { value: "all", label: txt.conditionAny },
    { value: "new", label: txt.conditionNew },
    { value: "used", label: txt.conditionUsed },
    { value: "like_new", label: txt.conditionLikeNew },
  ];

  // Популярные запросы (пример)
  const popularQueries = [
    "iPhone 13",
    "PlayStation 5",
    "Велосипед",
    "Диван",
    "Работа",
  ];

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
                          onClick={() => { setCategoryFilter('all'); setDynamicFilters({}); setOpenDropdown(null); }}
                      >
                          {txt.allCategories}
                      </button>
                      {CATEGORY_DEFS.map(cat => (
                          <button
                              key={cat.key}
                              className={`block w-full text-left px-2 py-1.5 text-xs rounded-md ${categoryFilter === cat.key ? 'bg-gray-100 font-bold' : 'hover:bg-gray-50'}`}
                              onClick={() => { setCategoryFilter(cat.key); setDynamicFilters({}); setOpenDropdown(null); }}
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

              <div className="flex gap-2 ml-auto">
                  <button
                      onClick={handleSaveSearch}
                      className="mb-2 px-3 py-2 bg-black text-white rounded-lg text-xs font-medium hover:bg-gray-800 flex items-center gap-1"
                  >
                      <span>💾</span> Сохранить
                  </button>
                  <button
                      onClick={handleResetFilters}
                      className="mb-2 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200"
                  >
                      Сбросить
                  </button>
              </div>

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
                <div className="relative flex-1">
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder={txt.searchPlaceholder}
                      className="w-full border border-black rounded-xl px-3 py-1.5 text-xs"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onFocus={() => setShowSearchHistory(true)}
                      onBlur={() => setTimeout(() => setShowSearchHistory(false), 200)}
                      onKeyDown={handleSearchKeyDown}
                    />
                    {showSearchHistory && searchHistory.length > 0 && (
                        <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 mt-1 max-h-60 overflow-y-auto">
                            <div className="flex justify-between items-center px-3 py-2 border-b border-gray-100 bg-gray-50">
                                <span className="text-xs font-semibold text-gray-500">Недавние</span>
                                <button onClick={(e) => { e.preventDefault(); clearSearchHistory(); setSearchHistory([]); }} className="text-xs text-red-500 hover:underline">Очистить</button>
                            </div>
                            {searchHistory.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0" onClick={() => handleHistoryClick(item)}>
                                    <span className="text-xs text-gray-700 truncate">{item}</span>
                                    <button onClick={(e) => { e.stopPropagation(); const h = removeFromSearchHistory(item); setSearchHistory(h); }} className="text-gray-400 hover:text-red-500 px-1">×</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
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
                <div className="text-xs text-black/60 mb-1">
                  {txt.popularQueriesLabel}
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
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

        {/* Переключатель вида и счетчик */}
        <div className="flex justify-between items-center mb-3 mt-2">
            <h2 className="text-xs font-medium text-gray-400">
                {!loading && `${viewMode === 'map' ? mapListings.length : listings.length} ${listings.length % 10 === 1 && listings.length % 100 !== 11 ? 'объявление' : 'объявлений'}`}
            </h2>
            <div className="bg-gray-100 p-1 rounded-lg flex text-xs font-medium">
                <button 
                    className={`px-3 py-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}
                    onClick={() => setViewMode('list')}
                >
                    Список
                </button>
                <button 
                    className={`px-3 py-1.5 rounded-md transition-all ${viewMode === 'map' ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}
                    onClick={() => setViewMode('map')}
                >
                    Карта 🗺️
                </button>
            </div>
        </div>

        {/* Список объявлений или Карта */}
        {/* Popular Listings Scroll */}
      {!hasSearchQuery && !categoryFilter && (
        <PopularListingsScroll />
      )}

      {/* Список объявлений */}
      {loading ? (
            <div className="grid grid-cols-2 gap-2">
              {[...Array(6)].map((_, i) => <ListingCardSkeleton key={i} />)}
            </div>
        ) : listings.length === 0 && viewMode === 'list' ? (
          <div className="text-center py-10 text-gray-500">
            <p className="text-lg">Ничего не найдено 😔</p>
            <p className="text-sm mt-2">Попробуйте изменить параметры поиска</p>
          </div>
        ) : viewMode === 'map' ? (
            <MapComponent listings={mapListings} userLocation={userLocation} />
        ) : (
          <>
            {/* Live Indicator */}
            {isLive && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-black/80 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg animate-pulse">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    LIVE UPDATE
                </div>
            )}

            {/* Список объявлений */}
            <div className="grid grid-cols-2 gap-2">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </>
        )}

        {hasMore && listings.length > 0 && viewMode === 'list' && (
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
}
