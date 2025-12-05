"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useLang } from "@/lib/i18n-client";
import { CATEGORY_DEFS } from "@/lib/categories";
import { getTelegramUser } from "@/lib/telegram";
import { ListingDetailSkeleton } from "@/components/SkeletonLoader";
import SimilarListings from "@/components/SimilarListings";
import BackButton from "@/components/BackButton";
import ReportButton from "@/components/ReportButton";
import PremiumServicesModal from "@/components/PremiumServicesModal";
import { translateText } from "@/lib/translation";
import ListingComments from "@/components/ListingComments";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { trackAnalyticsEvent } from "@/lib/analytics";

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

function formatLastSeen(lastSeen, lang) {
  if (!lastSeen) return null;
  const date = new Date(lastSeen);
  const now = new Date();
  const diffMinutes = Math.floor((now - date) / 60000);

  if (diffMinutes < 5) return lang === 'en' ? 'Online' : 'Онлайн';
  if (diffMinutes < 60) return lang === 'en' ? `Was online ${diffMinutes}m ago` : `Был(а) ${diffMinutes} мин. назад`;
  if (diffMinutes < 24 * 60) {
      const hours = Math.floor(diffMinutes / 60);
      return lang === 'en' ? `Was online ${hours}h ago` : `Был(а) ${hours} ч. назад`;
  }
  return null; // Too old to show
}

function getSellerActivityStats(lastSeen, lang) {
    if (!lastSeen) return null;
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / 60000);

    // Logic for "Very Active" / "Replies Fast"
    // If online in last 15 min -> Very Active
    // If online in last 2 hours -> Replies fast
    
    if (diffMinutes < 15) {
        return {
            label: lang === 'en' ? 'Very active' : 'Очень активен',
            sub: lang === 'en' ? 'Replies in ~5 min' : 'Отвечает за ~5 мин',
            color: 'text-green-600 bg-green-50'
        };
    }
    
    if (diffMinutes < 120) {
        return {
            label: lang === 'en' ? 'Usually replies fast' : 'Обычно отвечает быстро',
            sub: lang === 'en' ? 'Replies in ~30 min' : 'Отвечает за ~30 мин',
            color: 'text-blue-600 bg-blue-50'
        };
    }

    return null;
}

export default function ListingDetailClient({ id }) {
  const { t, lang } = useLang();
  const router = useRouter();

  const [listing, setListing] = useState(null);
  const [imageUrls, setImageUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  
  // Refs for smart tap handling
  const lastTapRef = useRef(0);
  const tapTimeoutRef = useRef(null);
  
  // Translation state
  const [translated, setTranslated] = useState({ title: "", description: "" });
  const [isFavorite, setIsFavorite] = useState(false);
  const [profileId, setProfileId] = useState(null);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);

  // Load favorite status
  useEffect(() => {
    if (!id) return;

    async function loadFavoriteStatus() {
      let profileIdToUse = null;

      // 1. Try Telegram User
      if (typeof getTelegramUser === 'function') {
        const tgUser = getTelegramUser();
        if (tgUser?.id) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("id")
            .eq("tg_user_id", tgUser.id)
            .maybeSingle();
          if (profileData) profileIdToUse = profileData.id;
        }
      }

      // 2. Fallback to Supabase Auth
      if (!profileIdToUse) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) profileIdToUse = user.id;
      }

      if (!profileIdToUse) return;
      setProfileId(profileIdToUse);

      try {
        const { data: favoriteData } = await supabase
          .from("favorites")
          .select("id")
          .eq("profile_id", profileIdToUse)
          .eq("listing_id", id)
          .maybeSingle();

        setIsFavorite(!!favoriteData);
      } catch (e) {
        console.error("Error loading favorite status:", e);
      }
    }

    loadFavoriteStatus();
  }, [id]);

  const handleFavoriteClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!profileId) {
        alert(t("login_to_fav") || "Пожалуйста, войдите через Telegram, чтобы добавлять в избранное");
        return;
    }

    try {
      if (isFavorite) {
        // Remove from favorites
        await supabase
          .from("favorites")
          .delete()
          .eq("profile_id", profileId)
          .eq("listing_id", id);
        setIsFavorite(false);
      } else {
        // Add to favorites
        await supabase
          .from("favorites")
          .insert({
            profile_id: profileId,
            listing_id: id,
          });
        setIsFavorite(true);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  useEffect(() => {
    // Force scroll to top when component mounts or ID changes
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    if (!id) return;

    async function loadListing() {
      setLoading(true);
      try {
        const { data: listingData, error: listingError } = await supabase
          .from("listings")
          .select("*, profiles:created_by(*)")
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
          // Filter out placeholder text like "Фото 1", "Фото 2", etc
          const imagePath = listingData.image_path.trim();
          const isPlaceholder = imagePath.toLowerCase().includes('фото') || 
                               imagePath.toLowerCase().includes('photo') ||
                               imagePath.length < 5;
          
          if (!isPlaceholder) {
            const { data } = supabase.storage
              .from("listing-images")
              .getPublicUrl(listingData.image_path);
            if (data?.publicUrl) urls = [data.publicUrl];
          }
        }

        setImageUrls(urls);
        setCurrentIndex(0);

        // Проверяем, является ли текущий пользователь владельцем объявления
        // Check owner
        let currentUserId = null;
        if (typeof getTelegramUser === 'function') {
          const tgUser = getTelegramUser();
          if (tgUser?.id) {
             const { data: profile } = await supabase
              .from("profiles")
              .select("id")
              .eq("tg_user_id", tgUser.id)
              .maybeSingle();
             if (profile) currentUserId = profile.id;
          }
        }

        if (!currentUserId) {
           const { data: { user } } = await supabase.auth.getUser();
           if (user) currentUserId = user.id;
        }

        if (currentUserId && listingData.created_by === currentUserId) {
          setIsOwner(true);
        }
      } catch (err) {
        console.error("Ошибка:", err);
      } finally {
        setLoading(false);
      }
    }

    loadListing();

    // Save to recently viewed
    try {
        const viewed = JSON.parse(localStorage.getItem("recently_viewed") || "[]");
        // Remove current id if exists to move it to top
        const filtered = viewed.filter(v => v !== id);
        // Add to front and limit to 10
        const newViewed = [id, ...filtered].slice(0, 10);
        localStorage.setItem("recently_viewed", JSON.stringify(newViewed));
    } catch (e) {
        console.error("Error saving recently viewed:", e);
    }

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

  // Auto-translation effect
  useEffect(() => {
    if (!listing) return;

    let isMounted = true;
    
    async function doTranslate() {
      console.log("🌍 Starting translation...", { lang, title: listing.title });
      
      const tTitle = await translateText(listing.title, lang);
      const tDesc = await translateText(listing.description, lang);
      
      console.log("✅ Translation complete:", { tTitle, tDesc });
      
      if (isMounted) {
        setTranslated({
            title: tTitle,
            description: tDesc
        });
      }
    }

    doTranslate();

    return () => { isMounted = false; };
  }, [listing, lang]);

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
    if (!confirm(t("confirm_delete") || "Вы уверены, что хотите удалить это объявление?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("listings")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Ошибка удаления:", error);
        alert(t("delete_error") || "Не удалось удалить объявление");
        return;
      }

      // Перенаправляем на страницу "Мои объявления"
      router.push("/my");
    } catch (err) {
      console.error("Ошибка:", err);
      alert("Произошла ошибка при удалении");
    }
  }

  const handleShare = async () => {
      if (!listing) return;
      
      const url = window.location.href; 
      const shareData = {
          title: listing.title,
          text: `${listing.title} - ${listing.price} €${url}`,
          url: url
      };

      try {
          // Detect iOS (iPhone/iPad)
          const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

          // 1. Try to share with image (Only on iOS where it works reliably)
          // On Android and Desktop (Mac), file sharing often hides "Copy Link" or breaks the menu
          if (isIOS && imageUrls && imageUrls.length > 0 && navigator.canShare) {
             try {
                 const response = await fetch(imageUrls[0]);
                 const blob = await response.blob();
                 const file = new File([blob], "listing.jpg", { type: blob.type });
                 
                 const shareDataWithImage = {
                     files: [file],
                     title: listing.title,
                     text: `${listing.title} - ${listing.price} €${url}`
                 };
                 
                 if (navigator.canShare(shareDataWithImage)) {
                     await navigator.share(shareDataWithImage);
                     return; // Success
                 }
             } catch (e) {
                 // Ignore image share error, fall back to text share
                 if (e.name !== 'AbortError') {
                    console.warn("Failed to share image, falling back to text:", e);
                 } else {
                    return; // User cancelled
                 }
             }
          }

          // 2. Fallback: Share text only
          if (navigator.share) {
              await navigator.share(shareData);
          } else {
              throw new Error("Share API not supported");
          }
      } catch (err) {
          // If user cancelled, do nothing
          if (err.name === 'AbortError') return;

          console.log("Share failed, opening fallback modal:", err);
          setIsShareModalOpen(true);
      }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert(t("link_copied") || "Ссылка скопирована!");
      setIsShareModalOpen(false);
    } catch (err) {
      console.error("Clipboard failed:", err);
    }
  };


  return (
    <>
    <div className="w-full flex justify-center mt-3">
      <div className="w-full max-w-[520px] px-3">
        <div className="mb-3 flex items-center gap-3">
          <BackButton />
          
          <div className="flex gap-2">
            {/* Share Button */}
            <button 
              onClick={handleShare}
              className="flex items-center justify-center gap-2 px-3 py-1.5 bg-[#F2F3F7] rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              <span>📤</span>
              <span>{t("share")}</span>
            </button>
            
            {/* Report Button */}
            {listing && <ReportButton targetId={listing.id} targetType="listing" />}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3 shadow-sm">
          {loading && <ListingDetailSkeleton />}

          {!loading && !listing && (
            <p className="text-xs text-black/60">{t("listing_not_found") || "Объявление не найдено."}</p>
          )}

          {!loading && listing && (
            <>
              {/* ГАЛЕРЕЯ ИЛИ PLACEHOLDER */}
              {imageUrls.length > 0 ? (
                <>
                  <div className="relative">
                    <button
                      onClick={handleFavoriteClick}
                      className="absolute top-3 right-3 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:scale-110 transition-transform"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill={isFavorite ? "#ef4444" : "none"}
                        stroke={isFavorite ? "#ef4444" : "currentColor"}
                        strokeWidth="2"
                        className="w-5 h-5 text-black"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                      </svg>
                    </button>

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
                            alt=""
                            fill
                            className="object-contain"
                            sizes="(max-width: 768px) 100vw, 520px"
                            placeholder="blur"
                            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88/7dfwAIuQNS4g0U2AAAAABJRU5ErkJggg=="
                          />
                        </div>
                      ))}
                    </div>
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
                      
                      <div 
                        className="relative w-full h-full flex items-center justify-center"
                      >
                        <TransformWrapper
                          initialScale={1}
                          minScale={1}
                          maxScale={4}
                          centerOnInit
                          doubleClick={{ disabled: false, mode: "toggle" }}
                          pinch={{ disabled: true }}
                        >
                          {({ zoomIn, zoomOut, resetTransform, state, ...rest }) => (
                            <TransformComponent
                              wrapperClass="!w-full !h-full flex items-center justify-center"
                              contentClass="!w-full !h-full flex items-center justify-center"
                            >
                              <div 
                                className="relative w-full h-full max-w-4xl max-h-[90vh] flex items-center justify-center"
                                onClick={(e) => {
                                  // Close modal on single tap only if not zoomed
                                  if (state.scale === 1) {
                                    e.stopPropagation();
                                    setIsLightboxOpen(false);
                                  }
                                }}
                              >
                                <Image
                                  src={imageUrls[currentIndex]}
                                  alt="Full size"
                                  fill
                                  className="object-contain"
                                  sizes="100vw"
                                />
                              </div>
                            </TransformComponent>
                          )}
                        </TransformWrapper>
                        
                        {/* Navigation arrows if multiple images */}
                        {imageUrls.length > 1 && (
                          <>
                            <button 
                                className="absolute left-2 text-white p-2 bg-black/20 rounded-full hover:bg-black/40 z-10"
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
                                className="absolute right-2 text-white p-2 bg-black/20 rounded-full hover:bg-black/40 z-10"
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
              ) : (
                /* No photos - show SVG placeholder */
                <div className="relative mb-3">
                  <button
                    onClick={handleFavoriteClick}
                    className="absolute top-3 right-3 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:scale-110 transition-transform"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill={isFavorite ? "#ef4444" : "none"}
                      stroke={isFavorite ? "#ef4444" : "currentColor"}
                      strokeWidth="2"
                      className="w-5 h-5 text-black"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                    </svg>
                  </button>
                  
                  <div className="w-full bg-gray-100 rounded-2xl overflow-hidden relative h-[300px] flex items-center justify-center">
                    <svg
                      className="w-16 h-16 text-gray-300"
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
                </div>
              )}


              {/* КАТЕГОРИЯ И ИЕРАРХИЯ */}
              {(() => {
                const category = CATEGORY_DEFS.find((c) => c.key === listing.category_key);
                if (!category) return null;
                const catLabel = category[lang] || category.ru;
                
                // Пробуем найти подкатегорию (subtype)
                let subtypeLabel = null;
                if (listing.parameters && listing.parameters.subtype) {
                    const subtypeFilter = category.filters.find(f => f.key === 'subtype');
                    if (subtypeFilter && subtypeFilter.options) {
                        const opt = subtypeFilter.options.find(o => o.value === listing.parameters.subtype);
                        if (opt) subtypeLabel = opt.label[lang] || opt.label.ru;
                    }
                }

                return (
                  <div className="flex flex-wrap items-center gap-1 text-xs text-gray-500 mb-1">
                    <Link href={`/?category=${category.key}`} className="hover:text-black hover:underline flex items-center gap-1">
                        {category.icon} {catLabel}
                    </Link>
                    {subtypeLabel && (
                        <>
                            <span>›</span>
                            <Link 
                                href={`/?category=${category.key}&dyn_subtype=${listing.parameters.subtype}`}
                                className="hover:text-black hover:underline"
                            >
                                {subtypeLabel}
                            </Link>
                        </>
                    )}
                  </div>
                );
              })()}

              {listing.title && (
                <h1 className="text-sm font-semibold mt-1 mb-1">
                  {translated.title || listing.title}
                </h1>
              )}

              {typeof listing.price === "number" && (
                <div className="flex justify-between items-end mb-4">
                  <p className="text-sm font-semibold">{listing.price} €</p>
                  {listing.views_count !== undefined && (
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      👁️ {listing.views_count}
                    </span>
                  )}
                </div>
              )}

              {/* ПРОДАВЕЦ */}
              {listing.profiles && (
                  <Link href={`/profile/${listing.profiles.id}`} className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors no-underline">
                      <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden relative border border-gray-200">
                          {listing.profiles.avatar_url ? (
                              <Image src={listing.profiles.avatar_url} alt="Avatar" fill className="object-cover" />
                          ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">
                                  {(listing.profiles.full_name || listing.profiles.tg_username || "U")[0].toUpperCase()}
                              </div>
                          )}
                      </div>
                      <div>
                          <div className="flex items-center gap-1">
                              <span className="text-sm font-bold text-black">{listing.profiles.full_name || listing.profiles.tg_username || (t("user_default") || "Пользователь")}</span>
                              {listing.profiles.is_verified && (
                                  <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                              )}
                          </div>
                          <div className="text-xs text-gray-500">{t("view_profile")}</div>
                          {listing.profiles.last_seen && (
                              <div className="text-[10px] text-green-600 font-medium mt-0.5">
                                  {formatLastSeen(listing.profiles.last_seen, lang)}
                              </div>
                          )}
                          
                          {/* Seller Activity Stats */}
                          {(() => {
                              const stats = getSellerActivityStats(listing.profiles.last_seen, lang);
                              if (!stats) return null;
                              return (
                                  <div className={`text-[10px] px-1.5 py-0.5 rounded-md inline-block mt-1 ${stats.color}`}>
                                      <span className="font-bold">{stats.label}</span> • {stats.sub}
                                  </div>
                              );
                          })()}
                      </div>
                  </Link>
              )}

              {listing.description && (
                <p className="text-xs text-black/80 whitespace-pre-wrap mb-2">
                  {translated.description || listing.description}
                </p>
              )}

              {listing.location_text && (
                <p className="text-xs mt-1 text-black/60">
                  {listing.location_text}
                </p>
              )}

              {/* КОНТАКТ + КНОПКИ (только для НЕ владельцев) */}
              {!isOwner && (
                <div className="mt-2">
                  {(() => {
                    // 3. Если нет профиля (старое объявление), пробуем парсить поле contacts
                    // Разбиваем на несколько контактов:
                    // @user
                    // +49123...
                    const raw = String(listing.contacts || "");
                    const parts = raw
                      .split(/[,;]+/)
                      .map((c) => c.trim())
                      .filter(Boolean);

                    let phoneLink = null;

                    for (const part of parts) {
                      const { isPhone } = detectType(part);
                      const link = buildContactLink(part);
                      if (!link) continue;

                      if (isPhone && !phoneLink) {
                        phoneLink = link;
                      }
                    }

                    const handleWriteToSeller = async (e) => {
                        e.preventDefault();
                        console.log("Starting handleWriteToSeller...");
                        
                        // Track message click
                        trackAnalyticsEvent(listing.id, 'message_click');
                        
                        const { data: { user } } = await supabase.auth.getUser();
                        console.log("User:", user?.id);
                        
                        if (!user) {
                            console.log("No user, redirecting to login");
                            router.push('/login');
                            return;
                        }
                        // Redirect to chat page with listing and seller info
                        // Conversation will be created when first message is sent
                        router.push(`/messages/new?listing_id=${listing.id}&seller_id=${listing.created_by}`);                    };

                    return (
                      <div className="flex gap-2 mt-3">
                        {/* Internal Chat Button */}
                        <button
                            onClick={handleWriteToSeller}
                            className="flex-1 px-3 py-2 text-xs font-semibold rounded-full bg-black text-white text-center hover:bg-gray-800 transition-colors"
                        >
                            {t("write_msg")}
                        </button>

                        {phoneLink && (
                          <a
                            href={phoneLink}
                            onClick={() => trackAnalyticsEvent(listing.id, 'contact_click', { contact_type: 'phone' })}
                            className="flex-1 px-3 py-2 text-xs font-semibold rounded-full bg-white border border-black text-black text-center hover:bg-gray-50 transition-colors"
                          >
                            {t("msg_call")}
                          </a>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* КНОПКИ РЕДАКТИРОВАНИЯ И УДАЛЕНИЯ (только для владельца) */}
              {isOwner && (
                <>
                  {/* Promote button */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => setIsPremiumModalOpen(true)}
                      className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                      <span>🚀</span>
                      <span>{t("premium_services_title")}</span>
                    </button>
                  </div>
                  
                  {/* Edit/Delete buttons */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleEdit}
                      className="flex-1 py-2 px-3 bg-black text-white text-xs font-semibold rounded-full hover:bg-black/80 transition-colors"
                    >
                      {t("edit")}
                    </button>
                    <button
                      onClick={handleDelete}
                      className="flex-1 py-2 px-3 bg-red-600 text-white text-xs font-semibold rounded-full hover:bg-red-700 transition-colors"
                    >
                      {t("delete")}
                    </button>
                  </div>
                </>
              )}

              {/* Q&A Section */}
              <ListingComments listingId={listing.id} ownerId={listing.created_by} />

              {/* ПОХОЖИЕ ОБЪЯВЛЕНИЯ */}
              <SimilarListings categoryId={listing.category_key} currentId={listing.id} />
            </>
          )}
        </div>
      </div>
    </div>

    {/* Share Fallback Modal (Bottom Sheet) */}
    {isShareModalOpen && listing && (
      <div 
        className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => setIsShareModalOpen(false)}
      >
        <div 
          className="bg-white w-full max-w-[500px] rounded-t-3xl p-4 flex flex-col gap-4 shadow-2xl animate-in slide-in-from-bottom duration-300 pb-[calc(env(safe-area-inset-bottom)+20px)]"
          onClick={e => e.stopPropagation()}
        >
          {/* Handle bar */}
          <div className="w-full flex justify-center mb-1">
            <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
          </div>

          <div className="flex justify-between items-center px-2">
            <h3 className="text-lg font-bold text-gray-900">{t.share}</h3>
            <button onClick={() => setIsShareModalOpen(false)} className="p-1.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <a 
              href={`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(listing.title + ' - ' + listing.price + ' €')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 w-full p-3 rounded-xl bg-[#2AABEE]/10 text-[#2AABEE] font-semibold text-base hover:bg-[#2AABEE]/20 transition-colors active:scale-[0.98]"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 11.944 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              Telegram
            </a>

            <a 
              href={`https://wa.me/?text=${encodeURIComponent(listing.title + ' - ' + listing.price + ' €' + window.location.href)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 w-full p-3 rounded-xl bg-[#25D366]/10 text-[#25D366] font-semibold text-base hover:bg-[#25D366]/20 transition-colors active:scale-[0.98]"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              WhatsApp
            </a>

            <button 
              onClick={copyToClipboard}
              className="flex items-center gap-3 w-full p-3 rounded-xl bg-gray-100 text-gray-800 font-semibold text-base hover:bg-gray-200 transition-colors active:scale-[0.98]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5" />
              </svg>
              {t.share_copied || "Копировать ссылку"}
            </button>
          </div>
        </div>
      </div>
    )}
    
    {/* Premium Services Modal */}
    <PremiumServicesModal
      listingId={id}
      isOpen={isPremiumModalOpen}
      onClose={() => setIsPremiumModalOpen(false)}
    />
    </>
  );
}
