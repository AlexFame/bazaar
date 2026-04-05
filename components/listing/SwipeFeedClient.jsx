"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { XMarkIcon, HeartIcon, MapPinIcon } from "@heroicons/react/24/solid";
import { ListingService } from "@/lib/services/ListingService";
import { useLang } from "@/lib/i18n-client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export default function SwipeFeedClient({ onClose, userLocation }) {
  const { t } = useLang();
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
      toast.error("Error loading services");
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
    markSeen(listing.id);
    toast.success("Добавлено в избранное! 🔥", { duration: 1500 });
    
    if (!tgInitData) return; // If web only, skip backend notification

    // Fire API to notify seller and add to favorites
    try {
      await fetch("/api/swipe-like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          initData: tgInitData,
        })
      });
    } catch (e) {
      console.error("Like error", e);
    }
  };

  const handleDragEnd = (event, info, idx, listing) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      // Swiped Right!
      setDirection(1);
      handleLike(listing);
      popCard(idx);
    } else if (info.offset.x < -threshold) {
      // Swiped Left!
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

  return (
    <div className="fixed inset-0 z-[999] bg-neutral-900">
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
            DISCOVER
        </div>
        <div className="w-10 h-10"></div> {/* Placeholder for centering */}
      </div>

      {loading && cards.length === 0 ? (
          <div className="text-white animate-pulse">Загружаем мастеров поблизости...</div>
      ) : cards.length === 0 ? (
          <div className="text-center p-8 bg-white/5 rounded-2xl">
              <div className="text-4xl mb-4">🤷‍♂️</div>
              <h3 className="text-white font-bold text-lg">Вы просмотрели всех!</h3>
              <p className="text-gray-400 text-sm mt-2 mb-6">В вашем районе больше нет услуг. Загляните позже.</p>
              <button 
                onClick={onClose}
                className="bg-purple-600 text-white px-6 py-2 rounded-full font-bold"
              >
                  Вернуться
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
                          />
                      );
                  })}
              </AnimatePresence>
          </div>
      )}

      {/* Footer Controls */}
      <div className="absolute bottom-8 flex gap-8 z-50">
          <button 
              onClick={() => {
                  setDirection(-1);
                  if(cards.length) {
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

    </motion.div>
    </div>
  );
}

function SwipeCard({ listing, idx, totalCards, direction, isTop, handleDragEnd }) {
    const x = useMotionValue(0);
    // Maps x offset (-200 to 200) to rotation (-15deg to 15deg)
    const rotate = useTransform(x, [-200, 200], [-15, 15]);

    return (
        <motion.div
            style={{ 
                zIndex: idx, 
                x: isTop ? x : 0, 
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
                x: direction * 300, 
                opacity: 0, 
                scale: 0.8,
                rotate: direction * 25 // strong rotation on exit
            }}
            transition={{ duration: 0.3 }}
            drag={isTop ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
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
                <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-neutral-800 to-transparent flex flex-col justify-end p-4">
                    {/* Add Like/Nope overlay opacities based on drag */}
                    <motion.div 
                        className="absolute right-4 top-4 border-4 border-green-500 text-green-500 font-black text-4xl rounded-xl px-4 py-1 rotate-12"
                        style={{ opacity: useTransform(x, [0, 100], [0, 1]) }}
                    >
                        LIKE
                    </motion.div>
                    <motion.div 
                        className="absolute left-4 top-4 border-4 border-red-500 text-red-500 font-black text-4xl rounded-xl px-4 py-1 -rotate-12"
                        style={{ opacity: useTransform(x, [0, -100], [0, 1]) }}
                    >
                        NOPE
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
                        {listing.price ? `${listing.price} ${listing.currency || '€'}` : "Договорная"}
                    </p>
                </div>
                
                <div className="flex items-center gap-3 mt-4">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-white/20 shrink-0">
                        {listing.profiles?.avatar_url && (
                            <img src={listing.profiles.avatar_url} className="w-full h-full object-cover" />
                        )}
                    </div>
                    <div className="text-sm text-gray-300 font-medium line-clamp-1">
                        Мастер: {listing.profiles?.first_name || "Аноним"}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
