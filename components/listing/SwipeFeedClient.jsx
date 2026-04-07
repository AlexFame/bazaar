"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { XMarkIcon, HeartIcon, MapPinIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation";
import { trackProductEvent } from "@/lib/analytics";
import { ListingService } from "@/lib/services/ListingService";
import { useLang } from "@/lib/i18n-client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export default function SwipeFeedClient({ onClose, userLocation }) {
  const { t } = useLang();
  const router = useRouter();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [direction, setDirection] = useState(0);
  
  // Minimal auth check if we need to send likes
  // In a robust implementation, the API route handles Telegram Auth via initData
  const [tgInitData, setTgInitData] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      setTgInitData(window.Telegram.WebApp.initData);
    }
    trackProductEvent("swipe_open", { source: "feed" });
    fetchCards(0);
  }, []);

  const fetchCards = async (pageIdx) => {
    try {
      if (pageIdx === 0) setLoading(true);
      const data = await ListingService.search({
        swipeMode: true, // Custom flag to trigger distance sorting and strict "services" filter
        userLocation: userLocation,
        page: pageIdx,
        pageSize: 15,
        categoryFilter: 'business' // explicitly force services/business
      });
      
      // Filter out seen/skipped IDs from sessionStorage if needed
      const seenRaw = sessionStorage.getItem("swipe_seen_ids") || "[]";
      const seen = JSON.parse(seenRaw);
      
      const novel = data.filter(d => !seen.includes(d.id));

      if (novel.length < 15) setHasMore(false);
      
      setCards(prev => [...prev, ...novel].reverse()); // reverse so first item is at top of stack (last in array)
      setPage(pageIdx);
    } catch (e) {
      console.error(e);
      toast.error(t("swipe_error") || "Error loading services");
    } finally {
      setLoading(false);
    }
  };

  const markSeen = (id) => {
    const seenRaw = sessionStorage.getItem("swipe_seen_ids") || "[]";
    const seen = JSON.parse(seenRaw);
    if (!seen.includes(id)) {
        seen.push(id);
        sessionStorage.setItem("swipe_seen_ids", JSON.stringify(seen));
    }
  };

  const handleLike = async (listing) => {
    trackProductEvent("swipe_like", { listingId: listing.id });
    markSeen(listing.id);
    toast.success(t("swipe_liked_notice") || "Специалист получит уведомление! 💌", { duration: 2000 });
    
    if (!tgInitData) return;

    // Fire API to notify seller and add to favorites
    try {
      await fetch("/api/swipe-like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          initData: tgInitData,
          action: "like"
        })
      });
    } catch (e) {
      console.error("Like error", e);
    }
  };

  const handleFavorite = async (listing) => {
    trackProductEvent("swipe_favorite", { listingId: listing.id });
    markSeen(listing.id);
    toast.success(t("swipe_favorited") || "Добавлено в Избранное ⭐️", { duration: 1500 });
    
    if (!tgInitData) return;

    try {
      await fetch("/api/swipe-like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          initData: tgInitData,
          action: "favorite"
        })
      });
    } catch (e) {
      console.error("Favorite error", e);
    }
  };

  const handleDragEnd = (event, info, idx, listing) => {
    const distanceThreshold = 110;
    const flickVelocityThreshold = 650;
    const upThreshold = 80;
    const minFlickOffset = 35;
    const ox = info.offset.x;
    const oy = info.offset.y;
    const vx = info.velocity.x;
    const vy = info.velocity.y;

    const isDominantlyVertical = Math.abs(oy) > Math.abs(ox);

    const isUpSwipe = isDominantlyVertical && (oy < -upThreshold || (oy < -minFlickOffset && vy < -flickVelocityThreshold));
    const isRightSwipe = !isDominantlyVertical && (ox > distanceThreshold || (ox > minFlickOffset && vx > flickVelocityThreshold));
    const isLeftSwipe = !isDominantlyVertical && (ox < -distanceThreshold || (ox < -minFlickOffset && vx < -flickVelocityThreshold));

    if (isUpSwipe) {
      // Swiped Up! Add to favorites
      setDirection(-2);
      handleFavorite(listing);
      popCard(idx);
    } else if (isRightSwipe) {
      // Swiped Right! (Like)
      setDirection(1);
      handleLike(listing);
      popCard(idx);
    } else if (isLeftSwipe) {
      // Swiped Left! (Hide)
      trackProductEvent("swipe_skip", { listingId: listing.id });
      setDirection(-1);
      markSeen(listing.id);
      popCard(idx);
    }
  };

  const popCard = (idx) => {
    setCards(prev => {
        const newCards = [...prev];
        newCards.splice(idx, 1);
        
        // Fetch more if almost empty
        if (newCards.length < 5 && hasMore) {
            fetchCards(page + 1);
        }
        return newCards;
    });
  };

  const openListing = (listingId) => {
    trackProductEvent("swipe_open_listing", { listingId });
    router.push(`/listing/${listingId}?from=swipe`);
  };

  return (
    <div className="fixed inset-0 z-[10001] bg-neutral-900">
      <motion.div 
          className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          onClick={(e) => {
             if (e.target === e.currentTarget) onClose();
          }}
      >
      
      {/* Header */}
      <div className="absolute top-0 w-full p-4 flex justify-between items-center z-50">
        <button 
            onClick={onClose}
            className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/20"
        >
            <XMarkIcon className="w-6 h-6" />
        </button>
        <div className="font-black italic text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
            {t("discover_word") || "NEARBY"}
        </div>
        <div className="w-10 h-10"></div> {/* Placeholder for centering */}
      </div>

      {loading && cards.length === 0 ? (
          <div className="text-white animate-pulse">{t("swipe_loading") || "Загружаем мастеров поблизости..."}</div>
      ) : cards.length === 0 ? (
          <div className="text-center p-8 bg-white/5 rounded-2xl">
              <div className="text-4xl mb-4">🤷‍♂️</div>
              <h3 className="text-white font-bold text-lg">{t("swipe_empty_title") || "Вы просмотрели всех!"}</h3>
              <p className="text-gray-400 text-sm mt-2 mb-6">{t("swipe_empty_desc") || "В вашем районе больше нет услуг. Загляните позже."}</p>
              <button 
                onClick={onClose}
                className="bg-purple-600 text-white px-6 py-2 rounded-full font-bold"
              >
                  {t("swipe_back") || "Вернуться"}
              </button>
          </div>
      ) : (
          <div className="relative w-full max-w-sm h-[60vh] md:h-[70vh] flex items-center justify-center perspective-1000">
              <AnimatePresence>
                  {cards.map((listing, idx) => {
                      const isTop = idx === cards.length - 1;
                      if (idx < cards.length - 3) return null; // only render top 3 for perf

                      return (
                          <SwipeCard 
                              key={listing.id}
                              listing={listing}
                              idx={idx}
                              totalCards={cards.length}
                              direction={direction}
                              isTop={isTop}
                              handleDragEnd={handleDragEnd}
                              openListing={openListing}
                              t={t}
                          />
                      );
                  })}
              </AnimatePresence>
          </div>
      )}

      {/* Footer Controls */}
      <div
          className="absolute flex flex-col items-center z-50 w-full"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 2rem)" }}
      >
          <div className="flex items-center gap-6 justify-center">
              <button 
                  onClick={() => {
                      setDirection(-1);
                      if(cards.length) {
                          trackProductEvent("swipe_skip", { listingId: cards[cards.length-1].id });
                          markSeen(cards[cards.length-1].id);
                          popCard(cards.length-1);
                      }
                  }}
                  className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/5 active:scale-90 transition-transform"
              >
                  <XMarkIcon className="w-8 h-8 text-red-500" />
              </button>

              <button 
                  onClick={() => {
                      setDirection(1);
                      if(cards.length) {
                          handleLike(cards[cards.length-1]);
                          popCard(cards.length-1);
                      }
                  }}
                  className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center shadow-lg shadow-pink-500/20 active:scale-90 transition-transform"
              >
                  <HeartIcon className="w-8 h-8 text-white" />
              </button>
          </div>
          <p className="text-gray-400 text-xs text-center w-3/4 max-w-xs mt-3 px-2 font-medium">
              {t("swipe_like_hint") || "Лайк — это сигнал специалисту написать вам в ЛС"}
          </p>
      </div>

    </motion.div>
    </div>
  );
}

function SwipeCard({ listing, idx, totalCards, direction, isTop, handleDragEnd, openListing, t }) {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const canOpenOnTapRef = useRef(true);
    // A slightly stronger tilt keeps the gesture feeling closer to Tinder.
    const rotate = useTransform(x, [-180, 180], [-18, 18]);

    const opacityLike = useTransform(() => {
        if (!isTop) return 0;
        const currentX = x.get();
        const currentY = y.get();
        if (Math.abs(currentX) < 15) return 0;
        if (Math.abs(currentY) >= Math.abs(currentX)) return 0;
        if (currentX <= 0) return 0;
        return Math.min((currentX - 15) / 60, 1);
    });

    const opacitySkip = useTransform(() => {
        if (!isTop) return 0;
        const currentX = x.get();
        const currentY = y.get();
        if (Math.abs(currentX) < 15) return 0;
        if (Math.abs(currentY) >= Math.abs(currentX)) return 0;
        if (currentX >= 0) return 0;
        return Math.min((Math.abs(currentX) - 15) / 60, 1);
    });

    const opacityFav = useTransform(() => {
        if (!isTop) return 0;
        const currentX = x.get();
        const currentY = y.get();
        if (Math.abs(currentY) < 15) return 0;
        if (currentY >= 0) return 0;
        if (Math.abs(currentX) > Math.abs(currentY)) return 0;
        return Math.min((Math.abs(currentY) - 15) / 60, 1);
    });

    return (
        <motion.div
            style={{ 
                zIndex: idx, 
                x: isTop ? x : 0, 
                y: isTop ? y : undefined,
                rotate: isTop ? rotate : 0 
            }}
            className="absolute w-[90%] h-full rounded-3xl bg-neutral-800 shadow-2xl overflow-hidden border border-white/10 will-change-transform"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ 
                scale: isTop ? 1 : 1 - (totalCards - 1 - idx) * 0.05, 
                y: isTop ? 0 : (totalCards - 1 - idx) * 15,
                opacity: 1
            }}
            exit={{ 
                x: direction === -2 ? 0 : (direction === 1 ? 300 : -300), 
                y: direction === -2 ? -500 : 0,
                opacity: 0, 
                scale: 0.8,
                rotate: direction === -2 ? 0 : (direction === 1 ? 25 : -25)
            }}
            transition={{ duration: 0.3 }}
            drag={isTop}
            dragElastic={0.18}
            dragMomentum={false}
            dragSnapToOrigin
            whileDrag={{ scale: 1.02 }}
            onPointerDown={() => {
                canOpenOnTapRef.current = true;
            }}
            onDragStart={() => {
                canOpenOnTapRef.current = false;
            }}
            onTap={() => {
                if (isTop && canOpenOnTapRef.current) {
                    openListing(listing.id);
                }
            }}
            onDragEnd={(e, info) => handleDragEnd(e, info, idx, listing)}
        >
            {/* Image Background */}
            <div className="relative w-full h-[65%] bg-black">
                {listing.main_image_path ? (
                    <img 
                        src={listing.main_image_path.startsWith('http') ? listing.main_image_path : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-images/${listing.main_image_path}`} 
                        className="w-full h-full object-cover"
                        alt={listing.title}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl">🛠️</div>
                )}
                
                {/* Gradient overlay */}
                <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-neutral-800 to-transparent flex flex-col justify-end p-4 pointer-events-none">
                    {/* Sliding Right -> Like */}
                    <motion.div 
                        className="absolute left-4 top-4 border-4 border-green-500 text-green-500 font-black text-4xl rounded-xl px-4 py-1 -rotate-12"
                        style={{ opacity: opacityLike }}
                    >
                        {t("swipe_like_tag") || "ЛАЙК"}
                    </motion.div>
                    {/* Sliding Left -> Skip */}
                    <motion.div 
                        className="absolute right-4 top-4 border-4 border-red-500 text-red-500 font-black text-4xl rounded-xl px-4 py-1 rotate-12"
                        style={{ opacity: opacitySkip }}
                    >
                        {t("swipe_skip_tag") || "СКРЫТЬ"}
                    </motion.div>
                    {/* Sliding Up -> Favorite */}
                    <motion.div 
                        className="absolute bottom-12 left-1/2 -translate-x-1/2 border-4 border-blue-500 text-blue-500 font-black text-2xl rounded-xl px-4 py-1"
                        style={{ opacity: opacityFav }}
                    >
                        {t("swipe_favorited_tag") || "В ИЗБРАННОЕ"}
                    </motion.div>
                </div>
                
                {/* Distance Badge */}
                {listing.distance_km !== undefined && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1">
                      <MapPinIcon className="w-3 h-3" />
                      {listing.distance_km < 1 ? `${Math.round(listing.distance_km * 1000)} м` : `${listing.distance_km.toFixed(1)} км`}
                  </div>
                )}
            </div>

            {/* Card Content */}
            <div className="p-5 flex flex-col justify-between h-[35%] bg-neutral-800 text-white">
                <div>
                    <h2 className="text-xl font-bold line-clamp-1">{listing.title}</h2>
                    <p className="text-pink-400 font-bold mt-1 text-lg">
                        {listing.price ? `${listing.price} ${listing.currency || '€'}` : (t("swipe_negotiable") || "Договорная")}
                    </p>
                </div>
                
                <div className="flex items-center gap-3 mt-4 min-h-8">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-white/20 shrink-0">
                        {listing.profiles?.avatar_url && (
                            <img src={listing.profiles.avatar_url} className="w-full h-full object-cover" />
                        )}
                    </div>
                    <div className="text-sm text-gray-300 font-medium line-clamp-1">
                        {t("swipe_master") || "Мастер"}: {listing.profiles?.first_name || "Аноним"}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
