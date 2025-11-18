"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getUserId } from "@/lib/userId";
import { useLang } from "@/lib/i18n-client";
import ListingCard from "@/components/ListingCard";

const pageTranslations = {
  ru: {
    my: "Мои объявления",
    loading: "Загружаем ваши объявления...",
    empty: "У тебя пока нет объявлений.",
    hintCreate: 'Нажми кнопку "Создать", чтобы опубликовать первое объявление.',
  },
  ua: {
    my: "Мої оголошення",
    loading: "Завантажуємо твої оголошення...",
    empty: "У тебе поки немає оголошень.",
    hintCreate:
      'Натисни кнопку "Створити", щоб опублікувати своє перше оголошення.',
  },
  en: {
    my: "My listings",
    loading: "Loading your listings...",
    empty: "You don’t have any listings yet.",
    hintCreate: 'Tap "Create" to publish your first listing.',
  },
};

export default function MyPage() {
  const { lang } = useLang();
  const t = pageTranslations[lang] || pageTranslations.ru;

  const [userId, setUserId] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const id = getUserId();
      setUserId(id);

      if (!id) {
        // userId нет – просто покажем пустой список без красных предупреждений
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

  return (
    <div className="w-full flex justify-center mt-3">
      <div className="w-full max-w-[520px] px-3">
        <h1 className="text-lg font-semibold mb-3">{t.my}</h1>

        {loading && (
          <div className="bg-white rounded-2xl shadow-sm p-3 text-xs text-black/60">
            {t.loading}
          </div>
        )}

        {!loading && listings.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-3 text-xs text-black/80">
            <p>{t.empty}</p>
            <p className="mt-1 text-black/60">{t.hintCreate}</p>
          </div>
        )}

        {!loading && listings.length > 0 && (
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
