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
    sell: "For sale",
    buy: "Wanted",
    free: "Give away",
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
  const diffMs = now.getTime() - d.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  const labels = dateLabels[lang] || dateLabels.ru;
  const locale = lang === "ua" ? "uk-UA" : lang === "ru" ? "ru-RU" : "en-US";

  const timeStr = d.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (diffDays < 1 && now.getDate() === d.getDate()) {
    return `${labels.todayPrefix} ${timeStr}`;
  }

  if (
    diffDays < 2 &&
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getDate() ===
      d.getDate()
  ) {
    return `${labels.yesterdayPrefix} ${timeStr}`;
  }

  return d.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ListingCard({ listing }) {
  const { lang } = useLang();
  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    if (!listing?.image_path) {
      setImageUrl(null);
      return;
    }

    const { data } = supabase.storage
      .from("listing-images")
      .getPublicUrl(listing.image_path);

    if (data?.publicUrl) {
      setImageUrl(data.publicUrl);
    } else {
      setImageUrl(null);
    }
  }, [listing?.image_path]);

  const typeMap = typeLabels[lang] || typeLabels.ru;
  const typeKey = listing?.type || "unknown";
  const typeText = typeMap[typeKey] || typeMap.unknown;

  const dateText = formatDate(listing?.created_at, lang);

  return (
    <Link href={`/listing/${listing.id}`}>
      <article className="bg-white rounded-2xl p-2 shadow-sm flex flex-col h-full">
        {/* Фото */}
        {imageUrl && (
          <div className="w-full mb-2">
            <img
              src={imageUrl}
              alt={listing.title || "Фото"}
              className="w-full h-32 object-cover rounded-xl"
            />
          </div>
        )}

        {/* Тип + дата */}
        <div className="flex items-center justify-between mb-1">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-black text-white text-[10px] font-medium">
            {typeText}
          </span>
          {dateText && (
            <span className="text-[10px] text-black/50">{dateText}</span>
          )}
        </div>

        {/* Заголовок */}
        {listing.title && (
          <h2 className="text-xs font-semibold line-clamp-2 mb-0.5">
            {listing.title}
          </h2>
        )}

        {/* Цена */}
        {typeof listing.price === "number" && (
          <div className="text-xs font-semibold mb-0.5">{listing.price} €</div>
        )}

        {/* Локация */}
        {listing.location_text && (
          <div className="text-[10px] text-black/60 line-clamp-1">
            {listing.location_text}
          </div>
        )}
      </article>
    </Link>
  );
}
