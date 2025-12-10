"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
// import Link from "next/link"; // Moved to subcomponents
// import Image from "next/image"; // Moved to subcomponents
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useLang } from "@/lib/i18n-client";
import { getTelegramUser } from "@/lib/telegram";
import { ListingDetailSkeleton } from "@/components/SkeletonLoader";
import SimilarListings from "@/components/SimilarListings";
import BackButton from "@/components/BackButton";
import ReportButton from "@/components/ReportButton";
import PremiumServicesModal from "@/components/PremiumServicesModal";
import { translateText } from "@/lib/translation";
import ListingComments from "@/components/ListingComments";
// import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch"; // Moved to ListingGallery
import { trackAnalyticsEvent } from "@/lib/analytics";

// New Components
import ListingGallery from "@/components/listing/ListingGallery";
import ListingInfo from "@/components/listing/ListingInfo";
import SellerCard from "@/components/listing/SellerCard";
import ListingActions from "@/components/listing/ListingActions";
import ListingOffers from "@/components/listing/ListingOffers";

// Helpers moved to subcomponents or unused
// buildContactLink, detectType, formatLastSeen, getSellerActivityStats moved to SellerCard.jsx

export default function ListingDetailClient({ id }) {
  const { t, lang } = useLang();
  const router = useRouter();

  const [listing, setListing] = useState(null);
  const [imageUrls, setImageUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  // currentIndex and isLightboxOpen moved to ListingGallery
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
          try {
            // Filter out placeholder text like "Фото 1", "Фото 2", etc
            const imagePath = String(listingData.image_path).trim();
            const isPlaceholder = imagePath.toLowerCase().includes('фото') || 
                                 imagePath.toLowerCase().includes('photo') ||
                                 imagePath.length < 5;
            
            if (!isPlaceholder) {
              const { data } = supabase.storage
                .from("listing-images")
                .getPublicUrl(imagePath);
              if (data?.publicUrl) urls = [data.publicUrl];
            }
          } catch (e) {
            console.error("Error processing image path:", e);
          }
        }

        setImageUrls(urls);
        // setCurrentIndex(0);

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

        if (currentUserId) {
            console.log("[Ownership Debug] ID Check:", {
                currentUserId,
                listingOwner: listingData.created_by,
                match: currentUserId === listingData.created_by,
                typeUser: typeof currentUserId,
                typeOwner: typeof listingData.created_by
            });
        }

        if (currentUserId && listingData.created_by && String(currentUserId).trim() === String(listingData.created_by).trim()) {
          setIsOwner(true);
        } else {
          setIsOwner(false);
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

  // handleScroll moved to ListingGallery

  function handleEdit() {
    router.push(`/create?edit=${id}`);
  }

  async function handleDelete() {
    if (!confirm(t("confirm_delete") || "Вы уверены, что хотите удалить это объявление?")) {
      return;
    }

    try {
      // Use API for deletion (Secure RLS)
      const tg = window.Telegram?.WebApp;
      const initData = tg?.initData;
      
      const res = await fetch("/api/listings/delete", {
          method: "POST",
          headers: {
              "Content-Type": "application/json"
          },
          body: JSON.stringify({ id, initData })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Delete failed");
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

      // Track share event
      trackAnalyticsEvent(listing.id, 'share');

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
    <div className="w-full min-h-screen bg-gray-50 dark:bg-black flex justify-center py-3 transition-colors duration-300">
      <div className="w-full max-w-[520px] px-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex-shrink-0">
             <BackButton />
          </div>
          
          <div className="flex items-center gap-2">
            {/* Share Button */}
            <button 
              onClick={handleShare}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-100/80 dark:bg-white/10 rounded-full hover:bg-gray-200 dark:hover:bg-white/20 active:scale-95 transition-all text-gray-700 dark:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
              </svg>
              <span className="text-xs font-medium">{t("share")}</span>
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
              {/* ГАЛЕРЕЯ */}
              <ListingGallery 
                  imageUrls={imageUrls} 
                  isFavorite={isFavorite} 
                  onToggleFavorite={handleFavoriteClick} 
              />

              {/* ИНФОРМАЦИЯ О ТОВАРЕ */}
              <ListingInfo listing={listing} translated={translated} />

              {/* ПРОДАВЕЦ */}
              <SellerCard listing={listing} isOwner={isOwner} />
              
              {/* ДЕЙСТВИЯ (ВЛАДЕЛЕЦ) */}
              <ListingActions 
                  isOwner={isOwner}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onPromote={() => setIsPremiumModalOpen(true)}
              />

              {/* OFFERS (OWNER) */}
              {isOwner && <ListingOffers listingId={listing.id} />}

              {/* Q&A Section */}
              <ListingComments listingId={listing.id} ownerId={listing.created_by} />

              {/* ПОХОЖИЕ ОБЪЯВЛЕНИЯ */}
              <SimilarListings categoryId={listing.category_key} currentId={listing.id} title={listing.title} />
            </>
          )}
        </div>
      </div>
    </div>

    {/* Share Fallback Modal (Bottom Sheet) - Portaled */}
    {isShareModalOpen && listing && typeof document !== 'undefined' && createPortal(
      <div 
        className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => setIsShareModalOpen(false)}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div 
          className="bg-white w-full max-w-[500px] rounded-t-3xl p-4 flex flex-col gap-4 shadow-2xl animate-in slide-in-from-bottom duration-300 mb-4 mx-2"
          onClick={e => e.stopPropagation()}
        >
          {/* Handle bar */}
          <div className="w-full flex justify-center mb-1">
            <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
          </div>

          <div className="flex justify-between items-center px-2">
            <h3 className="text-lg font-bold text-gray-900">{t("share")}</h3>
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
              {t("share_copied") || "Копировать ссылку"}
            </button>
          </div>
        </div>
      </div>,
      document.body
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
