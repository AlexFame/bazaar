"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useLang } from "@/lib/i18n-client";
import { getUserId } from "@/lib/userId";

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

export default function ListingCard({ listing, showActions, onDelete }) {
  const { lang } = useLang();
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [profileId, setProfileId] = useState(null);

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

  // Load favorite status
  useEffect(() => {
    async function loadFavoriteStatus() {
      const tgUserId = getUserId();
      if (!tgUserId) return;

      try {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id")
          .eq("tg_user_id", Number(tgUserId))
          .single();

        if (!profileData) return;
        setProfileId(profileData.id);

        const { data: favoriteData } = await supabase
          .from("favorites")
          .select("id")
          .eq("profile_id", profileData.id)
          .eq("listing_id", listing.id)
          .single();

        setIsFavorite(!!favoriteData);
      } catch (e) {
        // Not favorited or error
        setIsFavorite(false);
      }
    }

    loadFavoriteStatus();
  }, [listing.id]);

  const typeMap = typeLabels[lang] || typeLabels.ru;
  const typeKey = listing?.type || "unknown";
  const typeText = typeMap[typeKey] || typeMap.unknown;
  const dateText = formatDate(listing?.created_at, lang);

  const handleFavoriteClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!profileId) return;

    try {
      if (isFavorite) {
        // Remove from favorites
        await supabase
          .from("favorites")
          .delete()
          .eq("profile_id", profileId)
          .eq("listing_id", listing.id);
        setIsFavorite(false);
      } else {
        // Add to favorites
        await supabase
          .from("favorites")
          .insert({
            profile_id: profileId,
            listing_id: listing.id,
          });
        setIsFavorite(true);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  const handleEdit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/create?edit=${listing.id}`);
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Удалить это объявление?")) return;

    try {
      const { error } = await supabase
        .from("listings")
        .delete()
        .eq("id", listing.id);

      if (error) throw error;

      if (onDelete) onDelete();
    } catch (error) {
      console.error("Error deleting listing:", error);
      alert("Ошибка при удалении объявления");
    }
  };

  return (
    <Link href={`/listing/${listing.id}`}>
      <article className="bg-white rounded-2xl p-2 shadow-sm flex flex-col h-full border border-black/10 relative">
        {/* Heart button */}
        <button
          onClick={handleFavoriteClick}
          className="absolute top-2 right-2 z-10 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:scale-110 transition-transform"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill={isFavorite ? "#ef4444" : "none"}
            stroke={isFavorite ? "#ef4444" : "currentColor"}
            strokeWidth="2"
            className="w-4 h-4"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </button>

        <div className="aspect-square w-full bg-gray-100 relative overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={listing.title || "Listing"}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              placeholder="blur"
              blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88/7dfwAIuQNS4g0U2AAAAABJRU5ErkJggg=="
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col">
          {/* Тип + дата */}
          <div className="flex items-center justify-between mb-1 mt-2">
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
            <div className="flex justify-between items-end mt-auto pt-2">
            <span className="font-semibold text-sm">{listing.price} €</span>
            {listing.views_count > 0 && (
              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                👁️ {listing.views_count}
              </span>
            )}
          </div>
          )}

          {/* Локация */}
          {listing.location_text && (
            <div className="text-[11px] text-black/60 line-clamp-1 mt-1">
              {listing.location_text}
            </div>
          )}
        </div>

        {/* Edit/Delete buttons */}
        {showActions && (
          <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-gray-100">
            <button
              onClick={handleEdit}
              className="w-full py-1.5 px-3 bg-gray-100 text-black text-[11px] font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Редактировать
            </button>
            <button
              onClick={handleDelete}
              className="w-full py-1.5 px-3 bg-red-50 text-red-600 text-[11px] font-medium rounded-lg hover:bg-red-100 transition-colors"
            >
              Удалить
            </button>
          </div>
        )}
      </article>
    </Link>
  );
}
