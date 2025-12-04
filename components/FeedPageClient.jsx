"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ListingCard from "./ListingCard";
import { ListingCardSkeleton } from "./SkeletonLoader";
import { CATEGORY_DEFS } from "@/lib/categories";
import { useLang } from "@/lib/i18n-client";
import { expandSearchTerm, detectCategory, SYNONYMS } from "@/lib/searchUtils";
import { getTelegramUser } from "@/lib/telegram";
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
import PopularListingsScroll from "./PopularListingsScroll";
import RecentlyViewedScroll from "./RecentlyViewedScroll";
import LangSwitcher from "./LangSwitcher";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

const MapComponent = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="h-[60vh] w-full bg-gray-100 animate-pulse rounded-xl mt-4" />
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
  const [isLive, setIsLive] = useState(false);
  const lastRefreshRef = useRef(Date.now());

  // фильтры
  const [searchTerm, setSearchTerm] = useState(urlQuery);
  const [locationFilter, setLocationFilter] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(forcedCategory || "all");

  // Общие фильтры
  const [typeFilter, setTypeFilter] = useState("all"); // all | buy | sell | services | free
  const [conditionFilter, setConditionFilter] = useState("all"); // all | new | used | like_new
  const [barterFilter, setBarterFilter] = useState("all"); // all | yes | no

  // Location-based filtering
  const [userLocation, setUserLocation] = useState(null); // { lat, lng }
  const [radiusFilter, setRadiusFilter] = useState(null); // null | 1 | 5 | 10 | 25 | 50 (km)
  const [viewMode, setViewMode] = useState("list"); // 'list' | 'map'
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
  const [searchSuggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    setSearchHistory(getSearchHistory());
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
          
          // Cyrillic to Latin transliteration map
          const cyrToLat = {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
            'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
            'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts',
            'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
          };
          
          // Latin to Cyrillic transliteration map (common tech words)
          const latToCyr = {
            'iphone': 'айфон', 'ipad': 'айпад', 'macbook': 'макбук', 'apple': 'эппл',
            'samsung': 'самсунг', 'xiaomi': 'сяоми', 'huawei': 'хуавей', 'lenovo': 'леново',
            'asus': 'асус', 'acer': 'эйсер', 'dell': 'делл', 'hp': 'хп', 'sony': 'сони'
          };
          
          const lowerText = text.toLowerCase();
          
          // Add transliteration from Cyrillic to Latin
          let latinVariant = '';
          for (let char of lowerText) {
            latinVariant += cyrToLat[char] || char;
          }
          if (latinVariant !== lowerText) {
            variants.push(latinVariant);
          }
          
          // Add transliteration from Latin to Cyrillic (for common words)
          for (const [lat, cyr] of Object.entries(latToCyr)) {
            if (lowerText.includes(lat)) {
              variants.push(lowerText.replace(lat, cyr));
            }
            if (lowerText.includes(cyr)) {
              variants.push(lowerText.replace(cyr, lat));
            }
          }
          
          return [...new Set(variants)]; // Remove duplicates
        };
        
        const searchVariants = generateSearchVariants(term);
        
        // Build OR query - each variant searches in both title AND description
        const orConditions = searchVariants.map(variant => 
          `and(or(title.ilike.%${variant}%,description.ilike.%${variant}%))`
        ).join(',');
        
        const { data, error } = await supabase
          .from("listings")
          .select("id, title, category_key, price")
          .or(orConditions)
          .eq("status", "active")
          .limit(10);

        if (!error && data) {
          // Group by title and get category
          const unique = [];
          const seen = new Set();
          data.forEach((item) => {
            const titleLower = item.title.toLowerCase();
            if (!seen.has(titleLower)) {
              seen.add(titleLower);
              const category = CATEGORY_DEFS.find((c) => c.key === item.category_key);
              unique.push({
                id: item.id,
                title: item.title,
                price: item.price,
                category: category ? category[lang] || category.ru : null,
                categoryKey: item.category_key,
                isListing: true, // Flag to identify it's a listing
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
      const newHistory = addToSearchHistory(searchTerm);
      setSearchHistory(newHistory);
      setShowSearchHistory(false);
      setSuggestions([]);
      e.target.blur();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    // If it's a listing, navigate to it
    if (suggestion.isListing && suggestion.id) {
      router.push(`/listing/${suggestion.id}`);
      setShowSearchHistory(false);
      setSuggestions([]);
      return;
    }
    
    // Otherwise, use it as search term
    setSearchTerm(suggestion.title);
    const newHistory = addToSearchHistory(suggestion.title);
    setSearchHistory(newHistory);
    setShowSearchHistory(false);
    setSuggestions([]);
    if (suggestion.categoryKey) {
      setCategoryFilter(suggestion.categoryKey);
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

    const cat = searchParams.get("category") || forcedCategory || "all";
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
    setRadiusFilter(
      searchParams.get("radius") ? Number(searchParams.get("radius")) : null
    );

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
        // .eq("status", "active")
        .order("created_at", { ascending: false });

      // Apply same filters as main list
      const term = (searchTerm || "").trim();
      if (term) {
        const allTerms = expandSearchTerm(term);
        if (allTerms.length > 0) {
          const orConditions = allTerms
            .map(
              (t) =>
                `title.ilike.%${t}%,description.ilike.%${t}%,location_text.ilike.%${t}%`
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
      // 1. Fetch listings (raw, without joins to avoid FK errors)
      let query = supabase
        .from("listings")
        .select("*")
        .order("is_vip", { ascending: false })
        .order("created_at", { ascending: false })
        // .eq("status", "active") // Removed strict filter
        .range(from, to);

      const term = (searchTerm || "").trim();
      if (term) {
        const allTerms = expandSearchTerm(term);

        if (allTerms.length > 0) {
          const orConditions = allTerms
            .map(
              (t) =>
                `title.ilike.%${t}%,description.ilike.%${t}%,location_text.ilike.%${t}%`
            )
            .join(",");
          query = query.or(orConditions);
        }
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
        const activeFilters = Object.entries(dynamicFilters).reduce(
          (acc, [k, v]) => {
            if (v !== "" && v !== false) acc[k] = v;
            return acc;
          },
          {}
        );

        if (Object.keys(activeFilters).length > 0) {
          query = query.contains("parameters", activeFilters);
        }
      }

      // Бартер
      if (barterFilter === "yes") {
        query = query.contains("parameters", { barter: true });
      }

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

  // Pulsating Feed Logic: автообновление, если нет фильтров и мы на первой странице
  useEffect(() => {
    if (
      hasSearchQuery ||
      categoryFilter !== "all" ||
      typeFilter !== "all" ||
      page > 0
    )
      return;

    const interval = setInterval(() => {
      if (window.scrollY < 200) {
        console.log("🔄 Pulsating Feed: Refreshing...");
        setIsLive(true);
        fetchPage(0, { append: false }).then(() => {
          setTimeout(() => setIsLive(false), 2000);
        });
      }
    }, 30000);

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

  function handleSearchSubmit(e) {
    e.preventDefault();
    // Close autocomplete
    setShowSearchHistory(false);
    setSuggestions([]);
    // Add to history
    if (searchTerm.trim()) {
      const newHistory = addToSearchHistory(searchTerm);
      setSearchHistory(newHistory);
    }
    // Blur input
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
    // Search will happen automatically via useEffect watching searchTerm
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
    if (name === null) return;

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
      radiusFilter,
    };

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("tg_user_id", tgUser.id)
        .single();

      if (!profile) {
        alert("Профиль не найден.");
        return;
      }

      const { error } = await supabase.from("saved_searches").insert({
        user_id: profile.id,
        name: name || "Поиск",
        query_params: params,
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

        {/* Динамические фильтры категории */}
        {categoryFilter !== "all" &&
          categoryFiltersDef.map((filter) => {
            if (filter.key === "condition") return null;
            const val = dynamicFilters[filter.key];
            const label = filter.label[lang] || filter.label.ru;

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
                          {opt.label[lang] || opt.label.ru}
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
        <button
          onClick={() =>
            setWithPhotoFilter(
              withPhotoFilter === "yes" ? "all" : "yes"
            )
          }
          className={`mr-2 mb-2 px-3 py-2 rounded-lg border text-xs font-medium ${
            withPhotoFilter === "yes"
              ? "bg-black text-white border-black"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
        >
          {txt.withPhoto}
        </button>

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

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header: Search + Lang */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md px-4 py-3 border-b border-gray-100 transition-all duration-300">
        <div className="flex items-center gap-3 max-w-[520px] mx-auto">
          <div className="flex-1 relative">
            <form onSubmit={handleSearchSubmit}>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 group-focus-within:text-airbnb-red transition-colors" />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={txt.searchPlaceholder}
                  className="w-full pl-10 pr-4 py-3 bg-gray-100 border-none rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-black/5 focus:shadow-md transition-all shadow-sm placeholder-gray-500 text-gray-900"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setShowSearchHistory(true)}
                  onBlur={() =>
                    setTimeout(() => setShowSearchHistory(false), 200)
                  }
                  onKeyDown={handleSearchKeyDown}
                />
              </div>
            </form>

            {/* Smart Search Suggestions */}
            {showSearchHistory && searchTerm.length >= 2 && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 w-full bg-white border border-gray-100 rounded-2xl shadow-xl z-50 mt-2 max-h-60 overflow-y-auto p-2">
                <div className="px-3 py-2 border-b border-gray-50">
                  <span className="text-xs font-semibold text-gray-500">
                    Предложения
                  </span>
                </div>
                {searchSuggestions.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center px-3 py-3 hover:bg-gray-50 cursor-pointer rounded-xl transition-colors"
                    onClick={() => handleSuggestionClick(item)}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-900 font-medium">
                        {item.title}
                      </span>
                      {item.category && (
                        <span className="text-xs text-gray-500">
                          📁 {item.category}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Search History Dropdown */}
            {showSearchHistory && searchTerm.length < 2 && searchHistory.length > 0 && (
              <div className="absolute top-full left-0 w-full bg-white border border-gray-100 rounded-2xl shadow-xl z-50 mt-2 max-h-60 overflow-y-auto p-2">
                <div className="flex justify-between items-center px-3 py-2 border-b border-gray-50">
                  <span className="text-xs font-semibold text-gray-500">
                    Недавние
                  </span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      clearSearchHistory();
                      setSearchHistory([]);
                    }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Очистить
                  </button>
                </div>
                {searchHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center px-3 py-3 hover:bg-gray-50 cursor-pointer rounded-xl transition-colors"
                    onClick={() => handleHistoryClick(item)}
                  >
                    <span className="text-sm text-gray-700 truncate">
                      {item}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const h = removeFromSearchHistory(item);
                        setSearchHistory(h);
                      }}
                      className="text-gray-400 hover:text-red-500 px-2"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <LangSwitcher />
        </div>
      </header>

      <div className="max-w-[520px] mx-auto">
        {/* Filters (only if search query exists) */}
        {hasSearchQuery && (
          <div className="px-3 mt-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex flex-col gap-3">
                {/* Location Input */}
                <input
                  type="text"
                  placeholder={txt.locationPlaceholder}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-black focus:ring-0 transition-colors"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                />

                {/* Compact Filters */}
                {renderCompactFilters()}

                {/* Popular Queries */}
                <div className="mt-2">
                  <div className="text-xs font-medium text-gray-500 mb-2">
                    {txt.popularQueriesLabel}
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {popularQueries.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => handlePopularClick(q)}
                        className="flex-shrink-0 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Category Indicator */}
        {categoryFilter !== "all" && (
          <div className="px-4 mt-4">
            <div className="flex items-center justify-between bg-airbnb-red/5 border border-airbnb-red/10 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-2xl shadow-sm">
                  {CATEGORY_DEFS.find((c) => c.key === categoryFilter)
                    ?.icon || "📁"}
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">
                    Категория
                  </p>
                  <p className="font-bold text-gray-900">
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
        {categoryFilter === "all" && (
          <div className="mt-6">
            <PopularListingsScroll />
          </div>
        )}

        {/* Recently Viewed (Horizontal) */}
        {categoryFilter === "all" && (
          <RecentlyViewedScroll />
        )}

        {/* Main Feed Header */}
        <div className="px-4 mt-8 mb-4 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">
            {hasSearchQuery
              ? "Результаты"
              : categoryFilter !== "all"
              ? "Объявления"
              : typeFilter !== "all"
              ? "Объявления"
              : "Объявления"}
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
                  : "Попробуйте изменить параметры поиска"}
              </p>
            </div>
          ) : viewMode === "map" ? (
            <MapComponent
              listings={mapListings}
              userLocation={userLocation}
            />
          ) : (
            <>
              {/* Список объявлений */}
              <div className="grid grid-cols-2 gap-3">
                {listings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            </>
          )}

          {hasMore && listings.length > 0 && viewMode === "list" && (
            <div className="mt-8 mb-6 flex justify-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-8 py-3 text-sm font-medium bg-black text-white rounded-full disabled:opacity-60 hover:scale-105 transition-transform shadow-lg"
              >
                {loadingMore ? txt.loadingMore : txt.loadMore}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
