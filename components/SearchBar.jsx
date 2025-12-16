"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useLang } from "@/lib/i18n-client";
import { getAutocomplete, getPopularSearches } from "@/lib/search";

import { supabase } from "@/lib/supabaseClient";
import { getTelegramUser } from "@/lib/telegram";

export default function SearchBar() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useLang();

  const initialSearch = params.get("q") || "";
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);

  // Saved Search state
  const [isSaved, setIsSaved] = useState(false);
  const [savedSearchId, setSavedSearchId] = useState(null);

  // Check if current search is saved whenever searchTerm changes (or initial load)
  // We only check if searchTerm is not empty
  useEffect(() => {
    async function checkSaved() {
      if (!searchTerm || searchTerm.length < 2) {
        setIsSaved(false);
        setSavedSearchId(null);
        return;
      }

      // Check user
      let userId = null;
      const tgUser = getTelegramUser(); 
      // Note: we need the DB profile ID, not just Telegram ID. 
      // This is checking if we can get it from session or fetch content is needed?
      // For simplicity, let's rely on Supabase Auth or mapped profile ID.
      // Ideally we should have a `useUser` hook but let's do it inline efficiently.
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
      } else if (tgUser) {
         // Try to find profile by tg_user_id
         const { data: profile } = await supabase.from('profiles').select('id').eq('tg_user_id', tgUser.id).maybeSingle();
         if (profile) userId = profile.id;
      }

      if (!userId) return;

      const { data } = await supabase
        .from("saved_searches")
        .select("id")
        .eq("user_id", userId)
        .eq("query_params->>q", searchTerm.trim()) // Simplified check: strictly matches query 'q'
        .maybeSingle();

      if (data) {
        setIsSaved(true);
        setSavedSearchId(data.id);
      } else {
        setIsSaved(false);
        setSavedSearchId(null);
      }
    }

    // Debounce check
    const timer = setTimeout(checkSaved, 500);
    return () => clearTimeout(timer);

  }, [searchTerm]);

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

  async function handleSubscribe() {
    if (!searchTerm || searchTerm.length < 2) {
      alert(t("search_alert_empty") || "Введите запрос для подписки");
      return;
    }

    // Get User
    let userId = null;
    const tgUser = getTelegramUser();
    
    // 1. Try Supabase Auth
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
       userId = user.id;
    } else if (tgUser) {
       // 2. Try TG user -> Profile
       const { data: profile } = await supabase.from('profiles').select('id').eq('tg_user_id', tgUser.id).maybeSingle();
       if (profile) userId = profile.id;
    }

    if (!user) {
      alert(t("search_alert_login") || "Войдите в профиль (Telegram), чтобы сохранять поиски.");
      return;
    }

    try {
      if (isSaved && savedSearchId) {
        // DELETE
        const { error } = await supabase.from("saved_searches").delete().eq("id", savedSearchId);
        if (error) throw error;
        setIsSaved(false);
        setSavedSearchId(null);
      } else {
        // INSERT
        const { data, error } = await supabase.from("saved_searches").insert({
          user_id: userId,
          name: searchTerm,
          query_params: { q: searchTerm }
        }).select("id").single();

        if (error) throw error;
        setIsSaved(true);
        setSavedSearchId(data.id);
        alert(`${t("search_alert_subscribed") || "Вы подписались на"} "${searchTerm}"!`);
      }
    } catch (e) {
      console.error("Error toggling saved search:", e);
      alert(t("search_alert_error") || "Ошибка сохранения.");
    }
  }

  return (
    <div className="bg-white rounded-2xl p-3 shadow-sm mb-3 relative z-50">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            className="w-full border border-black rounded-xl pl-3 pr-10 py-1.5 text-xs"
            placeholder={t("search_main_ph") || "Поиск по объявлениям"}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} // Delay to allow click
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
          />
          
          {/* Voice Search Button */}
          <button
            type="button"
            onClick={() => {
              const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
              if (!SpeechRecognition) {
                alert("Ваш браузер не поддерживает голосовой поиск");
                return;
              }

              const recognition = new SpeechRecognition();
              
              // Set language based on current app language
              const langMap = {
                  'ru': 'ru-RU',
                  'ua': 'uk-UA',
                  'en': 'en-US'
              };
              recognition.lang = langMap[lang] || 'ru-RU';
              
              recognition.onstart = () => {
                  // Visual feedback could be added here if needed
                  // e.g. setListening(true);
              };
              
              recognition.onresult = (event) => {
                  const transcript = event.results[0][0].transcript;
                  setSearchTerm(transcript);
                  handleSearch(transcript);
              };
              
              recognition.onerror = (event) => {
                  console.error("Voice search error", event.error);
              };
              
              recognition.start();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-black transition-colors"
            title={lang === 'ua' ? "Голосовий пошук" : "Голосовой поиск"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
              <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
            </svg>
          </button>
          
          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              <div className="text-[10px] text-gray-400 px-3 py-1 bg-gray-50">
                {searchTerm ? (t("search_recommendations") || "Рекомендации") : (t("search_popular") || "Популярное")}
              </div>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-3 border-b border-gray-50 last:border-0"
                  onClick={() => {
                    if (s.type === 'listing') {
                        // Go direct to listing
                        router.push(`/listing/${s.id}`);
                    } else {
                        // Search query
                        setSearchTerm(s.text);
                        handleSearch(s.text);
                    }
                  }}
                >
                  {/* Icon or Image */}
                  <div className="w-8 h-8 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center text-lg">
                      {s.image ? (
                          <img src={s.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                          <span className="opacity-50">{s.type === 'listing' ? '📦' : '🔍'}</span>
                      )}
                  </div>
                  
                  {/* Text */}
                  <div className="flex-1">
                      <div className="font-medium truncate text-gray-800">{s.text}</div>
                      {s.subText && <div className="text-[10px] text-gray-400">{s.subText}</div>}
                  </div>

                  {/* Arrow */}
                  <span className="text-gray-300 text-xs">↗</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Subscribe Button (Visual only if empty query, functional if has query) */}
        <button
          type="button"
          onClick={handleSubscribe}
          className={`px-3 py-2 rounded-xl transition-colors flex items-center justify-center ${
            isSaved ? "bg-yellow-100 text-yellow-600" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
          }`}
          title={isSaved ? (t("subscribed_search") || "Вы подписаны на этот поиск") : (t("subscribe_search") || "Подписаться на поиск")}
        >
          {isSaved ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm4.502 8.9a2.25 2.25 0 104.496 0 25.057 25.057 0 01-4.496 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          )}
        </button>

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
