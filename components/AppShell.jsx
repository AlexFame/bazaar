"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import LangSwitcher from "./LangSwitcher";
import ThemeToggle from "./ThemeToggle";
import { useLang } from "@/lib/i18n-client";
import { getTG } from "@/lib/telegram";
import { getSuggestions } from "@/lib/searchUtils";

import { supabase } from "@/lib/supabaseClient";
import Toast from "./Toast";
import OnboardingTutorial from "./OnboardingTutorial";
import BottomNavigation from "./BottomNavigation";

import TelegramThemeSync from "@/components/TelegramThemeSync";

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLang();

  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFloatingSearch, setShowFloatingSearch] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastMessage, setToastMessage] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const lastScrollY = useRef(0);
  const headerSearchRef = useRef(null);
  const floatingSearchRef = useRef(null);

  // чтобы не дергать /api/auth/tg/verify по 100 раз
  const authOnceRef = useRef(false);

  // Track current user via server-side cookie session
  useEffect(() => {
      const getUser = async () => {
          try {
              const res = await fetch('/api/auth/me');
              const data = await res.json();
              setCurrentUser(data.user || null);
          } catch {
              setCurrentUser(null);
          }
      };
      getUser();
  }, []);

  // Update last_seen on activity
  useEffect(() => {
      if (!currentUser) return;

      const updateLastSeen = async () => {
          try {
              // We use a simple RPC or direct update if policy allows.
              // Since we added a function 'update_last_seen', let's try to use it, 
              // or just update directly if RLS allows users to update their own profile.
              // Assuming RLS allows update of own profile:
              await supabase
                  .from('profiles')
                  .update({ last_seen: new Date().toISOString() })
                  .eq('id', currentUser.id);
          } catch (e) {
              console.error("Error updating last_seen:", e);
          }
      };

      // Update on mount (initial load)
      updateLastSeen();

      // Set up interval to update every 5 minutes if user is active
      const interval = setInterval(updateLastSeen, 5 * 60 * 1000);

      return () => clearInterval(interval);
  }, [currentUser, pathname]); // Also update on route change

  // Подтягиваем q из URL в инпут и сбрасываем подсказки
  useEffect(() => {
    const q = searchParams.get("q") || "";
    setSearch(q);
    setShowSuggestions(false);
    setSuggestions([]);
  }, [searchParams]);

  // Закрываем подсказки при клике вне
  useEffect(() => {
      function handleClickOutside(event) {
          const inHeader = headerSearchRef.current && headerSearchRef.current.contains(event.target);
          const inFloating = floatingSearchRef.current && floatingSearchRef.current.contains(event.target);

          if (!inHeader && !inFloating) {
              setShowSuggestions(false);
          }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Липкий поиск: вниз - показываем, вверх - прячем
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleScroll = () => {
      const currentY = window.scrollY;
      const prevY = lastScrollY.current;
      const isScrollingDown = currentY > prevY;

      if (currentY > 80 && isScrollingDown) {
        setShowFloatingSearch(true);
      } else if (!isScrollingDown) {
        setShowFloatingSearch(false);
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Telegram auth -> /api/auth/tg/verify (для личного кабинета)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (authOnceRef.current) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 20; // до ~3 секунд

    const tryAuth = () => {
      if (cancelled || authOnceRef.current) return;

      // Берем WebApp напрямую из window.Telegram или через getTG
      const tg =
        (window.Telegram && window.Telegram.WebApp) || getTG?.() || null;

      const initData = tg?.initData;
      if (!initData) {
        // Telegram WebView еще не инициализировался, подождем
        attempts += 1;
        if (attempts < maxAttempts) {
          setTimeout(tryAuth, 150);
        }
        return;
      }

      authOnceRef.current = true;

      (async () => {
        try {
          await fetch("/api/auth/tg/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData }),
          });
          
          // Expand the WebApp to full height
          try {
            tg?.expand?.();
          } catch (e) {}

          // After auth, fetch user from server cookie session
          const meRes = await fetch('/api/auth/me');
          const meData = await meRes.json();
          if (meData.user) {
              setCurrentUser(meData.user);
              const { count } = await supabase
                  .from('messages')
                  .select('*', { count: 'exact', head: true })
                  .eq('is_read', false)
                  .neq('sender_id', meData.user.id);
              
              if (count !== null) setUnreadCount(count);
          }

        } catch (err) {
          console.warn("Telegram auth verify failed:", err);
        }
      })();
    };

    tryAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  // Периодическая проверка непрочитанных (раз в 30 сек) + Realtime
  useEffect(() => {
      if (!currentUser) return;

      // Функция обновления счетчика
      const fetchUnread = async () => {
          const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('is_read', false)
              .neq('sender_id', currentUser.id);
          
          if (count !== null) setUnreadCount(count);
      };

      // 1. Initial fetch
      fetchUnread();

      // 2. Interval fetch (fallback)
      const interval = setInterval(fetchUnread, 30000);

      // 3. Realtime subscription
      const channel = supabase
          .channel('realtime_updates_global')
          .on(
              'postgres_changes',
              {
                  event: '*',
                  schema: 'public',
                  table: 'messages',
              },
              (payload) => {
                  fetchUnread();
                  
                  // Show toast for new messages from others
                  if (payload.eventType === 'INSERT' && payload.new.sender_id !== currentUser.id) {
                      const isChatOpen = window.location.pathname.includes(payload.new.conversation_id);
                      
                      if (!isChatOpen) {
                          setToastMessage(`✉️ ${payload.new.content}`);
                      }
                  }
              }
          )
          .on(
              'postgres_changes',
              {
                  event: 'INSERT',
                  schema: 'public',
                  table: 'notifications',
                  filter: `user_id=eq.${currentUser.id}`
              },
              (payload) => {
                  // Show toast for new notifications
                  if (payload.new.message) {
                      setToastMessage(payload.new.message);
                  }
              }
          )
          .subscribe();

      return () => {
          clearInterval(interval);
          supabase.removeChannel(channel);
      };
  }, [currentUser]);


  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    setShowSuggestions(false);
    const term = search.trim();
    const params = new URLSearchParams();

    if (term) params.set("q", term);

    const url = params.toString() ? `/?${params.toString()}` : "/";
    router.push(url);
  };

  const handleSuggestionClick = (suggestion) => {
      setSearch(suggestion.text);
      setShowSuggestions(false);
      setSuggestions([]); // Очищаем подсказки, чтобы меню точно закрылось и не открывалось само

      const params = new URLSearchParams();
      params.set("q", suggestion.text);
      router.push(`/?${params.toString()}`);
  };

  const navBtn =
    "flex-1 text-center px-4 py-2 rounded-full text-xs font-medium transition-colors whitespace-nowrap flex items-center justify-center gap-2";

  const renderSearchBar = (containerRef) => (
    <div className="relative" ref={containerRef}>
        <div className="flex items-center gap-2 bg-[#F2F3F7] dark:bg-[#262626] rounded-full px-3 py-2 shadow-sm transition-colors duration-300">
        <span className="text-base opacity-60 dark:text-white/60" aria-hidden="true">
            🔍
        </span>
        <input
            type="text"
            placeholder={t("search_main_ph")}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-black/40 dark:placeholder:text-white/40 text-black dark:text-white"
            value={search}
            onChange={(e) => {
                const val = e.target.value;
                setSearch(val);
                if (val.trim().length >= 2) {
                    const newSuggestions = getSuggestions(val, t.lang);
                    setSuggestions(newSuggestions);
                    setShowSuggestions(true);
                } else {
                    setSuggestions([]);
                    setShowSuggestions(false);
                }
            }}
            onKeyDown={(e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearchSubmit();
                }
            }}
            onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
            }}
        />
        <button
            type="button"
            onClick={handleSearchSubmit}
            className="px-4 py-1.5 rounded-full bg-black text-white dark:bg-white dark:text-black text-xs font-semibold"
        >
            {t("btn_search")}
        </button>
        </div>

        {/* Autocomplete Dropdown */}
        {showSuggestions && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
                {suggestions.map((s, i) => (
                    <button
                        key={i}
                        type="button"
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between group"
                        onClick={() => handleSuggestionClick(s)}
                    >
                        <span className="text-gray-800 group-hover:text-black">
                            {s.text}
                        </span>
                        {s.category && (
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                {s.category}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-airbnb-gray">
      {/* Main Content */}
      <main className="flex-1 w-full max-w-[520px] mx-auto bg-white min-h-screen relative shadow-2xl pb-20">
        {children}
      </main>
      
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
      <OnboardingTutorial />
    </div>
  );
}
