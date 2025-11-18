"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getUserId } from "@/lib/userId";
import { useLang } from "@/lib/i18n-client";
import ListingCard from "@/components/ListingCard";
import { isTelegramEnv } from "@/lib/telegram";

const pageTranslations = {
  ru: {
    my: "Мои объявления",
    needBot:
      "Открой мини-аппку через Telegram-бота, чтобы увидеть свои объявления.",
    loading: "Загружаем ваши объявления...",
    empty: "У тебя пока нет объявлений.",
    hintCreate: 'Нажми кнопку "Создать", чтобы опубликовать первое объявление.',
  },
  ua: {
    my: "Мої оголошення",
    needBot:
      "Відкрий міні-додаток через Telegram-бота, щоб побачити свої оголошення.",
    loading: "Завантажуємо твої оголошення...",
    empty: "У тебе поки немає оголошень.",
    hintCreate:
      'Натисни кнопку "Створити", щоб опублікувати своє перше оголошення.',
  },
  en: {
    my: "My listings",
    needBot: "Open the mini-app via the Telegram bot to see your listings.",
    loading: "Loading your listings...",
    empty: "You don’t have any listings yet.",
    hintCreate: 'Tap "Create" to publish your first listing.',
  },
};

export default function MyPage() {
  const { lang } = useLang();
  const t = pageTranslations[lang] || pageTranslations.ru;

  const [inTG, setInTG] = useState(false);
  const [userId, setUserId] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const inside = isTelegramEnv();
      setInTG(inside);

      if (!inside) {
        // Не в Telegram WebApp – просто показываем предупреждение
        setLoading(false);
        return;
      }

      const id = getUserId();
      setUserId(id);

      // даже если id нет – просто не фильтруем, но и не показываем красный блок
      if (!id) {
        setLoading(false);
        setListings([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("listings")
          .select("*")
          .eq("created_by", String(id))
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Ошибка загрузки моих объявлений:", error);
          setListings([]);
        } else {
          setListings(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error("Ошибка загрузки моих объявлений:", e);
        setListings([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const showNeedBot = !inTG; // предупреждение только если вообще не в Telegram

  return (
    <div className="w-full flex justify-center mt-3">
      <div className="w-full max-w-[520px] px-3">
        <h1 className="text-lg font-semibold mb-3">{t.my}</h1>

        {showNeedBot && (
          <div className="p-3 mb-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            {t.needBot}
          </div>
        )}

        {!showNeedBot && loading && (
          <div className="bg-white rounded-2xl shadow-sm p-3 text-xs text-black/60">
            {t.loading}
          </div>
        )}

        {!showNeedBot && !loading && listings.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-3 text-xs text-black/80">
            <p>{t.empty}</p>
            <p className="mt-1 text-black/60">{t.hintCreate}</p>
          </div>
        )}

        {!showNeedBot && !loading && listings.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-3">
            <div className="grid grid-cols-2 gap-2">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
