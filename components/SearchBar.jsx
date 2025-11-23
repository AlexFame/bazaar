"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useLang } from "@/lib/i18n-client";
import { getAutocomplete, getPopularSearches } from "@/lib/search";

export default function SearchBar() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useLang();

  const initialSearch = params.get("q") || "";
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load popular searches on mount
  useEffect(() => {
    if (!searchTerm) {
      loadPopular();
    }
  }, []);

  useEffect(() => {
    setSearchTerm(initialSearch);
  }, [initialSearch]);

  // Debounced autocomplete
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchTerm.length >= 2) {
        setLoading(true);
        // NOTE: getAutocomplete and getPopularSearches are not defined in the provided snippet.
        // They should be implemented or imported from a utility file.
        const results = await getAutocomplete(searchTerm);
        setSuggestions(results);
        setLoading(false);
        setShowSuggestions(true);
      } else if (searchTerm.length === 0) {
        loadPopular();
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  async function loadPopular() {
    // NOTE: getAutocomplete and getPopularSearches are not defined in the provided snippet.
    // They should be implemented or imported from a utility file.
    const popular = await getPopularSearches();
    if (popular.length > 0) {
      setSuggestions(popular);
    }
  }

  function handleSearch(term = searchTerm) {
    const q = term.trim();
    if (q) {
      router.push(`/?q=${encodeURIComponent(q)}`);
      setShowSuggestions(false);
    } else {
      router.push("/");
    }
  }

  return (
    <div className="bg-white rounded-2xl p-3 shadow-sm mb-3 relative z-50">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            className="w-full border border-black rounded-xl px-3 py-1.5 text-xs"
            placeholder={t("search_main_ph") || "Поиск по объявлениям"}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} // Delay to allow click
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
          />
          
          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              <div className="text-[10px] text-gray-400 px-3 py-1 bg-gray-50">
                {searchTerm ? "Подсказки" : "Популярное"}
              </div>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2"
                  onClick={() => {
                    setSearchTerm(s);
                    handleSearch(s);
                  }}
                >
                  <span className="text-gray-400">🔍</span>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => handleSearch()}
          className="px-4 py-2 bg-black text-white rounded-xl text-xs font-medium whitespace-nowrap"
        >
          {t("btn_search")}
        </button>
      </div>
    </div>
  );
}
