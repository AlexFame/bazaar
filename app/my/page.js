"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getUserId, isTelegramEnv } from "@/lib/telegram";
import ListingCard from "@/components/ListingCard";
import { useLang } from "@/lib/i18n-client";

// Локальные переводы страницы
const pageTranslations = {
  ru: {
    title: "Мои объявления",
    needTelegram:
      "Открой мини-аппку через Telegram-бота, чтобы увидеть свои объявления.",
    noUser:
      "Не удалось определить пользователя Telegram. Перезапусти мини-аппку через бота.",
    loading: "Загружаем…",
    empty: "У тебя пока нет объявлений.",
    error: "Ошибка загрузки объявлений",
  },
  ua: {
    title: "Мої оголошення",
    needTelegram:
      "Відкрий міні-додаток через Telegram-бота, щоб побачити свої оголошення.",
    noUser:
      "Не вдалося визначити користувача Telegram. Перезапусти міні-додаток через бота.",
    loading: "Завантажуємо…",
    empty: "У тебе поки немає оголошень.",
    error: "Помилка завантаження оголошень",
  },
  en: {
    title: "My listings",
    needTelegram:
      "Open the mini-app via the Telegram bot to see your listings.",
    noUser:
      "Failed to identify Telegram user. Restart the mini-app via the bot.",
    loading: "Loading…",
    empty: "You don't have any listings yet.",
    error: "Failed to load listings",
  },
};

export default function MyPage() {
  const { lang } = useLang();
  const t = pageTranslations[lang] || pageTranslations.ru;

  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      // Если не в Telegram — нет пользователя
      if (!isTelegramEnv()) {
        setError(t.needTelegram);
        setLoading(false);
        return;
      }

      const userId = getUserId();
      if (!userId) {
        setError(t.noUser);
        setLoading(false);
        return;
      }

      // Загружаем объявления пользователя
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setError(t.error);
        setLoading(false);
        return;
      }

      setListings(data || []);
      setLoading(false);
    }

    load();
  }, [lang]); // меняем язык — меняется текст страницы

  return (
    <div className="w-full flex justify-center mt-6 px-3">
      <div className="max-w-[520px] w-full">
        {/* Заголовок */}
        <h1 className="text-lg font-semibold mb-4">{t.title}</h1>

        {/* Ошибка */}
        {error && (
          <div className="text-sm text-red-500 bg-white p-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        {/* Загрузка */}
        {loading && <div className="text-sm text-black/60">{t.loading}</div>}

        {/* Нет объявлений */}
        {!loading && !error && listings.length === 0 && (
          <div className="text-sm text-black/60">{t.empty}</div>
        )}

        {/* Список объявлений */}
        <div className="grid grid-cols-2 gap-2">
          {listings.map((item) => (
            <ListingCard key={item.id} listing={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
