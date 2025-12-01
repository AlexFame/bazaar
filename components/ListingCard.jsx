"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useLang } from "@/lib/i18n-client";
import { getUserId } from "@/lib/userId";
import { translateText } from "@/lib/translation";
import { trackAnalyticsEvent } from "@/lib/analytics";

const typeLabels = {
  ru: {
    sell: "Продам",
    buy: "Куплю",
    free: "Отдам",
    services: "Услуги",
    unknown: "Объявление",
  },
  ua: {
    sell: "Продам",
    buy: "Куплю",
    free: "Віддам",
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

export default function ListingCard({ listing, showActions, onDelete, onPromote, onAnalytics }) {
  const { lang } = useLang();
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [profileId, setProfileId] = useState(null);
  const [translatedTitle, setTranslatedTitle] = useState("");

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
          .maybeSingle();

        setIsFavorite(!!favoriteData);
      } catch (e) {
        // Not favorited or error
        setIsFavorite(false);
      }
    }

    loadFavoriteStatus();
  }, [listing.id]);

  // Auto-translate title when language changes
  useEffect(() => {
    if (!listing?.title) return;

    let isMounted = true;

    async function doTranslate() {
      const translated = await translateText(listing.title, lang);
      if (isMounted) {
        setTranslatedTitle(translated);
      }
    }

    doTranslate();

    return () => { isMounted = false; };
  }, [listing?.title, lang]);

  const typeMap = typeLabels[lang] || typeLabels.ru;
  const typeKey = listing?.type || "unknown";
  const typeText = typeMap[typeKey] || typeMap.unknown;
  const dateText = formatDate(listing?.created_at, lang);

  // Micro-labels logic
  const isNew = listing?.created_at && (new Date() - new Date(listing.created_at)) < 24 * 60 * 60 * 1000;
  const isPopular = (listing?.views_count || 0) > 50;
  const isVerified = listing?.profiles?.is_verified;

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
        trackAnalyticsEvent(listing.id, 'favorite_add');
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

  const isVip = listing.is_vip || false;

  return (
    <Link href={`/listing/${listing.id}`}>
      <article className={`bg-white rounded-3xl overflow-hidden transition-all hover:shadow-airbnb-hover group relative ${
        isVip
          ? 'shadow-airbnb ring-2 ring-gradient-to-r from-purple-400 to-pink-400'
          : 'shadow-airbnb'
      }`}>
        {/* VIP Badge - Modern gradient design */}
        {isVip && (
            <div className="absolute top-3 left-3 z-10 px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-lg shadow-lg">
                ⭐ VIP
            </div>
        )}

        {/* Micro-labels (New / Popular) */}
        {!isVip && isNew && (
            <div className="absolute top-3 left-3 z-10 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow-md">
                🔥 New
            </div>
        )}
        {!isVip && !isNew && isPopular && (
            <div className="absolute top-3 left-3 z-10 px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-full shadow-md">
                ⚡ Popular
            </div>
        )}

        {/* Heart button */}
        <button
          onClick={handleFavoriteClick}
          className="absolute top-3 right-3 z-10 p-2 bg-white/95 backdrop-blur-sm rounded-full shadow-md hover:scale-110 transition-transform"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill={isFavorite ? "#ef4444" : "none"}
            stroke={isFavorite ? "#ef4444" : "currentColor"}
            strokeWidth="2"
            className="w-5 h-5 text-gray-700"
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
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              placeholder="blur"
              blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88/7dfwAIuQNS4g0U2AAAAABJRU5ErkJggg=="
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <svg
                className="w-10 h-10"
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

        <div className="p-3">
          {/* Тип + дата */}
          <div className="flex items-center justify-between mb-1 mt-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-black dark:bg-white text-white dark:text-black text-[11px] font-medium">
              {typeText}
            </span>
            {dateText && (
              <span className="text-[11px] text-black/50 dark:text-white/50">{dateText}</span>
            )}
          </div>

          {/* Заголовок */}
          {listing.title && (
            <h2 className="text-sm font-semibold line-clamp-2 mb-0.5 text-black dark:text-white">
              {translatedTitle || listing.title}
            </h2>
          )}

          {/* Цена */}
          {typeof listing.price === "number" && (
            <div className="flex justify-between items-end mt-auto pt-2">
            <span className="font-semibold text-sm text-black dark:text-white">{listing.price} €</span>
            {listing.views_count > 0 && (
              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                👁️ {listing.views_count}
              </span>
            )}
          </div>
          )}

          {/* Локация */}
          {listing.location_text && (
            <div className="text-[11px] text-black/60 dark:text-white/60 line-clamp-1 mt-1">
              {listing.location_text}
            </div>
          )}

          {/* Verified Badge */}
          {listing.profiles?.is_verified && (
            <div className="flex items-center gap-1 mt-1.5">
              <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">Verified Seller</span>
            </div>
          )}
        </div>

        {/* Edit/Delete buttons */}
        {showActions && (
          <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-white/10">
            {onAnalytics && (
                <button
                  onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onAnalytics();
                  }}
                  className="w-full py-1.5 px-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[11px] font-medium rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors mb-2"
                >
                  📊 Статистика
                </button>
            )}
            {onPromote && !isVip && (
                <button
                  onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onPromote();
                  }}
                  className="w-full py-1.5 px-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[11px] font-bold rounded-lg shadow-sm hover:shadow-md transition-all"
                >
                  🚀 Продвинуть (VIP)
                </button>
            )}
            <button
              onClick={handleEdit}
              className="w-full py-1.5 px-3 bg-gray-100 dark:bg-gray-800 text-black dark:text-white text-[11px] font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Редактировать
            </button>
            <button
              onClick={handleDelete}
              className="w-full py-1.5 px-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[11px] font-medium rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              Удалить
            </button>
          </div>
        )}
      </article>
    </Link>
  );
}
