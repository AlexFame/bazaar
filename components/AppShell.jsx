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

  // Track current user
  useEffect(() => {
      const getUser = async () => {
          const { data: { user } } = await supabase.auth.getUser();
          setCurrentUser(user);
      };
      getUser();

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          setCurrentUser(session?.user || null);
      });
      return () => subscription.unsubscribe();
  }, []);

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
          
          // После успешной авторизации (или попытки) грузим кол-во непрочитанных
          // Но нужно знать ID пользователя. 
          // Проще запросить через supabase.auth.getUser() если сессия есть
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
              const { count } = await supabase
                  .from('messages')
                  .select('*', { count: 'exact', head: true })
                  .eq('is_read', false)
                  .neq('sender_id', user.id);
              
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
          .channel('unread_messages_global')
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
                          setToastMessage(`Новое сообщение: ${payload.new.content}`);
                      }
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

  // Check if we are in a chat conversation (e.g. /messages/123)
  // But NOT the main messages list (/messages)
  const isChatConversation = pathname.startsWith("/messages/") && pathname !== "/messages";

  return (
    <div className="w-full min-h-[100dvh] dark:bg-black flex flex-col items-center transition-colors duration-300">
      {/* Шапка - скрываем в чате */}
      {!isChatConversation && (
        <header className="w-full dark:bg-black pt-[calc(env(safe-area-inset-top)+1rem)] pb-3 border-b border-black/5 dark:border-white/10 transition-colors duration-300">
          <div className="w-full max-w-[520px] px-3 mx-auto flex flex-col gap-3">
            {/* Текст сверху */}
            <div className="text-center text-xs font-semibold text-black/80 dark:text-white/80 break-words leading-tight">
              Bazaar
            </div>

            {/* Поиск - с анимацией скрытия/появления */}
            <div 
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  pathname === "/" ? "max-h-16 opacity-100 mb-0" : "max-h-0 opacity-0 mb-0"
              }`}
            >
              <form onSubmit={handleSearchSubmit} className="w-full">
                  {renderSearchBar(headerSearchRef)}
              </form>
            </div>

            {/* НАВИГАЦИЯ + ЯЗЫК */}
            <div className="flex items-center justify-center gap-2">
              <nav className="flex gap-2 items-center justify-center">
                {/* Главная */}
                <Link href="/">
                  <button
                    className={`${navBtn} ${
                      pathname === "/"
                        ? "bg-black text-white dark:bg-white dark:text-black"
                        : "bg-[#F2F3F7] text-black dark:bg-[#262626] dark:text-white"
                    }`}
                  >
                    {t("navbar_brand")}
                  </button>
                </Link>

                {/* Личный кабинет */}
                <Link href="/my">
                  <button
                    className={`${navBtn} ${
                      pathname === "/my"
                        ? "bg-black text-white dark:bg-white dark:text-black"
                        : "bg-[#F2F3F7] text-black dark:bg-[#262626] dark:text-white"
                    }`}
                  >
                    {t("navbar_myAds")}
                  </button>
                </Link>
              </nav>

              {/* <ThemeToggle /> */}
              <LangSwitcher />
            </div>
          </div>
        </header>
      )}

      {/* Липкая панель поиска - только на главной */}
      {pathname === "/" && !isChatConversation && (
        <div
            className={`fixed top-2 left-1/2 -translate-x-1/2 w-full max-w-[520px] px-3 z-30 transition-all duration-200 ${
            showFloatingSearch
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 -translate-y-4 pointer-events-none"
            }`}
        >
            <form onSubmit={handleSearchSubmit}>{renderSearchBar(floatingSearchRef)}</form>
        </div>
      )}

      {/* Контент - убираем отступы в чате */}
      <main className={`flex-1 w-full max-w-[520px] mx-auto ${isChatConversation ? "p-0" : "px-3 pb-4"}`}>
        {children}
      </main>

      {!isChatConversation && (
        <footer className="w-full max-w-[520px] mx-auto text-center text-[11px] py-5 opacity-60">
          Bazaar © 2025 • <a href="https://t.me/bazaar_support" target="_blank" rel="noopener noreferrer" className="hover:underline">Поддержка</a>
        </footer>
      )}
      
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
    </div>
  );
}
