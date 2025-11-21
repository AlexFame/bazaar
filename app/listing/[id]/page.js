"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useLang } from "@/lib/i18n-client";
import { CATEGORY_DEFS } from "@/lib/categories";
import { getTelegramUser } from "@/lib/telegram";
import { ListingDetailSkeleton } from "@/components/SkeletonLoader";

// Строим ссылку по введённому контакту
function buildContactLink(raw) {
  if (!raw) return null;

  const contact = raw.trim();

  // Телеграм: @username
  if (contact.startsWith("@")) {
    const username = contact.slice(1).split(" ")[0];
    if (username) return `https://t.me/${username}`;
  }

  // Телеграм: t.me/username
  if (contact.includes("t.me/")) {
    return contact.startsWith("http") ? contact : `https://${contact}`;
  }

  // Телефон: оставляем только цифры и +
  const phone = contact.replace(/[^\d+]/g, "");
  if (phone.length >= 6) {
    return `tel:${phone}`;
  }

  return null;
}

// Определяем, что за контакт (телега / телефон)
function detectType(raw) {
  if (!raw) return { isPhone: false, isTelegram: false };

  const c = raw.trim();

  const isTelegram = c.startsWith("@") || c.includes("t.me/");

  const cleaned = c.replace(/[^\d+]/g, "");
  const isPhone = cleaned.length >= 6;

  return { isPhone, isTelegram };
}

// Лейблы кнопок по языкам
const TELEGRAM_LABEL = {
  ru: "Написать в Telegram",
  ua: "Написати в Telegram",
  en: "Message on Telegram",
};

const CALL_LABEL = {
  ru: "Позвонить",
  ua: "Подзвонити",
  en: "Call",
};

export default function ListingPage({ params }) {
  const { id } = params;
  const { t, lang } = useLang();
  const router = useRouter();

  const [listing, setListing] = useState(null);
  const [imageUrls, setImageUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!id) return;

    async function loadListing() {
      setLoading(true);
      try {
        const { data: listingData, error: listingError } = await supabase
          .from("listings")
          .select("*")
          .eq("id", id)
          .single();

        if (listingError) {
          console.error("Ошибка загрузки объявления:", listingError);
          return;
        }

        setListing(listingData);

        const folder = `listing-${listingData.id}`;
        let urls = [];

        const { data: files, error: listError } = await supabase.storage
          .from("listing-images")
          .list(folder);

        if (!listError && Array.isArray(files) && files.length > 0) {
          urls = files
            .map((file) => {
              const path = `${folder}/${file.name}`;
              const { data } = supabase.storage
                .from("listing-images")
                .getPublicUrl(path);
              return data?.publicUrl;
            })
            .filter(Boolean);
        } else if (listingData.image_path) {
          const { data } = supabase.storage
            .from("listing-images")
            .getPublicUrl(listingData.image_path);
          if (data?.publicUrl) urls = [data.publicUrl];
        }

        setImageUrls(urls);
        setCurrentIndex(0);

        // Проверяем, является ли текущий пользователь владельцем объявления
        const tgUser = getTelegramUser();
        if (tgUser?.id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("tg_user_id", tgUser.id)
            .maybeSingle();
          
          if (profile && listingData.created_by === profile.id) {
            setIsOwner(true);
          }
        }
      } catch (err) {
        console.error("Ошибка:", err);
      } finally {
        setLoading(false);
      }
    }

    loadListing();

    // Логика подсчета просмотров
    const viewedKey = `viewed_listing_${id}`;
    const hasViewed = localStorage.getItem(viewedKey);

    if (!hasViewed) {
      // Если еще не смотрели в этой сессии, увеличиваем счетчик
      supabase
        .rpc("increment_view_count", { listing_id: id })
        .then(({ error }) => {
          if (!error) {
            localStorage.setItem(viewedKey, "true");
            console.log("View count incremented");
          } else {
            console.error("Error incrementing view count:", error);
          }
        });
    }
  }, [id]);

  function handleScroll(e) {
    const scrollLeft = e.target.scrollLeft;
    const width = e.target.clientWidth;
    const index = Math.round(scrollLeft / width);

    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  }

  function handleEdit() {
    router.push(`/create?edit=${id}`);
  }

  async function handleDelete() {
    if (!confirm("Вы уверены, что хотите удалить это объявление?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("listings")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Ошибка удаления:", error);
        alert("Не удалось удалить объявление");
        return;
      }

      // Перенаправляем на страницу "Мои объявления"
      router.push("/my");
    } catch (err) {
      console.error("Ошибка:", err);
      alert("Произошла ошибка при удалении");
    }
  }

  const telegramLabel = TELEGRAM_LABEL[lang] || TELEGRAM_LABEL.ru;
  const callLabel = CALL_LABEL[lang] || CALL_LABEL.ru;

  return (
    <div className="w-full flex justify-center mt-3">
      <div className="w-full max-w-[520px] px-3">
        <div className="mb-3">
          <Link
            href="/"
            className="inline-flex items-center px-3 py-1.5 rounded-full border border-black text-xs font-medium bg-white hover:bg-black hover:text-white transition-colors"
          >
            ← Назад
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-3 shadow-sm">
          {loading && <ListingDetailSkeleton />}

          {!loading && !listing && (
            <p className="text-xs text-black/60">Объявление не найдено.</p>
          )}

          {!loading && listing && (
            <>
              {/* ГАЛЕРЕЯ */}
              {imageUrls.length > 0 && (
                <>
                  <div
                    className="w-full flex gap-3 overflow-x-auto pb-2 no-scrollbar"
                    style={{
                      scrollSnapType: "x mandatory",
                      WebkitOverflowScrolling: "touch",
                      msOverflowStyle: "none",
                      scrollbarWidth: "none",
                    }}
                    onScroll={handleScroll}
                  >
                    {imageUrls.map((url, i) => (
                      <div 
                        key={i}
                        className="w-full flex-shrink-0 cursor-pointer bg-gray-50 rounded-2xl overflow-hidden relative h-[300px]"
                        style={{ scrollSnapAlign: "center" }}
                        onClick={() => {
                          setCurrentIndex(i);
                          setIsLightboxOpen(true);
                        }}
                      >
                        <Image
                          src={url}
                          alt={`Фото ${i + 1}`}
                          fill
                          className="object-contain"
                          sizes="(max-width: 768px) 100vw, 520px"
                          placeholder="blur"
                          blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88/7dfwAIuQNS4g0U2AAAAABJRU5ErkJggg=="
                        />
                      </div>
                    ))}
                  </div>

                  {/* Lightbox Modal */}
                  {isLightboxOpen && (
                    <div 
                      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
                      onClick={() => setIsLightboxOpen(false)}
                    >
                      <button 
                        className="absolute top-4 right-4 text-white p-2 z-50"
                        onClick={() => setIsLightboxOpen(false)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      
                      <div className="relative w-full h-full flex items-center justify-center">
                         <div className="relative w-full h-full max-w-4xl max-h-[90vh]">
                           <Image
                            src={imageUrls[currentIndex]}
                            alt="Full size"
                            fill
                            className="object-contain"
                            sizes="100vw"
                            onClick={(e) => e.stopPropagation()} 
                          />
                         </div>
                        
                        {/* Navigation arrows if multiple images */}
                        {imageUrls.length > 1 && (
                          <>
                            <button 
                                className="absolute left-2 text-white p-2 bg-black/20 rounded-full hover:bg-black/40"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
                                }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button 
                                className="absolute right-2 text-white p-2 bg-black/20 rounded-full hover:bg-black/40"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentIndex((prev) => (prev + 1) % imageUrls.length);
                                }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <style jsx>{`
                    .no-scrollbar::-webkit-scrollbar {
                      display: none;
                    }
                  `}</style>

                  {imageUrls.length > 1 && (
                    <div className="flex justify-center gap-2 mt-2 mb-3">
                      {imageUrls.map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full transition-all ${
                            i === currentIndex ? "bg-black" : "bg-black/20"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* КАТЕГОРИЯ */}
              {(() => {
                const category = CATEGORY_DEFS.find((c) => c.key === listing.category_key);
                if (!category) return null;
                const catLabel = category[lang] || category.ru;
                return (
                  <div className="text-xs text-gray-500 mb-1">
                    {category.icon} {catLabel}
                  </div>
                );
              })()}

              {listing.title && (
                <h1 className="text-sm font-semibold mt-1 mb-1">
                  {listing.title}
                </h1>
              )}

              {typeof listing.price === "number" && (
                <div className="flex justify-between items-end mb-1">
                  <p className="text-sm font-semibold">{listing.price} €</p>
                  {listing.views_count !== undefined && (
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      👁️ {listing.views_count}
                    </span>
                  )}
                </div>
              )}

              {listing.description && (
                <p className="text-xs text-black/80 whitespace-pre-wrap mb-2">
                  {listing.description}
                </p>
              )}

              {listing.location_text && (
                <p className="text-xs mt-1 text-black/60">
                  {listing.location_text}
                </p>
              )}

              {/* КОНТАКТ + КНОПКИ (только для НЕ владельцев) */}
              {!isOwner && listing.contacts && listing.contacts !== "EMPTY" && (
                <div className="mt-2">
                  {(() => {
                    // Разбиваем на несколько контактов:
                    // @user
                    // +49123...
                    const raw = String(listing.contacts || "");
                    const parts = raw
                      .split(/[\n,;]+/)
                      .map((c) => c.trim())
                      .filter(Boolean);

                    if (!parts.length) return null;

                    let telegramLink = null;
                    let phoneLink = null;

                    for (const part of parts) {
                      const { isPhone, isTelegram } = detectType(part);
                      const link = buildContactLink(part);
                      if (!link) continue;

                      if (isTelegram && !telegramLink) {
                        telegramLink = link;
                      }
                      if (isPhone && !phoneLink) {
                        phoneLink = link;
                      }
                    }

                    if (!telegramLink && !phoneLink) return null;

                    return (
                      <div className="flex gap-2 mt-3">
                        {telegramLink && (
                          <a
                            href={telegramLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 px-3 py-2 text-xs font-semibold rounded-full bg-black text-white text-center"
                          >
                            {telegramLabel}
                          </a>
                        )}

                        {phoneLink && (
                          <a
                            href={phoneLink}
                            className="flex-1 px-3 py-2 text-xs font-semibold rounded-full bg-black text-white text-center"
                          >
                            {callLabel}
                          </a>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* КНОПКИ РЕДАКТИРОВАНИЯ И УДАЛЕНИЯ (только для владельца) */}
              {isOwner && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={handleEdit}
                    className="flex-1 py-2 px-3 bg-black text-white text-xs font-semibold rounded-full hover:bg-black/80 transition-colors"
                  >
                    Редактировать
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 py-2 px-3 bg-red-600 text-white text-xs font-semibold rounded-full hover:bg-red-700 transition-colors"
                  >
                    Удалить
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
