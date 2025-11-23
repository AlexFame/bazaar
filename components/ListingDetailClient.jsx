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
import SimilarListings from "@/components/SimilarListings";
import BackButton from "@/components/BackButton";

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

export default function ListingDetailClient({ id }) {
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

  const handleShare = async () => {
      if (!listing) return;
      // Ensure we have a valid URL. window.location.href might be internal in some webviews.
      // Better to construct it explicitly if possible, or trust window.location.href
      const url = window.location.href; 
      const shareData = {
          title: listing.title,
          text: `${listing.title} - ${listing.price} €\n${url}`, // Add URL to text for better compatibility
          url: url
      };

      if (navigator.share) {
          try {
              await navigator.share(shareData);
          } catch (err) {
              console.log("Share cancelled");
          }
      } else {
          navigator.clipboard.writeText(url);
          alert("Ссылка скопирована!");
      }
  };


  return (
    <div className="w-full flex justify-center mt-3">
      <div className="w-full max-w-[520px] px-3">
        <div className="mb-3 flex justify-between items-center">
          <BackButton />
          
          <div className="flex items-center gap-3">
            {listing && <ReportButton targetId={listing.id} targetType="listing" />}
            
            {listing && (
                <button 
                    onClick={handleShare}
                    className="inline-flex items-center px-3 py-1.5 rounded-full bg-gray-100 text-xs font-medium hover:bg-gray-200 transition-colors"
                >
                    📤 {t("share")}
                </button>
            )}
          </div>
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
                            onClick={() => setIsLightboxOpen(false)} 
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
                  {listing.title}
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
                              <span className="text-sm font-bold text-black">{listing.profiles.full_name || listing.profiles.tg_username || "Пользователь"}</span>
                              {listing.profiles.is_verified && (
                                  <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                              )}
                          </div>
                          <div className="text-xs text-gray-500">{t("view_profile")}</div>
                      </div>
                  </Link>
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
              {!isOwner && (
                <div className="mt-2">
                  {(() => {
                    // 3. Если нет профиля (старое объявление), пробуем парсить поле contacts
                    // Разбиваем на несколько контактов:
                    // @user
                    // +49123...
                    const raw = String(listing.contacts || "");
                    const parts = raw
                      .split(/[\n,;]+/)
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
                        
                        const { data: { user } } = await supabase.auth.getUser();
                        console.log("User:", user?.id);
                        
                        if (!user) {
                            console.log("No user, redirecting to login");
                            router.push('/login');
                            return;
                        }

                        // Check if conversation exists
                        console.log("Checking existing conversation...");
                        const { data: existingConv, error: fetchError } = await supabase
                            .from('conversations')
                            .select('id')
                            .eq('listing_id', listing.id)
                            .eq('buyer_id', user.id)
                            .eq('seller_id', listing.created_by) 
                            .maybeSingle(); // Use maybeSingle to avoid error on 0 rows
                        
                        console.log("Existing conv:", existingConv);
                        if (fetchError) console.error("Fetch error:", fetchError);

                        if (existingConv) {
                            console.log("Redirecting to existing:", existingConv.id);
                            router.push(`/messages/${existingConv.id}`);
                        } else {
                            // Create new conversation
                            console.log("Creating new conversation...");
                            const { data: newConv, error } = await supabase
                                .from('conversations')
                                .insert({
                                    listing_id: listing.id,
                                    buyer_id: user.id,
                                    seller_id: listing.created_by
                                })
                                .select()
                                .single();
                            
                            if (error) {
                                console.error('Error creating chat:', error);
                                alert('Не удалось начать чат: ' + error.message);
                            } else {
                                console.log("Created new conv:", newConv.id);
                                router.push(`/messages/${newConv.id}`);
                            }
                        }
                    };

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
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
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
              )}

              {/* ПОХОЖИЕ ОБЪЯВЛЕНИЯ */}
              <SimilarListings categoryId={listing.category_key} currentId={listing.id} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
