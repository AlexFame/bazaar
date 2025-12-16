"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAtom } from "jotai"; // Added Jotai
import { feedListingsAtom, feedFiltersAtom, feedMetaAtom, feedScrollAtom } from "@/lib/store"; // Added atoms
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
 // Added animation lib
import { supabase } from "@/lib/supabaseClient";
import Stories from "./Stories";
import ListingCard from "./ListingCard";
import { ListingCardSkeleton } from "./SkeletonLoader";
import { CATEGORY_DEFS } from "@/lib/categories";
import { useLang } from "@/lib/i18n-client";
import { expandSearchTerm, detectCategory, SYNONYMS } from "@/lib/searchUtils";

import { getTelegramUser } from "@/lib/telegram";
import { MagnifyingGlassIcon, AdjustmentsHorizontalIcon, XMarkIcon, HeartIcon, BellIcon } from "@heroicons/react/24/outline";
import {
  getUserLocation,
  saveUserLocation,
  getSavedUserLocation,
  clearUserLocation,
  calculateDistance,
} from "@/lib/geocoding";
import {
  getSearchHistory,
  addToSearchHistory,
  clearSearchHistory,
  removeFromSearchHistory,
} from "@/lib/searchHistory";
import dynamic from "next/dynamic";
import Image from "next/image";
import PopularListingsScroll from "./PopularListingsScroll";
import RecentlyViewedScroll from "./RecentlyViewedScroll";
import LangSwitcher from "./LangSwitcher";
import ThemeSwitcher from "./ThemeSwitcher";
import PullToRefresh from "@/components/PullToRefresh";
import BackButton from "@/components/BackButton";
import useImpressionTracker from "@/hooks/useImpressionTracker";

const MapComponent = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="h-[60vh] w-full bg-gray-100 dark:bg-neutral-900 animate-pulse rounded-xl mt-4" />
  ),
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

// Компонент слайдера цены
const PriceSlider = ({
  min,
  max,
  onChange,
  minLimit = 0,
  maxLimit = 100000,
}) => {
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
          style={{
            left: `${minPercent}%`,
            width: `${maxPercent - minPercent}%`,
          }}
        ></div>
        <input
          type="range"
          min={minLimit}
          max={maxLimit}
          value={localMin}
          onChange={handleMinChange}
          className="absolute w-full h-full opacity-0 cursor-pointer z-10"
          style={{ pointerEvents: "none" }}
        />
        <input
          type="range"
          min={minLimit}
          max={maxLimit}
          value={localMax}
          onChange={handleMaxChange}
          className="absolute w-full h-full opacity-0 cursor-pointer z-20"
          style={{ pointerEvents: "none" }}
        />

        {/* Custom Thumbs */}
        <div
          className="absolute w-4 h-4 bg-white border-2 border-black rounded-full -top-1.5 shadow-sm"
          style={{ left: `${minPercent}%`, transform: "translateX(-50%)" }}
        ></div>
        <div
          className="absolute w-4 h-4 bg-white border-2 border-black rounded-full -top-1.5 shadow-sm"
          style={{ left: `${maxPercent}%`, transform: "translateX(-50%)" }}
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
        input[type="range"]::-webkit-slider-thumb {
          pointer-events: auto;
          width: 20px;
          height: 20px;
          -webkit-appearance: none;
        }
      `}</style>
    </div>
  );
};

export default function FeedPageClient({ forcedCategory = null }) {
  const { lang, t } = useLang();
  const router = useRouter();

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
    typeExchange: t("typeExchange"),
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
    foundInCategory: t("foundInCategory"),
    sort: t("sort") || "Сортировка",
    sortDateDesc: t("sortDateDesc") || "Самые новые",
    sortDateAsc: t("sortDateAsc") || "Самые старые",
    sortPriceAsc: t("sortPriceAsc") || "Дешевые",
    sortPriceDesc: t("sortPriceDesc") || "Дорогие",
    sortDistance: t("sortDistance") || "Ближайшие",
  };

  const searchParams = useSearchParams();
  const urlQuery = (searchParams.get("q") || "").trim();
  const hasSearchQuery = urlQuery.length > 0;
  
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Helper to safely resolve translation labels
  const getSafeLabel = (obj, fallback) => {
    if (!obj) return fallback;
    if (typeof obj === 'string') return obj;
    if (typeof obj === 'object') {
        return obj[lang] || obj.ru || obj.en || fallback;
    }
    return fallback;
  };

  // Lock body scroll and hide bottom navigation when search is active
  useEffect(() => {
    const nav = document.getElementById("mobile-bottom-nav");
    if (isSearchFocused) {
      document.body.style.overflow = "hidden";
      if (nav) nav.style.display = "none";
    } else {
      document.body.style.overflow = "";
      if (nav) nav.style.display = "";
    }
    return () => {
      document.body.style.overflow = "";
      if (nav) nav.style.display = "";
    };
  }, [isSearchFocused]);

  // useImpressionTracker(listings, "feed");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const lastRefreshRef = useRef(Date.now());

  // --- JOTAI CACHE ---
  const [listings, setListings] = useAtom(feedListingsAtom);
  const [cachedFilters, setCachedFilters] = useAtom(feedFiltersAtom);
  const [cachedMeta, setCachedMeta] = useAtom(feedMetaAtom);
  const [scrollPos, setScrollPos] = useAtom(feedScrollAtom);
  
  // Local loading state (only true if we need to fetch)
  
  const [loading, setLoading] = useState(listings.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [headerCompact, setHeaderCompact] = useState(false);
  
  // Request cancellation
  const abortControllerRef = useRef(null);

  // Restore scroll on mount
  useEffect(() => {
    if (listings.length > 0 && scrollPos > 0) {
        window.scrollTo(0, scrollPos);
    }
    
    // Save scroll on unmount
    return () => {
        setScrollPos(window.scrollY);
    };
  }, []); // Only on mount/unmount

  // Subcategory functionality is now handled via Pills in the feed
  // No modal on entry required.

  // Filter handlerscroll for header compacting
  useEffect(() => {
    const handleScroll = () => {
      setHeaderCompact(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // фильтры
  const [searchTerm, setSearchTerm] = useState(urlQuery);
  const [locationFilter, setLocationFilter] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showFiltersModal, setShowFiltersModal] = useState(false); // New Modal State
  // Helper for initial category state
  const getInitialCategory = () => {
    const urlCat = searchParams.get("category");
    const urlQ = searchParams.get("q");
    if (!urlCat && urlQ && !forcedCategory) {
        return detectCategory(urlQ) || "all";
    }
    return urlCat || forcedCategory || "all";
  };

  const [categoryFilter, setCategoryFilter] = useState(getInitialCategory());

  // Construct current filter object to compare with cache
  const currentFilters = {
      searchTerm,
      locationFilter,
      categoryFilter,
      minPrice, 
      maxPrice,
      type: searchParams.get("type") || "all",
      condition: searchParams.get("condition") || "all",
      barter: searchParams.get("barter") || "all", 
      photo: searchParams.get("photo") || "all",
      date: searchParams.get("date") || "all",
      radius: searchParams.get("radius") || null,
      dynamic: Object.fromEntries([...searchParams.entries()].filter(([k]) => k.startsWith("dyn_"))),
      sort: searchParams.get("sort") || "date_desc",
      photoCount: searchParams.get("photo_count") || "any",
      sellerStatus: searchParams.get("seller_status") || "any",
      delivery: searchParams.get("delivery") || "all"
  };

  // Check if we should use cache
  useEffect(() => {
     const isFiltersChanged = JSON.stringify(currentFilters) !== JSON.stringify(cachedFilters);
     const isEmpty = listings.length === 0;

     // If filters changed or we have no data
     if (isEmpty || isFiltersChanged) {
          console.log("Filters changed or cache empty, fetching...", { isEmpty, isFiltersChanged });
          
          if (isFiltersChanged) {
              setListings([]); // Clear to show skeleton
              setMapLoaded(false); // Reset map loaded state so it fetches fresh on switch
              setLoading(true);
              setPage(0); // Reset pagination
              setHasMore(true);
          } else {
              if (isEmpty) setLoading(true); // Initial load
          }

          fetchPage(0, { append: false }).then(() => {
            setCachedFilters(currentFilters);
            setLoading(false);
          }).catch(e => {
            console.error("Fetch error:", e);
            setLoading(false);
          });
     } else {
          console.log("Using cached listings.");
          setLoading(false);
     }
  }, [JSON.stringify(currentFilters)]); // Depend on stable stringified filters



  // Общие фильтры
  const [typeFilter, setTypeFilter] = useState(searchParams.get("type") || "all"); // all | buy | sell | services | free
  const [conditionFilter, setConditionFilter] = useState(searchParams.get("condition") || "all"); // all | new | used | like_new
  const [barterFilter, setBarterFilter] = useState(searchParams.get("barter") || "all"); // all | yes | no

  // Location-based filtering
  const [userLocation, setUserLocation] = useState(null); // { lat, lng }
  const [radiusFilter, setRadiusFilter] = useState(searchParams.get("radius") ? Number(searchParams.get("radius")) : null); // null | 1 | 5 | 10 | 25 | 50 (km)
  const [viewMode, setViewMode] = useState("list"); // 'list' | 'map'
  const [gettingLocation, setGettingLocation] = useState(false);
  const [withPhotoFilter, setWithPhotoFilter] = useState(searchParams.get("photo") || "all"); // all | yes | no
  const [dateFilter, setDateFilter] = useState(searchParams.get("date") || "all"); // all | today | used | like_new

  // Advanced Filters
  const [sortFilter, setSortFilter] = useState(searchParams.get("sort") || "date_desc"); // date_desc | date_asc | price_asc | price_desc | distance
  const [photoCountFilter, setPhotoCountFilter] = useState(searchParams.get("photo_count") || "any"); // any | 1 | 3 | 5
  const [sellerStatusFilter, setSellerStatusFilter] = useState(searchParams.get("seller_status") || "any"); // any | verified | rating_4
  const [deliveryFilter, setDeliveryFilter] = useState(searchParams.get("delivery") || "all"); // all | pickup | delivery | meet

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
  const [searchSuggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const stored = getSearchHistory();
    setSearchHistory(stored);
    
    // Header scroll
    const handleScroll = () => setHeaderCompact(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Smart search: fetch suggestions as user types
  useEffect(() => {
    const fetchSuggestions = async () => {
      const term = searchTerm.trim();
      if (term.length < 2) {
        setSuggestions([]);
        return;
      }

      setLoadingSuggestions(true);
      try {
        // Generate search variants with transliteration
        const generateSearchVariants = (text) => {
          const variants = [text.toLowerCase()];
          
          // Latin to Cyrillic transliteration map (common tech words only)
          const translations = {
            'iphone': 'айфон', 'айфон': 'iphone',
            'ipad': 'айпад', 'айпад': 'ipad',
            'macbook': 'макбук', 'макбук': 'macbook',
            'apple': 'эппл', 'эппл': 'apple',
            'samsung': 'самсунг', 'самсунг': 'samsung',
            'xiaomi': 'сяоми', 'сяоми': 'xiaomi',
            'huawei': 'хуавей', 'хуавей': 'huawei',
            'lenovo': 'леново', 'леново': 'lenovo',
            'asus': 'асус', 'асус': 'asus',
            'acer': 'эйсер', 'эйсер': 'acer',
            'dell': 'делл', 'делл': 'dell',
            'sony': 'сони', 'сони': 'sony'
          };
          
          const lowerText = text.toLowerCase();
          
          // Check if the search term matches any dictionary word
          if (translations[lowerText]) {
            variants.push(translations[lowerText]);
          }
          
          // Check if search term contains any dictionary word
          for (const [key, value] of Object.entries(translations)) {
            if (lowerText.includes(key) && key !== lowerText) {
              variants.push(lowerText.replace(key, value));
            }
          }
          
          return [...new Set(variants)]; // Remove duplicates
        };
        
        const searchVariants = generateSearchVariants(term);
        
        // Use textSearch for better results - search across all variants
        let allData = [];
        
        for (const variant of searchVariants) {
          const { data, error } = await supabase
            .from("listings")
            .select("id, title, category_key, price, main_image_path")
            .ilike('title', `%${variant}%`)
            .eq("status", "active")
            .limit(10);
          
          if (!error && data) {
            allData = [...allData, ...data];
          }
        }
        
        // Remove duplicates by ID
        const uniqueData = Array.from(
          new Map(allData.map(item => [item.id, item])).values()
        ).slice(0, 10);

        if (uniqueData.length > 0) {
          // Group by title and get category
          const unique = [];
          const seen = new Set();
          uniqueData.forEach((item) => {
            const titleLower = item.title.toLowerCase();
            if (!seen.has(titleLower)) {
              seen.add(titleLower);
              const category = CATEGORY_DEFS.find((c) => c.key === item.category_key);
              
              let publicUrl = null;
              if (item.main_image_path) {
                  if (item.main_image_path.startsWith('http')) {
                      publicUrl = item.main_image_path;
                  } else {
                      const { data } = supabase.storage.from("listing-images").getPublicUrl(item.main_image_path);
                      publicUrl = data?.publicUrl;
                  }
              }

              unique.push({
                id: item.id,
                title: item.title,
                price: item.price,
                category: category ? category[lang] || category.ru : null,
                categoryKey: item.category_key,
                isListing: true,
                image: publicUrl,
              });
            }
          });
          setSuggestions(unique);
        }
      } catch (e) {
        console.error("Error fetching suggestions:", e);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, lang]);

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
        handleSearchSubmit(e);
        if (onSearchFocusChange) onSearchFocusChange(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    // Determine if it's a specific listing or a search term
    if (suggestion.isListing) {
        // Direct navigation to listing
        setIsSearchFocused(false);
        setShowSearchHistory(false);
        document.body.style.overflow = ""; // Unlock scroll immediately
        router.push(`/listing/${suggestion.id}`);
        return;
    }

    // It is a category or search term
    setSearchTerm(suggestion.title);
    setShowSearchHistory(false);
    setIsSearchFocused(false);
    document.body.style.overflow = "";

    // Add to specific history
    const newHistory = addToSearchHistory(suggestion.title);
    setSearchHistory(newHistory);
    
    // Navigate with query
    const params = new URLSearchParams();
    params.set("q", suggestion.title);
    if (suggestion.categoryKey) {
        setCategoryFilter(suggestion.categoryKey);
        params.set("category", suggestion.categoryKey);
    }
    router.push(`/?${params.toString()}`);
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

    // Optimize category detection to avoid double-render/race condition
    let cat = searchParams.get("category") || forcedCategory || "all";
    
    // Smart category detection only if no category in URL and there is a query
    if (cat === "all" && q) {
      const detected = detectCategory(q);
      if (detected) cat = detected;
    }
    setCategoryFilter(cat);

    setTypeFilter(searchParams.get("type") || "all");
    setConditionFilter(searchParams.get("condition") || "all");
    setBarterFilter(searchParams.get("barter") || "all");
    setWithPhotoFilter(searchParams.get("photo") || "all");
    setDateFilter(searchParams.get("date") || "all");
    setRadiusFilter(
      searchParams.get("radius") ? Number(searchParams.get("radius")) : null
    );

    const dyn = {};
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith("dyn_")) {
        // Check for min/max
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
        console.log("✅ Геолокация получена:", location);
      } else {
        console.warn(
          "⚠️ Не удалось получить геолокацию (пользователь отказал в разрешении или браузер не поддерживает)"
        );
      }
    } catch (error) {
      console.error("❌ Ошибка получения геолокации:", error);
    } finally {
      setGettingLocation(false);
    }
  }

  const [mapListings, setMapListings] = useState([]);
  const [mapLoaded, setMapLoaded] = useState(false); // To prevent infinite loops if no results

  // Fetch map data when switching to map view
  useEffect(() => {
    if (viewMode === "map" && !mapLoaded) {
        fetchMapListings();
    }
  }, [viewMode, mapLoaded]);

  async function fetchMapListings() {
    setLoading(true);
    try {
      let query = supabase
        .from("listings")
        .select(
          "id, title, price, image_path, latitude, longitude, created_at, is_vip"
        )
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        // .not("longitude", "is", null) // Removed duplicate
        // .or("status.neq.closed,status.is.null") // Removed to restore listings
        .order("created_at", { ascending: false });

      // Apply same filters as main list
      const term = (searchTerm || "").trim();
      if (term) {
        const allTerms = expandSearchTerm(term);
        if (allTerms.length > 0) {
          const orConditions = allTerms
            .map(
              (t) =>
                `title.ilike.%${t}%`
            )
            .join(",");
          query = query.or(orConditions);
        }
      }

      if (locationFilter.trim())
        query = query.ilike(
          "location_text",
          `%${locationFilter.trim()}%`
        );
      if (categoryFilter !== "all")
        query = query.eq("category_key", categoryFilter);
      if (typeFilter !== "all") query = query.eq("type", typeFilter);
      if (minPrice) query = query.gte("price", Number(minPrice));
      if (maxPrice) query = query.lte("price", Number(maxPrice));
      if (conditionFilter !== "all")
        query = query.eq("condition", conditionFilter);
      if (withPhotoFilter === "yes")
        query = query.not("main_image_path", "is", null);
      if (withPhotoFilter === "no")
        query = query.is("main_image_path", null);

      // Date filter
      if (dateFilter !== "all") {
        const now = new Date();
        let fromDate = null;
        if (dateFilter === "today")
          fromDate = new Date(new Date().setHours(0, 0, 0, 0));
        else if (dateFilter === "3d")
          fromDate = new Date(now.getTime() - 3 * 86400000);
        else if (dateFilter === "7d")
          fromDate = new Date(now.getTime() - 7 * 86400000);
        else if (dateFilter === "30d")
          fromDate = new Date(now.getTime() - 30 * 86400000);

        if (fromDate)
          query = query.gte("created_at", fromDate.toISOString());
      }

      // Dynamic filters
      if (categoryFilter !== "all" && Object.keys(dynamicFilters).length > 0) {
        const activeFilters = Object.entries(dynamicFilters).reduce(
          (acc, [k, v]) => {
            if (v !== "" && v !== false) acc[k] = v;
            return acc;
          },
          {}
        );
        if (Object.keys(activeFilters).length > 0)
          query = query.contains("parameters", activeFilters);
      }

      if (barterFilter === "yes")
        query = query.contains("parameters", { barter: true });

      const { data, error } = await query;
      if (error) throw error;

      setMapListings(data || []);
      setMapLoaded(true); // Mark as loaded
    } catch (err) {
      console.error("Error fetching map listings:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPage(pageIndex, { append = false } = {}) {
    // If in map mode, мы берём данные для карты
    if (viewMode === "map") {
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
      // Cancel previous request if exists using AbortController (optional, if Supabase supports it or we just ignore result)
      // Since Supabase JS client doesn't fully support AbortSignal in v2 for all methods, 
      // we will use a ref ID tracking pattern or just standard cleanup logic.
      // But actually, we can just track the current request ID.
      
      // Let's use a simple "ignore stale result" pattern via a ref, but `abort` is better for network.
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // 1. Fetch listings (raw, without joins to avoid FK errors)
      let query = supabase
        .from("listings")
        .select("*") // Removed profiles join to prevent errors/filtering
        // .select("*, profiles(is_verified, rating)")
        .order("is_vip", { ascending: false });
        // Sorting
        if (sortFilter === 'date_desc') {
            query = query.order("created_at", { ascending: false });
        } else if (sortFilter === 'date_asc') {
            query = query.order("created_at", { ascending: true });
        } else if (sortFilter === 'price_asc') {
            query = query.order("price", { ascending: true });
        } else if (sortFilter === 'price_desc') {
             query = query.order("price", { ascending: false });
        } else {
             // Default
             query = query.order("created_at", { ascending: false });
        }
        
        // Paging
        query = query.range(from, to);

      const term = (searchTerm || "").trim();
      if (term) {
        // Advanced "Smart" Search: Split into words, expand each, and AND the groups
        // Example: "iphone 15" -> (title ILIKE %iphone% OR title ILIKE %айфон%) AND (title ILIKE %15%)
        const words = term.split(/\s+/).filter(w => w.length > 0);
        
        words.forEach(word => {
            const variants = expandSearchTerm(word); // Returns [word, ...synonyms]
            if (variants.length > 0) {
                const orCondition = variants
                    .map(v => `title.ilike.%${v}%`)
                    .join(",");
                query = query.or(orCondition);
            }
        });
      }

      if (locationFilter.trim()) {
        query = query.ilike(
          "location_text",
          `%${locationFilter.trim()}%`
        );
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

      // С фото (Photo Logic)
      if (withPhotoFilter === "yes" || photoCountFilter !== "any") {
         // If "yes" or any specific count, we at least need a main image
         query = query.not("main_image_path", "is", null);
      } else if (withPhotoFilter === "no") {
         query = query.is("main_image_path", null);
      }
      
      // Seller Status Filtering using the joined profile
      if (sellerStatusFilter === 'verified') {
          query = query.eq('profiles.is_verified', true);
      } else if (sellerStatusFilter === 'rating_4') {
          query = query.gte('profiles.rating', 4);
      }

      // Delivery (Assumption: delivery options are in 'parameters' or 'type')
      if (deliveryFilter !== 'all') {
          if (deliveryFilter === 'pickup') query = query.contains('parameters', { pickup: true });
          if (deliveryFilter === 'delivery') query = query.contains('parameters', { delivery: true });
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
        // Separate Range (min/max) from Exact matches
        const exactFilters = {};
        const rangeFilters = {};

        Object.entries(dynamicFilters).forEach(([k, v]) => {
            if (v === "" || v === false) return;
            
            if (k.endsWith('_min')) {
                const realKey = k.replace('_min', '');
                if (!rangeFilters[realKey]) rangeFilters[realKey] = {};
                rangeFilters[realKey].min = v;
            } else if (k.endsWith('_max')) {
                 const realKey = k.replace('_max', '');
                 if (!rangeFilters[realKey]) rangeFilters[realKey] = {};
                 rangeFilters[realKey].max = v;
            } else {
                exactFilters[k] = v;
            }
        });

        // Apply Exact Matches
        if (Object.keys(exactFilters).length > 0) {
          query = query.contains("parameters", exactFilters);
        }
        
        // Apply Range Matches (Manually for JSONB)
        // This relies on the value being stored as a Number in JSONB for proper comparison
        Object.entries(rangeFilters).forEach(([key, range]) => {
             if (range.min) {
                 // Try casting to int if possible, or just string compare if consistent padding (unlikely)
                 // PostgreSQL can't easily auto-cast JSONB inside operator without raw SQL.
                 // HOWEVER, Supabase JS 'filter' might not allow complex casting syntax cleanly.
                 // Let's assume consistent number storage.
                 // NOTE: If this fails, we might need a raw RPC or SQL function.
                 // For now, let's try raw filter notation if supported or fallback to 'gte'.
                 query = query.filter(`parameters->>${key}`, 'gte', range.min);
             }
             if (range.max) {
                 query = query.filter(`parameters->>${key}`, 'lte', range.max);
             }
        });
      }

      // Бартер
      if (barterFilter === "yes") {
        query = query.contains("parameters", { barter: true });
      }

      // Add signal
      query = query.abortSignal(controller.signal);

      const { data: rawListings, error } = await query;

      if (error) {
        console.error("Ошибка загрузки объявлений:", error);
        return;
      }

      let chunk = rawListings || [];

      // 2. Fetch related data manually (Images & Profiles)
      if (chunk.length > 0) {
        const listingIds = chunk.map((l) => l.id);
        const userIds = [...new Set(chunk.map((l) => l.created_by).filter(Boolean))];

        // Fetch Images
        const { data: imagesData } = await supabase
          .from("listing_images")
          .select("listing_id, file_path") // Use file_path based on schema inspection
          .in("listing_id", listingIds);

        // Fetch Profiles
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, tg_username, full_name, avatar_url") // Use correct columns
          .in("id", userIds);

        // Merge data
        chunk = chunk.map((listing) => {
          const listingImages = imagesData
            ? imagesData
                .filter((img) => img.listing_id === listing.id)
                .map((img) => ({ image_path: img.file_path })) // Map file_path -> image_path
            : [];

          const profile = profilesData
            ? profilesData.find((p) => p.id === listing.created_by)
            : null;

          // Map profile fields to expected format
          const mappedProfile = profile
            ? {
                is_verified: false, // Default to false as column missing
                username: profile.tg_username,
                first_name: profile.full_name ? profile.full_name.split(" ")[0] : "",
                last_name: profile.full_name ? profile.full_name.split(" ").slice(1).join(" ") : "",
                avatar_url: profile.avatar_url,
              }
            : null;

          return {
            ...listing,
            main_image_path: listing.main_image_path || listingImages[0]?.image_path || null,
            listing_images: listingImages,
            profiles: mappedProfile,
          };
        });
      }

      // Client-side distance filtering
      if (userLocation && radiusFilter && chunk.length > 0) {
        chunk = chunk.filter((listing) => {
          if (!listing.latitude || !listing.longitude) {
            return false;
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
        setListings((prev) => {
            // Filter out duplicates based on ID
            const existingIds = new Set(prev.map(p => p.id));
            const uniqueChunk = chunk.filter(item => !existingIds.has(item.id));
            if (uniqueChunk.length === 0) return prev;
            return [...prev, ...uniqueChunk];
        });
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

  const handleRefresh = async () => {
    // Reset pagination and reload
    setPage(0);
    setHasMore(true);
    await fetchPage(0);
  };

  // Pulsating Feed Logic: автообновление, если нет фильтров и мы на первой странице
  // Pulsating Feed Logic: автообновление, если нет фильтров и мы на первой странице
  useEffect(() => {
    // Stop if search is active (even if empty results)
    if (searchTerm && searchTerm.length > 0) return;

    if (
      hasSearchQuery ||
      categoryFilter !== "all" ||
      typeFilter !== "all" ||
      page > 0
    )
      return;

    const interval = setInterval(() => {
      // Only refresh if scroll is at top AND we don't have a search term
      if (window.scrollY < 200 && !searchTerm) {
        console.log("🔄 Pulsating Feed: Refreshing...");
        setIsLive(true);
        fetchPage(0, { append: false }).then(() => {
          setTimeout(() => setIsLive(false), 2000);
        });
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [hasSearchQuery, categoryFilter, typeFilter, page, searchTerm]);

  // первоначальная загрузка и обновление при изменении фильтров


  async function handleLoadMore() {
    if (loadingMore || !hasMore) return;
    await fetchPage(page + 1, { append: true });
  }

  function handleSearchSubmit(e, query = null) {
    if (e) e.preventDefault();
    
    const term = query || searchTerm;
    if (!term.trim()) return;

    // Use the query if provided
    if (query) setSearchTerm(query);

    // Close autocomplete & overlay
    setShowSearchHistory(false);
    setSuggestions([]);
    setIsSearchFocused(false);
    document.body.style.overflow = "";

    // Add to history
    const newHistory = addToSearchHistory(term);
    setSearchHistory(newHistory);
    
    // Blur input
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }

    // Explicit Navigation logic (Restored)
    const expandedQuery = expandSearchTerm(term);
    const detectedCat = detectCategory(expandedQuery); // Using expanded query for detection

    // Reset filters for new search
    setFilters({}); 
    setListings([]); 
    setPage(0); 
    setHasMore(true);

    if (detectedCat) {
      router.push(`/category/${detectedCat}?q=${encodeURIComponent(term)}`);
    } else {
      router.push(`/?q=${encodeURIComponent(term)}`);
    }
  }

  function handlePopularClick(term) {
    setSearchTerm(term);
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
    setBarterFilter("all");
    setWithPhotoFilter("all");
    setDateFilter("all");
    setSortFilter("date_desc");
    setPhotoCountFilter("any");
    setSellerStatusFilter("any");
    setDeliveryFilter("all");
    setDynamicFilters({});
    setRadiusFilter(null);
    setUserLocation(null);
  }

  // Рендер динамических фильтров
  const currentCategory = CATEGORY_DEFS.find(
    (c) => c.key === categoryFilter
  );
  const categoryFiltersDef = currentCategory?.filters || [];



  const FilterDropdown = ({ label, active, children, id, align = "left" }) => (
    <div className="relative inline-block text-left mr-2 mb-2">
      <button
        type="button"
        onClick={() =>
          setOpenDropdown(openDropdown === id ? null : id)
        }
        className={`inline-flex justify-between items-center w-full rounded-lg border px-3 py-2 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none ${
          active ? "border-black ring-1 ring-black" : "border-gray-300"
        }`}
      >
        {label}
        <svg
          className="-mr-1 ml-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {openDropdown === id && (
        <div
          className={`absolute mt-2 w-64 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50 p-3 ${
            align === "right"
              ? "right-0 origin-top-right"
              : "left-0 origin-top-left"
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );

  // Рендер компактных фильтров
  const renderCompactFilters = () => {
    return (
      <div className="flex flex-wrap items-center mb-4" ref={dropdownRef}>
        {/* Цена (Слайдер) */}
        <FilterDropdown
          id="price"
          label={`${
            txt.price
          }${
            minPrice || maxPrice
              ? ": " + (minPrice || "0") + " - " + (maxPrice || "∞")
              : ""
          }`}
          active={!!minPrice || !!maxPrice}
        >
          <PriceSlider
            min={minPrice}
            max={maxPrice}
            onChange={(min, max) => {
              setMinPrice(min);
              setMaxPrice(max);
            }}
          />
        </FilterDropdown>

        {/* Состояние */}
        <FilterDropdown
          id="condition"
          label={
            conditionFilter === "all"
              ? txt.condition
              : conditionFilter === "new"
              ? txt.conditionNew
              : conditionFilter === "used"
              ? txt.conditionUsed
              : txt.conditionLikeNew
          }
          active={conditionFilter !== "all"}
        >
          <div className="flex flex-col">
            {["all", "new", "used", "like_new"].map((cond) => (
              <button
                key={cond}
                className={`block w-full text-left px-2 py-1.5 text-xs rounded-md ${
                  conditionFilter === cond
                    ? "bg-gray-100 font-bold"
                    : "hover:bg-gray-50"
                }`}
                onClick={() => {
                  setConditionFilter(cond);
                  setOpenDropdown(null);
                }}
              >
                {cond === "all"
                  ? txt.conditionAny
                  : cond === "new"
                  ? txt.conditionNew
                  : cond === "used"
                  ? txt.conditionUsed
                  : txt.conditionLikeNew}
              </button>
            ))}
          </div>
        </FilterDropdown>

        {/* Тип */}
        <FilterDropdown
          id="type"
          label={
            typeFilter === "all"
              ? txt.type
              : typeFilter === "buy"
              ? txt.typeBuy
              : typeFilter === "sell"
              ? txt.typeSell
              : typeFilter === "services"
              ? txt.typeServices
              : txt.typeFree
          }
          active={typeFilter !== "all"}
        >
          <div className="flex flex-col">
            {["all", "buy", "sell", "services", "free"].map((tVal) => (
              <button
                key={tVal}
                className={`block w-full text-left px-2 py-1.5 text-xs rounded-md ${
                  typeFilter === tVal
                    ? "bg-gray-100 font-bold"
                    : "hover:bg-gray-50"
                }`}
                onClick={() => {
                  setTypeFilter(tVal);
                  setOpenDropdown(null);
                }}
              >
                {tVal === "all"
                  ? txt.typeAny
                  : tVal === "buy"
                  ? txt.typeBuy
                  : tVal === "sell"
                  ? txt.typeSell
                  : tVal === "services"
                  ? txt.typeServices
                  : txt.typeFree}
              </button>
            ))}
          </div>
        </FilterDropdown>

        {/* Subcategory Pills (Horizontal Scroll) */}
        {(() => {
             const subFilter = categoryFiltersDef.find(f => f.key === 'subtype');
             if (categoryFilter !== "all" && subFilter && subFilter.options) {
                 const currentSub = dynamicFilters.subtype || "";
                 return (
                     <div className="w-full overflow-x-auto no-scrollbar mb-4 -mx-4 px-4">
                         <div className="flex gap-2 min-w-min">
                             <button
                                 onClick={() => {
                                     const newDyn = { ...dynamicFilters };
                                     delete newDyn.subtype;
                                     setDynamicFilters(newDyn);
                                 }}
                                 className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                                     !currentSub
                                         ? "bg-black text-white border-black"
                                         : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                                 }`}
                             >
                                 {t("all") || "Все"}
                             </button>
                             {subFilter.options.map(opt => (
                                 <button
                                     key={opt.value}
                                     onClick={() => setDynamicFilters({ ...dynamicFilters, subtype: opt.value })}
                                     className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                                         currentSub === opt.value
                                             ? "bg-black text-white border-black"
                                             : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                                     }`}
                                 >
                                     {getSafeLabel(opt.label, opt.value)}
                                 </button>
                             ))}
                         </div>
                     </div>
                 );
             }
             return null;
        })()}

        {/* Динамические фильтры категории (Subtype first) */}
        {categoryFilter !== "all" &&
          [...categoryFiltersDef]
            .sort((a, b) => (a.key === 'subtype' ? -1 : b.key === 'subtype' ? 1 : 0))
            .map((filter) => {
             // Скрываем condition для определенных категорий (уже скрыт через filter, но на всякий случай)
             if (filter.key === "condition") return null;
            const val = dynamicFilters[filter.key];
            const label = getSafeLabel(filter.label, filter.key);

            return (
              <FilterDropdown
                key={filter.key}
                id={filter.key}
                label={`${label}${val ? ": " + String(val) : ""}`}
                active={!!val}
              >
                <div className="flex flex-col">
                  {filter.type === "select" && (
                    <>
                      <button
                        className={`block w-full text-left px-2 py-1.5 text-xs rounded-md ${
                          !val
                            ? "bg-gray-100 font-bold"
                            : "hover:bg-gray-50"
                        }`}
                        onClick={() => {
                          setDynamicFilters({
                            ...dynamicFilters,
                            [filter.key]: "",
                          });
                          setOpenDropdown(null);
                        }}
                      >
                        {txt.allCategories}
                      </button>
                      {filter.options.map((opt) => (
                        <button
                          key={opt.value}
                          className={`block w-full text-left px-2 py-1.5 text-xs rounded-md ${
                            val === opt.value
                              ? "bg-gray-100 font-bold"
                              : "hover:bg-gray-50"
                          }`}
                          onClick={() => {
                            setDynamicFilters({
                              ...dynamicFilters,
                              [filter.key]: opt.value,
                            });
                            setOpenDropdown(null);
                          }}
                        >
                          {getSafeLabel(opt.label, opt.value)}
                        </button>
                      ))}
                    </>
                  )}
                  {filter.type === "boolean" && (
                    <>
                      <button
                        className={`block w-full text-left px-2 py-1.5 text-xs rounded-md ${
                          val === ""
                            ? "bg-gray-100 font-bold"
                            : "hover:bg-gray-50"
                        }`}
                        onClick={() => {
                          setDynamicFilters({
                            ...dynamicFilters,
                            [filter.key]: "",
                          });
                          setOpenDropdown(null);
                        }}
                      >
                        -
                      </button>
                      <button
                        className={`block w-full text-left px-2 py-1.5 text-xs rounded-md ${
                          val === true
                            ? "bg-gray-100 font-bold"
                            : "hover:bg-gray-50"
                        }`}
                        onClick={() => {
                          setDynamicFilters({
                            ...dynamicFilters,
                            [filter.key]: true,
                          });
                          setOpenDropdown(null);
                        }}
                      >
                        {txt.yes}
                      </button>
                      <button
                        className={`block w-full text-left px-2 py-1.5 text-xs rounded-md ${
                          val === false
                            ? "bg-gray-100 font-bold"
                            : "hover:bg-gray-50"
                        }`}
                        onClick={() => {
                          setDynamicFilters({
                            ...dynamicFilters,
                            [filter.key]: false,
                          });
                          setOpenDropdown(null);
                        }}
                      >
                        {txt.no}
                      </button>
                    </>
                  )}
                  {(filter.type === "text" ||
                    filter.type === "number" ||
                    filter.type === "range") && (
                    <input
                      type={filter.type === "number" ? "number" : "text"}
                      className="border border-gray-300 rounded-md px-2 py-1.5 text-xs w-full"
                      value={val || ""}
                      onChange={(e) =>
                        setDynamicFilters({
                          ...dynamicFilters,
                          [filter.key]: e.target.value,
                        })
                      }
                      placeholder={label}
                    />
                  )}
                </div>
              </FilterDropdown>
            );
          })}

        {/* Фото */}


        {/* Дата размещения (Date Filter) */}
         <FilterDropdown
            id="date"
            label={dateFilter === "all" ? txt.dateAll : dateFilter === "today" ? txt.dateToday : dateFilter === "3d" ? txt.date3d : dateFilter === "7d" ? txt.date7d : txt.date30d}
            active={dateFilter !== "all"}
         >
            <div className="flex flex-col">
                {['all', 'today', '3d', '7d', '30d'].map((d) => (
                    <button
                        key={d}
                        className={`block w-full text-left px-2 py-1.5 text-xs rounded-md ${
                            dateFilter === d ? "bg-gray-100 font-bold" : "hover:bg-gray-50"
                        }`}
                        onClick={() => {
                            setDateFilter(d);
                            setOpenDropdown(null);
                        }}
                    >
                        {d === 'all' ? txt.dateAll : d === 'today' ? txt.dateToday : d === '3d' ? txt.date3d : d === '7d' ? txt.date7d : txt.date30d}
                    </button>
                ))}
            </div>
         </FilterDropdown>


        {/* Фото (Photo Count) */}
        <FilterDropdown
             id="photoCount"
             label={`Фото${photoCountFilter !== 'any' ? ': ' + photoCountFilter + '+' : ''}`}
             active={photoCountFilter !== 'any'}
        >
             <div className="flex flex-col">
                 <button className={`block w-full text-left px-2 py-1.5 text-xs rounded-md ${photoCountFilter === 'any' ? "bg-gray-100 font-bold" : "hover:bg-gray-50"}`} onClick={() => { setPhotoCountFilter('any'); setOpenDropdown(null); }}>Любое кол-во</button>
                 <button className={`block w-full text-left px-2 py-1.5 text-xs rounded-md ${photoCountFilter === '1' ? "bg-gray-100 font-bold" : "hover:bg-gray-50"}`} onClick={() => { setPhotoCountFilter('1'); setOpenDropdown(null); }}>1+ фото</button>
                 <button className={`block w-full text-left px-2 py-1.5 text-xs rounded-md ${photoCountFilter === '3' ? "bg-gray-100 font-bold" : "hover:bg-gray-50"}`} onClick={() => { setPhotoCountFilter('3'); setOpenDropdown(null); }}>3+ фото</button>
                 <button className={`block w-full text-left px-2 py-1.5 text-xs rounded-md ${photoCountFilter === '5' ? "bg-gray-100 font-bold" : "hover:bg-gray-50"}`} onClick={() => { setPhotoCountFilter('5'); setOpenDropdown(null); }}>5+ фото</button>
             </div>
        </FilterDropdown>

        {/* Статус продавца */}
         <FilterDropdown
             id="sellerStatus"
             label={sellerStatusFilter === 'any' ? "Продавец" : sellerStatusFilter === 'verified' ? "Проверенный" : "Рейтинг 4+"}
             active={sellerStatusFilter !== 'any'}
        >
             <div className="flex flex-col">
                 <button className={`block w-full text-left px-2 py-1.5 text-xs rounded-md ${sellerStatusFilter === 'any' ? "bg-gray-100 font-bold" : "hover:bg-gray-50"}`} onClick={() => { setSellerStatusFilter('any'); setOpenDropdown(null); }}>Любой</button>
                 <button className={`block w-full text-left px-2 py-1.5 text-xs rounded-md ${sellerStatusFilter === 'verified' ? "bg-gray-100 font-bold" : "hover:bg-gray-50"}`} onClick={() => { setSellerStatusFilter('verified'); setOpenDropdown(null); }}>Проверенный</button>
                 <button className={`block w-full text-left px-2 py-1.5 text-xs rounded-md ${sellerStatusFilter === 'rating_4' ? "bg-gray-100 font-bold" : "hover:bg-gray-50"}`} onClick={() => { setSellerStatusFilter('rating_4'); setOpenDropdown(null); }}>Рейтинг 4+</button>
             </div>
        </FilterDropdown>

        {/* Бартер */}
        <button
          onClick={() =>
            setBarterFilter(barterFilter === "yes" ? "all" : "yes")
          }
          className={`mr-2 mb-2 px-3 py-2 rounded-lg border text-xs font-medium ${
            barterFilter === "yes"
              ? "bg-black text-white border-black"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
        >
          {txt.barter}
        </button>

        {/* Радиус поиска */}
        <FilterDropdown
          id="radius"
          label={radiusFilter ? `📍 ${radiusFilter} км` : "📍 Радиус"}
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
                {gettingLocation
                  ? "Определяю..."
                  : "📍 Определить мое местоположение"}
              </button>
            )}
            {userLocation && (
              <>
                <button
                  className={`block w-full text-left px-2 py-1.5 text-xs rounded-md ${
                    !radiusFilter
                      ? "bg-gray-100 font-bold"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => {
                    setRadiusFilter(null);
                    setOpenDropdown(null);
                  }}
                >
                  Вся страна
                </button>
                {[1, 5, 10, 25, 50].map((km) => (
                  <button
                    key={km}
                    className={`block w-full text-left px-2 py-1.5 text-xs rounded-md ${
                      radiusFilter === km
                        ? "bg-gray-100 font-bold"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => {
                      setRadiusFilter(km);
                      setOpenDropdown(null);
                    }}
                  >
                    {km} км
                  </button>
                ))}
                <button
                  onClick={() => {
                    clearUserLocation();
                    setUserLocation(null);
                    setRadiusFilter(null);
                    setOpenDropdown(null);
                  }}
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

  const handleSaveSearch = async () => {
      if (!searchTerm?.trim()) {
          toast.error(t("toast_subscribe_query_needed") || "Введите поисковый запрос для подписки");
          return;
        }
      
      const tgUser = getTelegramUser();
      if (!tgUser) {
           toast.error("Только для пользователей Telegram");
           return;
      }

      const toastId = toast.loading("Сохраняем подписку...");

      try {
        const response = await fetch('/api/saved-searches', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: searchTerm,
                ...currentFilters, // Send ALL filters matching SavedSearchesPage expectations
                initData: window.Telegram?.WebApp?.initData || "",
                tgUserId: tgUser?.id
            })
        });

        const result = await response.json();

        if (!response.ok) throw new Error(result.error || "Failed to save");

        toast.success(`Вы подписались на "${searchTerm}"! 🔔`, {
            id: toastId,
            description: "Мы сообщим, когда появятся новые объявления."
        });

      } catch (e) {
        console.error(e);
        toast.error(e.message || "Ошибка при сохранении подписки", { id: toastId });
      }
  };




  return (
    <main className="min-h-screen pb-20 bg-gray-50 dark:bg-black text-foreground transition-colors duration-300">
      {/* Search Header */}
      <header 
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 40px)' }}
        className={`sticky top-0 bg-white dark:bg-neutral-900 border-b border-gray-100 dark:border-white/5 ${
        isSearchFocused ? "z-[110]" : "z-30"
      } ${
        (headerCompact && !isSearchFocused) ? "py-2 shadow-sm" : "py-3"
      }`}>
        <div className="flex items-center gap-3 px-4 max-w-[520px] mx-auto">
          {/* Hide BackButton when focused to save space - Animated */}
          {/* Hide BackButton when focused - Animated with width */}
          {/* Back Button - Toggle via CSS for DOM stability */}
          {(categoryFilter !== "all" || hasSearchQuery) && (
             <div className="shrink-0 mr-2">
               <BackButton />
             </div>
          )}


          
          {/* Search Input Container */}
          {/* Search Input Container - Always Flex 1 */}
          <div className="flex-1 relative z-20">
            <form onSubmit={handleSearchSubmit}>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 group-focus-within:text-black transition-colors" />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={txt.searchPlaceholder}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-white/10 border-transparent border rounded-2xl text-sm focus:ring-2 focus:ring-rose-500/20 focus:shadow-md transition-all shadow-sm placeholder-gray-500 text-gray-900 dark:text-gray-100" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => {
                      setShowSearchHistory(true);
                      setIsSearchFocused(true);
                  }}
                  onKeyDown={handleSearchKeyDown}
                />
                
                {/* Voice Search Button */}
                <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-black transition-colors"
                    onClick={() => {
                      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                      if (!SpeechRecognition) {
                        alert("Ваш браузер не поддерживает голосовой поиск");
                        return;
                      }

                      const recognition = new SpeechRecognition();
                      const langMap = { 'ru': 'ru-RU', 'ua': 'uk-UA', 'en': 'en-US' };
                      recognition.lang = langMap[lang] || 'ru-RU';
                      
                      recognition.onresult = (event) => {
                          const transcript = event.results[0][0].transcript;
                          setSearchTerm(transcript);
                      };
                      
                      recognition.start();
                    }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                        <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
                    </svg>
                </button>
              </div>
            </form>
          </div>

          {/* Favorites Icon (Heart) - Animate out */}

          {/* Favorites Icon - Toggle via CSS */}
          {/* Favorites Icon - Toggle via CSS */}
          {!isSearchFocused && (
            <button 
              onClick={() => router.push('/my?tab=favorites')} 
              className="p-2.5 rounded-full bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 active:scale-95 transition-all relative group"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
               <HeartIcon className="w-6 h-6 text-gray-700 dark:text-gray-200 group-hover:text-rose-500 transition-colors" strokeWidth={1.5} />
            </button>
          )}

          {/* Cancel Button - Hidden for testing */}
          {/* Cancel Button - Toggle via CSS */}
             <button
                type="button"
                onClick={() => {
                    setIsSearchFocused(false);
                    setShowSearchHistory(false);
                    setSearchTerm(urlQuery); // Reset to URL query
                }}
                className={`text-sm font-medium text-black dark:text-white whitespace-nowrap px-2 ml-2 ${isSearchFocused ? 'block' : 'hidden'}`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
             >
                {txt.cancel || "Отмена"}
             </button>
        </div>
          


        {/* Stories / Categories Scroll (Only when not searching/focused) */}
        {/* Stories / Categories Scroll (Only when not searching/focused) */}
      </header>

      {/* Stories / Categories Scroll (Naturally scrolling with content) */}
      {/* Stories / Categories Scroll (Naturally scrolling with content) */}
      {!isSearchFocused && !hasSearchQuery && (
        <Stories 
            categoryFilter={categoryFilter} 
            setCategoryFilter={setCategoryFilter} 
            lang={lang} 
            txt={txt} 
        />
      )}

            {/* Smart Search Suggestions - Static Overlay */}
            {isSearchFocused && (searchTerm.length >= 2 && searchSuggestions.length > 0) && (
              <div 
                className="fixed inset-0 pt-[80px] bg-white dark:bg-neutral-900 z-[100] overflow-y-auto pb-20"
                style={{ top: '0', height: '100dvh' }}
              >
                <div className="max-w-[520px] mx-auto">
                    <div className="px-3 py-2 border-b border-gray-50 dark:border-white/10">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Предложения
                    </span>
                    </div>
                    {searchSuggestions.map((item, idx) => (
                    <div
                        key={idx}
                        className="flex justify-between items-center px-3 py-3 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer rounded-xl transition-colors border-b border-gray-50 dark:border-white/5 last:border-0"
                        onClick={() => {
                            handleSuggestionClick(item);
                            setIsSearchFocused(false);
                            document.body.style.overflow = "";
                        }}
                      >
                        <div className="flex items-center gap-3">
                          {/* Item Icon */}
                          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-400 dark:text-gray-400">
                             {item.isListing ? (
                                item.image ? <img src={item.image} className="w-full h-full object-cover rounded-lg" /> : <span className="text-xs">IMG</span>
                             ) : (
                                <MagnifyingGlassIcon className="w-4 h-4" />
                             )}
                          </div>
                          <div className="flex flex-col">
                             <div className="text-sm font-medium text-gray-900 dark:text-gray-200">
                                {item.title}
                             </div>
                             {item.price && (
                                 <div className="text-xs text-black font-bold dark:text-white">
                                     {item.price} {item.currency || '€'}
                                 </div>
                             )}
                          </div>
                        </div>
                        <div className="text-gray-300 dark:text-gray-600">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                             <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                          </svg>
                        </div>
                    </div>
                    ))}
                </div>
              </div>
            )}

            {/* Search History Dropdown - Static Overlay */}
            {isSearchFocused && (searchTerm.length < 2 || searchSuggestions.length === 0) && (
              <div
                className="fixed inset-0 pt-[80px] bg-white dark:bg-black z-[100] overflow-y-auto pb-20"
                style={{ top: '0', height: '100dvh' }}
                onClick={(e) => {
                   // If clicking the empty background (not content), close search
                   if (e.target === e.currentTarget) setIsSearchFocused(false);
                }}
              >
                 <div className="max-w-[520px] mx-auto min-h-full" onClick={(e) => e.stopPropagation()}>
                    {searchHistory.length > 0 && (
                        <>
                            <div className="flex justify-between items-center px-3 py-2 border-b border-gray-50 dark:border-white/10">
                            <span className="text-xs font-semibold text-gray-500">
                                {txt.recentlyViewed}
                            </span>
                            <button
                                onClick={(e) => {
                                e.preventDefault();
                                clearSearchHistory();
                                setSearchHistory([]);
                                }}
                                className="text-xs text-red-500 hover:underline"
                            >
                                {txt.clear}
                            </button>
                            </div>
                            {searchHistory.map((item, idx) => (
                            <div
                                key={idx}
                                className="flex justify-between items-center px-3 py-3 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer rounded-xl transition-colors border-b border-gray-50 dark:border-white/5 last:border-0"
                                onClick={() => {
                                    handleSearchSubmit(null, item);
                                }}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <span className="opacity-40 text-lg">🕒</span>
                                    <span className="text-sm text-gray-700 dark:text-gray-200 truncate font-medium">
                                        {item}
                                    </span>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const h = removeFromSearchHistory(item);
                                        setSearchHistory(h);
                                    }}
                                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                            ))}
                        </>

                    )}

                {/* 3. Popular Queries (If no search term) */}
                {(!searchTerm || searchTerm.length < 2) && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                         <div className="flex items-center justify-between mb-3 px-1">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{txt.popularQueriesLabel}</h3>
                         </div>
                         <div className="flex flex-wrap gap-2">
                            {popularQueries.map((q) => (
                                <button
                                    key={q}
                                    onClick={() => handlePopularClick(q)}
                                    className="px-3.5 py-2 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:border-rose-300 hover:text-rose-600 dark:hover:border-rose-500 dark:hover:text-rose-400 transition-all active:scale-95 bg-transparent"
                                >
                                   🔥 {q}
                                </button>
                            ))}
                         </div>
                    </div>
                )}

                {/* 4. Nothing Found State */}
                {searchTerm && searchTerm.length >= 2 && searchSuggestions.length === 0 && (
                    <div className="flex flex-col items-center justify-center pt-10 text-gray-400 opacity-60">
                        <MagnifyingGlassIcon className="w-12 h-12 mb-2" />
                        <p className="text-sm font-medium">{t("feed_nothing_found") || "Ничего не найдено"}</p>
                    </div>
                )}
                 </div>
              </div>
            )}

      <div className="max-w-[520px] mx-auto">
        {/* Persistent Filter Bar - Visible only in categories or search or on All Listings page */ }
        {/* Persistent Filter Bar - Visible only in categories or search or on All Listings page */ }
        {!isSearchFocused && (categoryFilter !== "all" || hasSearchQuery || forcedCategory === "all" || showFiltersModal) && (
            <div className="px-3 mt-3">
                 <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">

                     {/* All Filters Button */}
                     <button
                        onClick={() => setShowFiltersModal(true)}
                        className={`flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/10 rounded-xl text-sm font-semibold whitespace-nowrap border border-transparent ${
                            (minPrice || maxPrice || Object.keys(dynamicFilters).length > 0) ? 'border-black dark:border-white bg-white' : ''
                        }`}
                     >
                         <AdjustmentsHorizontalIcon className="w-5 h-5" />
                         <span>{t("filters") || "Фильтры"}</span>
                         {(minPrice || maxPrice || Object.keys(dynamicFilters).length > 0) && (
                             <span className="w-2 h-2 rounded-full bg-rose-500 ml-1"></span>
                         )}
                     </button>
                     
                 </div>
                 
                 {/* Active Filters Summary (Chips) */}
                 {(minPrice || maxPrice || Object.keys(dynamicFilters).length > 0) && (
                     <div className="flex flex-wrap gap-2 mt-3">
                         {minPrice && <span className="text-[10px] px-2 py-1 bg-black text-white rounded-lg">От {minPrice}</span>}
                        {Object.entries(dynamicFilters).map(([k,v]) => {
                            if(!v) return null;
                            const isMin = k.endsWith('_min');
                            const isMax = k.endsWith('_max');
                            const key = k.replace('_min','').replace('_max','');
                            
                            // Helper to safely get label string
                            const getSafeLabel = (obj, fallback) => {
                                if (!obj) return fallback;
                                if (typeof obj === 'string') return obj;
                                if (typeof obj === 'object') {
                                    return obj[lang] || obj.ru || obj.en || fallback;
                                }
                                return fallback;
                            };

                            // Find filter definition
                            const def = categoryFiltersDef.find(f => f.key === key);
                            
                            // Correctly resolve filter label
                            const label = def ? getSafeLabel(def.label, key) : key;
                            
                            // Resolve value label if it's a select option
                            let displayValue = v;
                            if (def && def.options) {
                                const option = def.options.find(o => o.value == v); 
                                if (option) {
                                    displayValue = getSafeLabel(option.label, v);
                                }
                            }

                            return (
                                <span key={k} className="text-[10px] px-2 py-1 bg-gray-200 dark:bg-white/20 rounded-lg">
                                    {label}: {isMin ? `${t("from_label") || "от"} ` : isMax ? `${t("to_label") || "до"} ` : ''}{displayValue}
                                </span>
                            )
                        })}
                         <button onClick={handleResetFilters} className="text-[10px] underline text-gray-500">Сбросить</button>
                     </div>
                 )}
            </div>
        )}

      {/* RENDER MODAL (INLINED) */}
      {showFiltersModal && (
        <div className="fixed inset-0 z-40 bg-white dark:bg-black flex flex-col animate-in slide-in-from-bottom-10 duration-200 h-[100vh]">
           {/* Modal Header */}
           <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/10">
               <h2 className="text-lg font-bold">{t("filters") || "Filters"}</h2>
               <button onClick={() => setShowFiltersModal(false)} className="p-2 bg-gray-100 dark:bg-white/10 rounded-full">
                   <XMarkIcon className="w-5 h-5 text-gray-500" />
               </button>
           </div>

           {/* Modal Content - Scrollable */}
           <div className="flex-1 overflow-y-auto px-4 pt-4 pb-32">
                {/* Global Filters Section */}
                <div className="space-y-6">

                    {/* Type Filter (Buy/Sell) - MOVED TO TOP */}
                    {!['jobs', 'business', 'help_offer'].includes(categoryFilter) && (
                     <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-900 dark:text-gray-100">{txt.type || "Type"}</label>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { key: 'exchange', label: txt.typeExchange || "Exchange" },
                                { key: 'all', label: txt.typeAny || "All" },
                                { key: 'sell', label: txt.typeSell || "Sell" },
                                { key: 'buy', label: txt.typeBuy || "Buy" },
                                { key: 'free', label: txt.typeFree || "Free" },
                            ].map(opt => (
                                <button 
                                    key={opt.key}
                                    onClick={() => setTypeFilter(opt.key)}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium border ${
                                        typeFilter === opt.key
                                        ? "bg-black text-white border-black" 
                                        : "bg-white border-gray-200 text-gray-700"
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        <hr className="border-gray-100 dark:border-white/10 mt-4" />
                     </div>
                     )}

                    {/* Category Selector (NEW) */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-900 dark:text-gray-100">{txt.category || "Category"}</label>
                        <select
                            value={categoryFilter}
                            onChange={(e) => {
                                const newCat = e.target.value;
                                setCategoryFilter(newCat);
                                // Clear dynamic filters when switching categories (except global ones?)
                                // Actually, dynamic filters are category specific, so we should clear them.
                                setDynamicFilters({});
                            }}
                            className="w-full border border-gray-200 dark:border-white/20 rounded-xl px-4 py-3 text-sm bg-gray-50 dark:bg-neutral-900 appearance-none outline-none"
                        >
                            <option value="all">{t("allCategories") || "All categories"}</option>
                            {CATEGORY_DEFS.map(cat => (
                                <option key={cat.key} value={cat.key}>
                                    {getSafeLabel(cat, cat.ru)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Subcategory Selector (NEW) */}
                    {categoryFilter !== 'all' && (() => {
                        const currentCatDef = CATEGORY_DEFS.find(c => c.key === categoryFilter);
                        const subFilter = currentCatDef?.filters?.find(f => f.key === 'subtype' || f.key === 'industry' || f.key === 'product_type' || f.key === 'body_type' || f.key === 'service_type');
                        
                        if (subFilter && subFilter.options) {
                            // Determine the key for state (subtype, industry, product_type)
                            const subKey = subFilter.key;
                            const subVal = dynamicFilters[subKey] || "";

                            return (
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                        {t("subcategory") || "Subcategory"}
                                    </label>
                                    <select
                                        value={subVal}
                                        onChange={(e) => {
                                            setDynamicFilters({
                                                ...dynamicFilters,
                                                [subKey]: e.target.value
                                            });
                                        }}
                                        className="w-full border border-gray-200 dark:border-white/20 rounded-xl px-4 py-3 text-sm bg-gray-50 dark:bg-neutral-900 appearance-none outline-none"
                                    >
                                        <option value="">{t("allSubcategories") || "All subcategories"}</option>
                                        {subFilter.options.map(opt => (
                                            <option key={opt.value} value={opt.value}>
                                                {getSafeLabel(opt.label, opt.value)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            );
                        }
                        return null;
                    })()}

                    <hr className="border-gray-100 dark:border-white/10" />
                    
                    {/* Location */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-900 dark:text-gray-100">{txt.locationPlaceholder}</label>
                        <input
                            type="text"
                            placeholder={t("locationPlaceholder") || "City, district..."}
                            className="w-full border border-gray-200 dark:border-white/20 rounded-xl px-4 py-3 text-sm bg-gray-50 dark:bg-neutral-900"
                            value={locationFilter}
                            onChange={(e) => setLocationFilter(e.target.value)}
                        />
                         {/* Radius */}
                         <div className="flex gap-2 overflow-x-auto no-scrollbar pt-2">
                            {[null, 5, 10, 30, 50, 100].map(r => (
                                <button
                                    key={r}
                                    onClick={() => setRadiusFilter(r)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap ${
                                        radiusFilter === r 
                                        ? "bg-black text-white border-black" 
                                        : "border-gray-200 dark:border-white/20 text-gray-600 dark:text-gray-400"
                                    }`}
                                >

                                    {r === null ? (t("whole_country") || "Whole country") : `+${r} km`}
                                </button>
                            ))}
                         </div>
                    </div>

                    <hr className="border-gray-100 dark:border-white/10" />

                     {/* Sort Order */}
                     <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-900 dark:text-gray-100">{txt.sort || "Sort"}</label>
                        <select 
                            value={sortFilter}
                            onChange={(e) => setSortFilter(e.target.value)}
                            className="w-full border border-gray-200 dark:border-white/20 rounded-xl px-4 py-3 text-sm bg-gray-50 dark:bg-neutral-900 appearance-none outline-none"
                        >
                            <option value="date_desc">{txt.sortDateDesc}</option>
                            <option value="price_asc">{txt.sortPriceAsc}</option>
                            <option value="price_desc">{txt.sortPriceDesc}</option>
                            {userLocation && <option value="distance">{txt.sortDistance}</option>}
                        </select>
                     </div>

                     <hr className="border-gray-100 dark:border-white/10" />

                     {/* Price Range (Slider) */}
                     <div className="space-y-2">
                         <label className="text-sm font-bold text-gray-900 dark:text-gray-100">{txt.price}</label>
                         <PriceSlider 
                            min={minPrice} 
                            max={maxPrice} 
                            onChange={(min, max) => {
                                setMinPrice(min);
                                setMaxPrice(max);
                            }}
                            minLimit={0}
                            maxLimit={5000}
                         />
                     </div>

                     <hr className="border-gray-100 dark:border-white/10" />

                     {/* Dynamic Categories Filters */}
                     {categoryFilter !== 'all' && (
                         <div className="space-y-6">
                            {categoryFiltersDef.map(filter => {
                                // SKIP primary filters that are already rendered above as a main selector
                                if (['subtype', 'industry', 'product_type', 'body_type', 'service_type', 'condition'].includes(filter.key)) {
                                    return null;
                                }

                                const val = dynamicFilters[filter.key];

                                // RANGE INPUTS (From/To)
                                if (filter.type === 'range') {
                                    const minKey = `${filter.key}_min`;
                                    const maxKey = `${filter.key}_max`;
                                    const minVal = dynamicFilters[minKey] || '';
                                    const maxVal = dynamicFilters[maxKey] || '';

                                    return (
                                        <div key={filter.key} className="space-y-2">
                                            <label className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {getSafeLabel(filter.label, filter.key)}
                                            </label>
                                            <div className="flex gap-3">
                                                 <div className="flex-1 relative">
                                                     <span className="absolute left-3 top-3 text-gray-400 text-[10px] uppercase">{t("from_label") || "from"}</span>
                                                     <input 
                                                        type="number" 
                                                        className="w-full pl-3 pr-3 pt-5 pb-2 border border-gray-200 dark:border-white/20 rounded-xl text-sm font-medium bg-gray-50 dark:bg-neutral-900"
                                                        value={minVal}
                                                        onChange={(e) => setDynamicFilters({...dynamicFilters, [minKey]: e.target.value})}
                                                     />
                                                 </div>
                                                 <div className="flex-1 relative">
                                                     <span className="absolute left-3 top-3 text-gray-400 text-[10px] uppercase">{t("to_label") || "to"}</span>
                                                     <input 
                                                        type="number" 
                                                        className="w-full pl-3 pr-3 pt-5 pb-2 border border-gray-200 dark:border-white/20 rounded-xl text-sm font-medium bg-gray-50 dark:bg-neutral-900"
                                                        value={maxVal}
                                                        onChange={(e) => setDynamicFilters({...dynamicFilters, [maxKey]: e.target.value})}
                                                     />
                                                 </div>
                                            </div>
                                        </div>
                                    );
                                }

                                // SELECT INPUTS
                                if (filter.type === 'select') {
                                    return (
                                        <div key={filter.key} className="space-y-2">
                                            <label className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {getSafeLabel(filter.label, filter.key)}
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => {
                                                        const d = {...dynamicFilters};
                                                        delete d[filter.key];
                                                        setDynamicFilters(d);
                                                    }}
                                                    className={`px-3 py-2 rounded-xl text-xs font-medium border ${
                                                        !val ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-600'
                                                    }`}
                                                >
                                                    {t("all") || "All"}
                                                </button>
                                                {filter.options.map(opt => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => setDynamicFilters({...dynamicFilters, [filter.key]: opt.value})}
                                                        className={`px-3 py-2 rounded-xl text-xs font-medium border ${
                                                            val === opt.value ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-600'
                                                        }`}
                                                    >
                                                        {getSafeLabel(opt.label, opt.value)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                }
                                
                                // BOOLEAN & TEXT support ...
                                return null; 
                            })}
                             <hr className="border-gray-100 dark:border-white/10" />
                         </div>
                     )}

                     {/* Type Filter MOVED UP */}

                    {/* Common Filters */}
                    {/* Common Filters - Condition */}
                    {!['jobs', 'business', 'help_offer'].includes(categoryFilter) && (
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-900 dark:text-gray-100">{txt.condition}</label>
                        <div className="flex flex-wrap gap-2">
                            {['all', 'new', 'used'].map(c => (
                                <button 
                                    key={c}
                                    onClick={() => setConditionFilter(c)}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium border ${
                                        conditionFilter === c 
                                        ? "bg-black text-white border-black" 
                                        : "bg-white border-gray-200 text-gray-700"
                                    }`}
                                >
                                    {c === 'all' ? txt.conditionAny : c === 'new' ? txt.conditionNew : txt.conditionUsed}
                                </button>
                            ))}
                        </div>
                    </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-900 dark:text-gray-100">{t("has_photo") || "Has photo"}</label>
                        <div className="flex items-center justify-between p-3 border border-gray-200 rounded-xl">
                            <span className="text-sm">{t("only_with_photo") || "Only with photo"}</span>
                            <input 
                                type="checkbox" 
                                className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                                checked={withPhotoFilter === 'yes'}
                                onChange={(e) => setWithPhotoFilter(e.target.checked ? 'yes' : 'all')}
                            />
                        </div>
                    </div>
                     
                    {/* Delivery Toggle (New) */}
                    {!['jobs', 'translations', 'education', 'free', 'help_offer'].includes(categoryFilter) && (
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-900 dark:text-gray-100">{t("delivery_label") || "Delivery"}</label>
                        <div className="flex items-center justify-between p-3 border border-gray-200 rounded-xl">
                            <span className="text-sm">{t("delivery_possible") || "Delivery available"}</span>
                            <input 
                                type="checkbox" 
                                className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                                checked={deliveryFilter === 'delivery'}
                                onChange={(e) => setDeliveryFilter(e.target.checked ? 'delivery' : 'all')}
                            />
                        </div>
                    </div>
                    )}


                </div>
           </div>

           {/* Modal Footer (Static) */}
           <div 
                className="shrink-0 p-4 bg-white dark:bg-neutral-900 border-t border-gray-100 dark:border-white/10 flex gap-3 z-20 relative"
                style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
           >
               <button 
                  onClick={handleResetFilters}
                  className="flex-1 py-3.5 bg-gray-100 dark:bg-white/10 text-black dark:text-white rounded-xl font-bold text-sm"
               >
                  {t("reset") || "Reset"}
               </button>
               <button 
                  onClick={() => {
                      const currentCat = forcedCategory || 'all';
                      // If category changed, navigate to new category page
                      if (categoryFilter !== currentCat) {
                          const params = new URLSearchParams();
                          if (minPrice) params.set('min_price', minPrice);
                          if (maxPrice) params.set('max_price', maxPrice);
                          if (typeFilter !== 'all') params.set('type', typeFilter);
                          if (conditionFilter !== 'all') params.set('condition', conditionFilter);
                          if (withPhotoFilter === 'yes') params.set('has_photo', 'true');
                          if (deliveryFilter === 'delivery') params.set('delivery', 'true');
                          if (sortFilter !== 'date_desc') params.set('sort', sortFilter);

                          // Dynamic params
                          Object.entries(dynamicFilters).forEach(([k, v]) => {
                             if (v) params.set(`dyn_${k}`, v);
                          });

                          // Search term?
                          if (searchTerm) params.set('q', searchTerm);
                          
                          // Handle 'all' category -> /category/all
                          const targetPath = `/category/${categoryFilter}`;
                          router.push(`${targetPath}?${params.toString()}`);
                          return;
                      }

                      handleRefresh();
                      setShowFiltersModal(false);
                  }}
                  className="flex-[2] py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm shadow-lg"
               >
                  {t("show_listings") || "Show results"}
               </button>
           </div>
        </div>
      )}

        {/* Active Category Indicator */}
        {categoryFilter !== "all" && (
          <div className="px-4 mt-4">
            <div 
              className={`flex items-center justify-between border rounded-2xl p-4 ${
                CATEGORY_DEFS.find((c) => c.key === categoryFilter)?.bg || "bg-gray-50"
              } ${
                CATEGORY_DEFS.find((c) => c.key === categoryFilter)?.bg?.replace("bg-", "border-").replace("50", "100") || "border-gray-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-2xl shadow-sm">
                  {CATEGORY_DEFS.find((c) => c.key === categoryFilter)
                    ?.icon || "📁"}
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">
                    {txt.category}
                  </p>
                  <p className={`font-bold ${
                    CATEGORY_DEFS.find((c) => c.key === categoryFilter)?.color || "text-gray-900"
                  }`}>
                    {CATEGORY_DEFS.find((c) => c.key === categoryFilter)?.[
                      lang
                    ] ||
                      CATEGORY_DEFS.find((c) => c.key === categoryFilter)?.ru}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (forcedCategory) {
                    router.push("/catalog");
                  } else {
                    setCategoryFilter("all");
                  }
                }}
                className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-400 hover:text-red-500 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Popular Listings (Horizontal) */}
        {categoryFilter === "all" && !searchTerm.trim() && !forcedCategory && (
          <div className="mt-6">
            <PopularListingsScroll />
          </div>
        )}

        {/* Recently Viewed (Horizontal) */}
        {categoryFilter === "all" && !searchTerm.trim() && !forcedCategory && (
          <RecentlyViewedScroll />
        )}

        {/* Main Feed Header */}
        <div className="px-4 mt-8 mb-4 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">
            {hasSearchQuery
              ? t("search_results") || "Результаты"
              : categoryFilter !== "all"
              ? (CATEGORY_DEFS.find(c => c.key === categoryFilter)?.[lang] || CATEGORY_DEFS.find(c => c.key === categoryFilter)?.ru || t("category") || "Категория")
              : typeFilter !== "all"
              ? (t("listings_header") || "Объявления")
              : (t("listings_header") || "Объявления")}
          </h2>

          {/* View Mode Toggle & Counter */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-400">
              {!loading &&
                `${
                  viewMode === "map" ? mapListings.length : listings.length
                }`}
            </span>
            <div className="bg-gray-100 p-1 rounded-xl flex text-xs font-medium">
              <button
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === "list"
                    ? "bg-white shadow-sm text-black"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setViewMode("list")}
              >
                Список
              </button>
              <button
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === "map"
                    ? "bg-white shadow-sm text-black"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setViewMode("map")}
              >
                Карта
              </button>
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        <div className="px-3 min-h-[50vh]">
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(6)].map((_, i) => (
                <ListingCardSkeleton key={i} />
              ))}
            </div>
          ) : listings.length === 0 && viewMode === "list" ? (
            <div className="text-center py-20 text-gray-500 flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-2xl">
                🔍
              </div>
              <p className="text-lg font-medium text-gray-900">
                {categoryFilter !== "all" || typeFilter !== "all" 
                  ? "В этом разделе пока нет объявлений"
                  : "Ничего не найдено"}
              </p>
              <p className="text-sm mt-1 text-gray-500">
                {categoryFilter !== "all" || typeFilter !== "all"
                  ? "Попробуйте выбрать другую категорию"
                  : (t("search_helper_empty") || "Попробуйте изменить параметры поиска")}
              </p>
              
              {/* Subscribe Recommendation */}
              {(hasSearchQuery || (searchTerm && searchTerm.length >= 2)) && (
                  <button 
                      onClick={handleSaveSearch}
                      className="mt-6 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
                  >
                      <BellIcon className="w-5 h-5" />
                      Подписаться на "{searchTerm || categoryFilter}"
                  </button>
              )}
            </div>
          ) : viewMode === "map" ? (
            <div className="h-[75vh] w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 relative z-0">
                 <MapComponent
                    listings={mapListings}
                    userLocation={userLocation}
                  />
            </div>
          ) : (
            <>
              {/* Список объявлений */}
      <div className="grid grid-cols-2 gap-2">
        {listings.map((listing) => (
          <div key={listing.id} id={`listing-${listing.id}`} data-id={listing.id}>
             <ListingCard listing={listing} />
          </div>
        ))}
      </div>

      {/* Лоадер при подгрузке */}
            </>
          )}

          {hasMore && listings.length > 0 && viewMode === "list" && (
            <div 
              ref={(node) => {
                if (!node || loadingMore) return;
                const observer = new IntersectionObserver(
                  (entries) => {
                    if (entries[0].isIntersecting) {
                      handleLoadMore();
                    }
                  },
                  { threshold: 0.1, rootMargin: "100px" }
                );
                observer.observe(node);
                return () => observer.disconnect();
              }}
              className="mt-8 mb-6 flex justify-center py-4"
            >
              {loadingMore ? (
                <div className="w-6 h-6 border-2 border-gray-200 border-t-black dark:border-white/10 dark:border-t-gray-500 rounded-full animate-spin" />
              ) : (
                <div className="h-4" /> // Invisible trigger area
              )}
            </div>
          )}
        </div>
      </div>

    </main>
  );
}
