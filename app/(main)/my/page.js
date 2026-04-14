"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  HeartIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon
} from "@heroicons/react/24/outline";
// Fix imports if needed
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAtom } from "jotai";
import { myListingsAtom, myActiveTabAtom, myIsAdminAtom } from "@/lib/store";
import { getUserId } from "@/lib/userId";
import { useLang } from "@/lib/i18n-client";
import ListingCard from "@/components/ListingCard";
import { ListingCardSkeleton } from "@/components/SkeletonLoader";
import { getTelegramUser } from "@/lib/telegram";
import { resolveAvatarUrl } from "@/lib/avatar";
import BackButton from "@/components/BackButton";
import PremiumServicesModal from "@/components/PremiumServicesModal";
import FadeIn from "@/components/FadeIn";
import NotificationsModal from "@/components/NotificationsModal";
import ReviewList from "@/components/ReviewList"; // Added import
import { toast } from "sonner"; // Added notification

export default function MyPage() {
  const { lang, t } = useLang();
  const router = useRouter();

  const [userId, setUserId] = useState(null);
  
  // JOTAI CACHE
  const [listingsByTab, setListingsByTab] = useAtom(myListingsAtom);
  const [cachedActiveTab, setCachedActiveTab] = useAtom(myActiveTabAtom);
  const [cachedAdmin, setCachedAdmin] = useAtom(myIsAdminAtom);
  
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState(tabFromUrl || cachedActiveTab || "active"); // Sync with param or cache
  const listings = listingsByTab[activeTab] || [];
  const [loading, setLoading] = useState(!listingsByTab[activeTab]);
  
  useEffect(() => {
    if (tabFromUrl && ["active", "archive", "draft", "favorites"].includes(tabFromUrl)) {
        setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const [isAdmin, setIsAdmin] = useState(cachedAdmin);
  const [tgUser, setTgUser] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState(null);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
      // Sync local tab state with cache when it changes
      setCachedActiveTab(activeTab);
  }, [activeTab]);

  useEffect(() => {
      // Sync admin state
      if (isAdmin !== cachedAdmin) setCachedAdmin(isAdmin);
  }, [isAdmin]);

  // Notifications Logic
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    let channel;
    async function initNotif() {
       const { data: { user } } = await supabase.auth.getUser();
       // Fallback for TG user managed in loadListings but let's try safely here
       let uid = user?.id;
       if (!uid) {
           const tgu = getUserId(); // ensure we use the same helper
           if (tgu) {
               const { data: p } = await supabase.from('profiles').select('id').eq('tg_user_id', tgu).single();
               uid = p?.id;
           }
       }
       
       if (uid) {
           const refreshCount = async () => {
                const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('is_read', false);
                setNotifCount(count || 0);
           };
           refreshCount();

           channel = supabase
            .channel('realtime:profile_notifications')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${uid}`
                },
                () => {
                    refreshCount();
                }
            )
            .subscribe();
       }
    }
    initNotif();

    return () => {
        if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const setTabListings = (tab, items) => {
    setListingsByTab((prev) => ({
      ...prev,
      [tab]: items
    }));
  };

  const loadListings = async (tab = activeTab, force = false) => {
    // If we have cached data for this exact tab, show it instantly.
    if (!force && listingsByTab[tab]) {
        setLoading(false);
        return;
    }

    setLoading(true);
    let tgUserId = getUserId();
    // Fallback to Supabase Auth if no Telegram ID logic remains same for getting ID for local state,
    // but for fetching we now prefer API.
    
    // We need initData for API
    const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
    const initData = tg?.initData;

    try {
      // Handles favorites & reviews separately as they might need different logic,
      // BUT for "active", "archive", "draft", we use the new API to bypass RLS.
      
      if (tab === 'reviews') {
            const { data: profileData } = await supabase
                .from("profiles")
                .select("id, is_admin")
                .eq("tg_user_id", Number(tgUserId))
                .single();
            
            if (profileData) {
                setIsAdmin(profileData.is_admin);
                
                const { data: reviewsData } = await supabase
                  .from("reviews")
                  .select("*, reviewer:profiles!reviewer_id(full_name, tg_username, avatar_url)")
                  .eq("target_id", profileData.id)
                  .order("created_at", { ascending: false });
                setReviews(reviewsData || []);
            }
            setLoading(false);
            return;
      }

      // FOR OWN LISTINGS AND FAVORITES
      if (initData) {
          const res = await fetch('/api/listings/my', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ initData, tab })
          });
          
          if (!res.ok) throw new Error("Failed to fetch listings");
          
          const data = await res.json();
          setTabListings(tab, data.items || []);
          if (data.isAdmin !== undefined) setIsAdmin(data.isAdmin);
          
      } else {
          // Fallback for non-TG env (Dev/Browser without initData)
          // Still use Supabase direct, assuming Dev has RLS disabled or is logged in via Auth
           const { data: { user } } = await supabase.auth.getUser();
           if (user) {
               let query = supabase
                  .from("listings")
                  .select("*, profiles:created_by(*)")
                  .eq("created_by", user.id)
                  .order("created_at", { ascending: false });

                if (tab === 'active') query = query.in('status', ['active', 'reserved']);
                else if (tab === 'archive') query = query.in('status', ['closed', 'sold', 'archived']);
                else query = query.eq('status', tab);
                
                const { data } = await query;
                setTabListings(tab, data || []);
           } else {
               // Only if absolutely no auth
               setTabListings(tab, []);
           }
      }

    } catch (e) {
      console.error("Error loading listings:", e);
      // setListings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if we have cached data for the current tab
    if (listingsByTab[activeTab]) {
        setLoading(false);
    } else {
        loadListings(activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const user = getTelegramUser();
      setTgUser(user);
    }
  }, []);

  useEffect(() => {
    const loadCurrentProfile = async () => {
      const tgId = getUserId();
      if (!tgId) return;

      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, tg_username, avatar_url, is_admin")
        .eq("tg_user_id", tgId)
        .single();

      if (data) {
        setCurrentProfile(data);
        if (typeof data.is_admin === "boolean") setIsAdmin(data.is_admin);
      }
    };

    loadCurrentProfile();
  }, []);

  const handleDelete = (id) => {
    // ListingCard already handles the API deletion and confirmation.
    // We just need to update the UI state.
    
    // Remove from local state
    setListingsByTab((prev) => ({
      ...prev,
      [activeTab]: (prev[activeTab] || []).filter(l => l.id !== id)
    }));
    toast.success(t("listing_deleted") || "Объявление удалено");
  };

  const handlePromote = (id) => {
    setSelectedListingId(id);
    setIsPremiumModalOpen(true);
  };

  return (
    <div className="w-full flex justify-center mt-0 mb-20 min-h-screen bg-white dark:bg-black transition-colors duration-300">
      <div className="w-full max-w-[520px] px-3 pt-3">
        
        <div className="mb-3">
            <BackButton />
        </div>
        <h1 className="text-lg font-semibold mb-1 dark:text-white">{t("my_profile") || "Мой профиль"}</h1>
        <p className="text-sm text-gray-500 mb-3">{t("my_subtitle") || "Здесь вы можете управлять своими объявлениями и настройками профиля."}</p>

        {tgUser && (
            <FadeIn>
                <div className="bg-white dark:bg-transparent rounded-2xl shadow-sm p-3 mb-3 text-[13px]">
            {/* Header / User Info */}
            <div className={`p-4 dark:p-0 rounded-3xl bg-white dark:bg-transparent shadow-sm dark:shadow-none mb-6 flex flex-col gap-4 border-none`}>
               <div className="flex items-center justify-between w-full"> 
                   {/* User Avatar & Name */}
                   <div className="flex items-center space-x-4">
                      <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl relative overflow-hidden">
                         {resolveAvatarUrl(currentProfile?.avatar_url) || tgUser.photo_url ? (
                            <img 
                               src={resolveAvatarUrl(currentProfile?.avatar_url) || tgUser.photo_url} 
                               alt="Avatar" 
                               className="h-full w-full object-cover"
                            />
                         ) : (
                            <span>{(currentProfile?.full_name || tgUser.first_name || "U")?.[0]}{tgUser.last_name?.[0]}</span>
                         )}
                      </div>
                      <div>
                         <h1 className={`text-xl font-bold text-gray-900 dark:text-foreground`}>
                            {currentProfile?.full_name || `${tgUser.first_name} ${tgUser.last_name || ""}`.trim()}
                         </h1>
                         <p className={`text-sm text-gray-500`}>
                            {currentProfile?.tg_username ? `@${currentProfile.tg_username}` : (tgUser.username ? `@${tgUser.username}` : t('no_username'))}
                         </p>
                      </div>
                   </div>

                   {/* Notification Bell (Right aligned) */}
                   <button 
                     onClick={() => setIsNotifOpen(true)}
                     className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 active:scale-95 transition-all self-start mt-1 mr-[-8px]"
                   >
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 dark:text-white text-black">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                       </svg>
                       {notifCount > 0 && (
                         <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full border-2 border-white dark:border-black flex items-center justify-center text-[10px] font-bold text-white leading-none">
                            {notifCount > 99 ? "99+" : notifCount}
                         </span>
                       )}
                   </button>
               </div>
               
               {/* Settings Button (Moved below or next to it? Logic kept from original but wrapped in new layout) */}
                <div className="flex justify-start"> {/* Or justify-end if previous design intended it */}
                    <Link href="/profile/settings" className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/10 rounded-full hover:bg-gray-200 dark:hover:bg-white/20 transition-colors border-none w-full justify-center">
                       <Cog6ToothIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                       <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{t("settings") || "Настройки"}</span>
                    </Link>
                </div>
             </div>
                </div>
            </FadeIn>
        )}

        {/* Admin Panel Button */}
        {isAdmin && (
            <div className="mb-3">
                <Link href="/admin" className="w-full py-2 bg-gray-800 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                    🛡️ {t("admin_panel") || "Админ-панель"}
                </Link>
            </div>
        )}



        {/* Tabs - Scrollable */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mb-4 border-b border-gray-200 dark:border-white/10 pb-px">
            <button 
                onClick={() => setActiveTab("active")}
                className={`flex-none px-4 pb-2 text-sm font-medium transition-colors whitespace-nowrap relative ${activeTab === "active" ? "text-black dark:text-white" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
            >
                {t("tab_active")}
                {activeTab === "active" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-black dark:bg-white rounded-t-full"></div>}
            </button>
            <button 
                onClick={() => setActiveTab("archive")}
                className={`flex-none px-4 pb-2 text-sm font-medium transition-colors whitespace-nowrap relative ${activeTab === "archive" ? "text-black dark:text-white" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
            >
                {t("tab_archive") || "Архив"}
                {activeTab === "archive" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-black dark:bg-white rounded-t-full"></div>}
            </button>
            <button 
                onClick={() => setActiveTab("draft")}
                className={`flex-none px-4 pb-2 text-sm font-medium transition-colors whitespace-nowrap relative ${activeTab === "draft" ? "text-black dark:text-white" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
            >
                {t("tab_drafts")}
                {activeTab === "draft" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-black dark:bg-white rounded-t-full"></div>}
            </button>
            <button 
                onClick={() => setActiveTab("favorites")}
                className={`flex-none px-4 pb-2 text-sm font-medium transition-colors whitespace-nowrap relative ${activeTab === "favorites" ? "text-black dark:text-white" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
            >
                {t("tab_favorites")}
                {activeTab === "favorites" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-black dark:bg-white rounded-t-full"></div>}
            </button>
            <button 
                onClick={() => setActiveTab("reviews")}
                className={`flex-none px-4 pb-2 text-sm font-medium transition-colors whitespace-nowrap relative ${activeTab === "reviews" ? "text-black dark:text-white" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
            >
                {t("reviews_count") || "Отзывы"}
                {activeTab === "reviews" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-black dark:bg-white rounded-t-full"></div>}
            </button>
        </div>

        {/* Action Buttons */}
        <div className="mb-3 flex flex-col gap-2">
            {/* Statistics Button */}
            <Link 
                href="/my/statistics"
                className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
            >
                <span>📊</span>
                {t("stats_btn") || "Статистика"}
            </Link>
            
            {/* Create Listing Button */}
            <Link 
                href="/create"
                className="w-full py-3 bg-black dark:bg-white dark:text-black text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
            >
                <span>+</span>
                {t("create_btn") || "Создать объявление"}
            </Link>

            {/* Saved Searches Button */}
            <Link 
                href="/saved-searches"
                className="w-full py-3 bg-white border border-gray-200 dark:bg-white/10 dark:border-white/10 dark:text-white text-black rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
            >
                <MagnifyingGlassIcon className="h-5 w-5" />
                {t("saved_searches") || "Подписки"}
            </Link>
        </div>

        {/* Listings List */}
        {loading && (
             <div className="bg-white dark:bg-transparent rounded-2xl shadow-sm p-3">
                <div className="grid grid-cols-2 gap-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="overflow-hidden">
                      <ListingCardSkeleton />
                    </div>
                  ))}
                </div>
              </div>
        )}

         {!loading && activeTab !== 'reviews' && listings.length === 0 && (
           <div className="bg-white dark:bg-white/5 rounded-2xl shadow-sm p-3 text-xs text-black/80 dark:text-white/80 text-center py-8">
             <p className="text-gray-500 text-sm mb-2">
               {activeTab === 'active' ? (t("empty_listings") || "У вас пока нет объявлений.") : 
                activeTab === 'draft' ? (t("empty_drafts") || "У вас нет черновиков.") : 
                activeTab === 'archive' ? (t("empty_archive") || "Архив пуст.") :
                (t("empty_favorites") || "Избранного пока нет.")}
             </p>
             {activeTab === 'active' && <p className="text-black/60 dark:text-white/60">{t("hint_create") || "Нажмите кнопку выше, чтобы опубликовать первое объявление."}</p>}
           </div>
        )}

        {!loading && activeTab !== 'reviews' && listings.length > 0 && (
          <FadeIn delay={0.2}>
            <div className="bg-white dark:bg-transparent rounded-2xl shadow-sm p-3">
              <div className="grid grid-cols-2 gap-2">
                {listings.map((listing) => (
                  <ListingCard 
                    key={listing.id} 
                    listing={listing} 
                    showActions={activeTab !== 'favorites'}
                    hideFavorite={activeTab !== 'favorites'}
                    isFavoriteInit={activeTab === 'favorites' ? true : undefined}
                    onDelete={() => handleDelete(listing.id)}
                    onPromote={() => handlePromote(listing.id)}
                    onAnalytics={() => router.push(`/my/analytics/${listing.id}`)}
                    onStatusChange={loadListings}
                  />
                ))}
              </div>
            </div>
          </FadeIn>
        )}

        {!loading && activeTab === 'reviews' && (
            <div>
                 <h2 className="text-lg font-bold mb-3 px-1 dark:text-white">
                    {t("reviews_about_you") || "Отзывы о вас"}
                 </h2>
                 {reviews.length === 0 ? (
                     <div className="text-center py-10 text-gray-400 text-sm bg-white dark:bg-white/5 rounded-2xl">
                         {t("no_reviews") || "Отзывов пока нет"}
                     </div>
                 ) : (
                     <ReviewList reviews={reviews} />
                 )}
            </div>
        )}
      </div>

      {/* Premium Services Modal */}
      <PremiumServicesModal
        listingId={selectedListingId}
        isOpen={isPremiumModalOpen}
        onClose={() => setIsPremiumModalOpen(false)}
      />

      {/* Notifications Modal */}
      <NotificationsModal 
        isOpen={isNotifOpen} 
        onClose={() => setIsNotifOpen(false)} 
        onUpdate={() => {
            // Refresh count immediately
            const initNotif = async () => {
               const { data: { user } } = await supabase.auth.getUser();
               // Fallback logic
               let uid = user?.id;
               if (!uid) {
                   const tgu = getUserId();
                   if (tgu) {
                       const { data: p } = await supabase.from('profiles').select('id').eq('tg_user_id', tgu).single();
                       uid = p?.id;
                   }
               }
               if (uid) {
                   const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('is_read', false);
                   setNotifCount(count || 0);
               }
            };
            initNotif();
        }}
      />
    </div>
  );
}
