"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useLang } from "@/lib/i18n-client";

const typeLabels = {
  ru: {
    sell: "Продам",
    buy: "Куплю",
    free: "Отдам бесплатно",
    services: "Услуги",
    unknown: "Объявление",
  },
  ua: {
    sell: "Продам",
    buy: "Куплю",
    free: "Віддам безкоштовно",
    services: "Послуги",
    unknown: "Оголошення",
  },
  en: {
    sell: "Sell",
    buy: "Buy",
    free: "Free",
    services: "Services",
    unknown: "Listing",
  },
};

const dateLabels = {
  ru: {
    todayPrefix: "Сегодня в",
    yesterdayPrefix: "Вчера в",
  },
  ua: {
    todayPrefix: "Сьогодні о",
    yesterdayPrefix: "Вчора о",
  },
  en: {
    todayPrefix: "Today at",
    yesterdayPrefix: "Yesterday at",
  },
};

function formatDate(createdAt, lang) {
  if (!createdAt) return "";

  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return "";

  const now = new Date();
  const labels = dateLabels[lang] || dateLabels.ru;
  const locale = lang === "ua" ? "uk-UA" : lang === "ru" ? "ru-RU" : "en-US";

  const timeStr = d.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const sameDay =
    now.getFullYear() === d.getFullYear() &&
    now.getMonth() === d.getMonth() &&
    now.getDate() === d.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const isYesterday =
    yesterday.getFullYear() === d.getFullYear() &&
    yesterday.getMonth() === d.getMonth() &&
    yesterday.getDate() === d.getDate();

  if (sameDay) return `${labels.todayPrefix} ${timeStr}`;
  if (isYesterday) return `${labels.yesterdayPrefix} ${timeStr}`;

  return d.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ListingCard({ listing }) {
  const { lang } = useLang();
  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    const path = listing?.main_image_path || listing?.image_path;
    if (!path) {
      setImageUrl(null);
      return;
    }

    const { data } = supabase.storage
      .from("listing-images")
      .getPublicUrl(path);

    setImageUrl(data?.publicUrl || null);
  }, [listing?.main_image_path, listing?.image_path]);

  const typeMap = typeLabels[lang] || typeLabels.ru;
  const typeKey = listing?.type || "unknown";
  const typeText = typeMap[typeKey] || typeMap.unknown;
  const dateText = formatDate(listing?.created_at, lang);

  return (
    <Link href={`/listing/${listing.id}`}>
      <article className="bg-white rounded-2xl p-2 shadow-sm flex flex-col h-full border border-black/10">
        {/* Фото */}
        {imageUrl && (
          <div className="w-full mb-2 bg-gray-50 rounded-xl overflow-hidden">
            <img
              src={imageUrl}
              alt={listing.title || "Фото"}
              className="w-full h-36 object-contain"
            />
          </div>
        )}

        {/* Тип + дата */}
        <div className="flex items-center justify-between mb-1">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-black text-white text-[11px] font-medium">
            {typeText}
          </span>
          {dateText && (
            <span className="text-[11px] text-black/50">{dateText}</span>
          )}
        </div>

        {/* Заголовок */}
        {listing.title && (
          <h2 className="text-sm font-semibold line-clamp-2 mb-0.5">
            {listing.title}
          </h2>
        )}

        {/* Цена */}
        {typeof listing.price === "number" && (
          <div className="text-sm font-semibold mb-0.5">{listing.price} €</div>
        )}

        {/* Локация */}
        {listing.location_text && (
          <div className="text-[11px] text-black/60 line-clamp-1">
            {listing.location_text}
          </div>
        )}
      </article>
    </Link>
  );
}
