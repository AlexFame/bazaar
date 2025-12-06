"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  HeartIcon,
  Cog6ToothIcon
} from "@heroicons/react/24/outline";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getUserId } from "@/lib/userId";
import { useLang } from "@/lib/i18n-client";
import ListingCard from "@/components/ListingCard";
import { ListingCardSkeleton } from "@/components/SkeletonLoader";
import { getTelegramUser } from "@/lib/telegram";
import BackButton from "@/components/BackButton";
import PremiumServicesModal from "@/components/PremiumServicesModal";
import FadeIn from "@/components/FadeIn";

const pageTranslations = {
  ru: {
    my: "Мои объявления",
    my_orders: "Мои покупки",
    mySubtitle:
      "Здесь будут собраны все объявления, опубликованные с вашего Telegram-аккаунта.",
    createBtn: "Создать объявление",
    loading: "Загружаем ваши объявления...",
    empty: "У вас пока нет объявлений.",
    hintCreate: "Нажмите кнопку выше, чтобы опубликовать первое объявление.",
    userBlockTitle: "Telegram-профиль",
    noUserText:
      "Не удалось получить данные из Telegram. Это не критично — объявления всё равно будут работать.",
    nameLabel: "Имя",
    usernameLabel: "Юзернейм",
    idLabel: "Telegram ID",
    langLabel: "Язык Telegram",
    confirm_delete: "Вы уверены, что хотите удалить это объявление?",
    delete_error: "Не удалось удалить объявление",
    tab_archive: "Архив",
    settings: "Настройки",
    stats_btn: "Статистика",
    empty_drafts: "У вас нет черновиков.",
    empty_archive: "Архив пуст.",
    empty_favorites: "Избранного пока нет."
  },
  ua: {
    my: "Мої оголошення",
    my_orders: "Мої покупки",
    mySubtitle:
      "Тут будуть зібрані всі оголошення, опубліковані з вашого Telegram-акаунта.",
    createBtn: "Створити оголошення",
    loading: "Завантажуємо твої оголошення...",
    empty: "У вас поки немає оголошень.",
    hintCreate:
      "Натисніть кнопку вище, щоб опублікувати своє перше оголошення.",
    userBlockTitle: "Telegram-профіль",
    noUserText:
      "Не вдалося отримати дані з Telegram. Це не критично — оголошення все одно працюють.",
    nameLabel: "Імʼя",
    usernameLabel: "Юзернейм",
    idLabel: "Telegram ID",
    langLabel: "Мова Telegram",
    confirm_delete: "Ви впевнені, що хочете видалити це оголошення?",
    delete_error: "Не вдалося видалити оголошення",
    tab_archive: "Архів",
    settings: "Налаштування",
    stats_btn: "Статистика",
    empty_drafts: "У вас немає чернеток.",
    empty_archive: "Архів порожній.",
    empty_favorites: "Ви ще нічого не вподобали."
  },
  en: {
    my: "My listings",
    my_orders: "My orders",
    mySubtitle:
      "All listings published from your Telegram account will appear here.",
    createBtn: "Create listing",
    loading: "Loading your listings...",
    empty: "You don’t have any listings yet.",
    hintCreate: "Tap the button above to publish your first listing.",
    userBlockTitle: "Telegram profile",
    noUserText:
      "Could not read Telegram data. It’s not critical – listings will still work.",
    nameLabel: "Name",
    usernameLabel: "Username",
    idLabel: "Telegram ID",
    langLabel: "Telegram language",
    confirm_delete: "Are you sure you want to delete this listing?",
    delete_error: "Failed to delete listing",
    tab_active: "Active",
    tab_drafts: "Drafts",
    tab_archive: "Archive",
    tab_favorites: "Favorites",
    settings: "Settings",
    stats_btn: "Statistics",
    empty_drafts: "You don't have drafts.",
    empty_archive: "Archive is empty.",
    empty_favorites: "No favorites yet."
  },
};

export default function MyPage() {
  const { lang, t } = useLang();
  const localStrings = pageTranslations[lang] || pageTranslations.ru;
  const router = useRouter();

  const [userId, setUserId] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tgUser, setTgUser] = useState(null);
  const [activeTab, setActiveTab] = useState("active"); // 'active' | 'draft'
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState(null);

  // Debug imports
  useEffect(() => {
    console.log("MyPage Debug:", {
      useLangType: typeof useLang,
      getUserIdType: typeof getUserId,
      getTelegramUserType: typeof getTelegramUser,
      ListingCardType: typeof ListingCard,
      BackButtonType: typeof BackButton,
      lang,
      tType: typeof t
    });
  }, []);

  const loadListings = async () => {
    setLoading(true);
    let tgUserId = getUserId();
    
    // Fallback to Supabase Auth if no Telegram ID
    if (!tgUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        tgUserId = user.id; // This is a UUID, not a number.
      }
    }

    setUserId(tgUserId);
    
    if (!tgUserId) {
      setLoading(false);
      setListings([]);
      return;
    }

    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, is_admin")
        .eq("tg_user_id", Number(tgUserId))
        .single();

      if (profileError || !profileData) {
        setListings([]);
        setLoading(false);
        return;
      }

      setIsAdmin(profileData.is_admin || false);

      let data, error;

      if (activeTab === 'favorites') {
        // Fetch favorites
        const { data: favoritesData, error: favoritesError } = await supabase
          .from("favorites")
          .select("listing_id, listings(*, profiles:created_by(*))")
          .eq("profile_id", profileData.id)
          .order("created_at", { ascending: false });

        if (favoritesError) {
          error = favoritesError;
        } else {
          // Extract listings from favorites relation
          data = favoritesData
            .map(f => f.listings)
            .filter(l => l !== null); // Filter out any nulls if listing was deleted
        }
      } else {
        // Fetch own listings
        let query = supabase
          .from("listings")
          .select("*, profiles:created_by(*)")
          .eq("created_by", profileData.id)
          .order("created_at", { ascending: false });

        if (activeTab === 'active') {
            query = query.in('status', ['active', 'reserved']);
        } else if (activeTab === 'archive') {
            query = query.in('status', ['closed', 'sold', 'archived']);
        } else {
            query = query.eq('status', activeTab);
        }
        
        const result = await query;
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error("Error loading listings:", error);
        setListings([]);
      } else {
        setListings(data || []);
      }
    } catch (e) {
      console.error("Error loading listings:", e);
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, [activeTab]); // Reload when tab changes

  useEffect(() => {
    if (typeof window !== "undefined") {
      const user = getTelegramUser();
      setTgUser(user);
    }
  }, []);

  const handleDelete = async (id) => {
    if (!confirm(localStrings.confirm_delete)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("listings")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting listing:", error);
        alert(localStrings.delete_error);
        return;
      }

      // Remove from local state
      setListings(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      console.error("Error:", err);
      alert(localStrings.delete_error);
    }
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
        <h1 className="text-lg font-semibold mb-1 dark:text-white">{localStrings.my}</h1>
        <p className="text-sm text-gray-500 mb-3">{localStrings.mySubtitle}</p>

        {tgUser && (
            <FadeIn>
                <div className="bg-white dark:bg-transparent rounded-2xl shadow-sm p-3 mb-3 text-[13px]">
            {/* Header / User Info */}
            <div className={`p-4 rounded-3xl bg-white dark:bg-white/5 shadow-sm mb-6 flex items-center justify-between border border-transparent`}>
               <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl relative overflow-hidden">
                     {tgUser.photo_url ? (
                        <img 
                           src={tgUser.photo_url} 
                           alt="Avatar" 
                           className="h-full w-full object-cover"
                        />
                     ) : (
                        <span>{tgUser.first_name?.[0]}{tgUser.last_name?.[0]}</span>
                     )}
                  </div>
                  <div>
                     <h1 className={`text-xl font-bold text-gray-900 dark:text-foreground`}>
                        {tgUser.first_name} {tgUser.last_name || ""}
                     </h1>
                     <p className={`text-sm text-gray-500`}>
                        {tgUser.username ? `@${tgUser.username}` : t('no_username')}
                     </p>
                  </div>
               </div>
               
                <Link href="/profile/settings" className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/10 rounded-full hover:bg-gray-200 dark:hover:bg-white/20 transition-colors border-none">
                   <Cog6ToothIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                   <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{localStrings.settings || "Настройки"}</span>
                </Link>
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
                {localStrings.tab_archive || "Архив"}
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
        </div>

        {/* Action Buttons */}
        <div className="mb-3 flex flex-col gap-2">
            {/* Statistics Button */}
            <Link 
                href="/my/statistics"
                className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
            >
                <span>📊</span>
                {localStrings.stats_btn}
            </Link>
            
            {/* Create Listing Button */}
            <Link 
                href="/create"
                className="w-full py-3 bg-black dark:bg-white dark:text-black text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
            >
                <span>+</span>
                {localStrings.createBtn}
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

        {!loading && listings.length === 0 && (
           <div className="bg-white dark:bg-white/5 rounded-2xl shadow-sm p-3 text-xs text-black/80 dark:text-white/80 text-center py-8">
             <p className="text-gray-500 text-sm mb-2">
               {activeTab === 'active' ? localStrings.empty : 
                activeTab === 'draft' ? localStrings.empty_drafts : 
                activeTab === 'archive' ? localStrings.empty_archive :
                localStrings.empty_favorites}
             </p>
             {activeTab === 'active' && <p className="text-black/60 dark:text-white/60">{localStrings.hintCreate}</p>}
           </div>
        )}

        {!loading && listings.length > 0 && (
          <FadeIn delay={0.2}>
            <div className="bg-white dark:bg-transparent rounded-2xl shadow-sm p-3">
              <div className="grid grid-cols-2 gap-2">
                {listings.map((listing) => (
                  <ListingCard 
                    key={listing.id} 
                    listing={listing} 
                    showActions={true}
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
      </div>

      {/* Premium Services Modal */}
      <PremiumServicesModal
        listingId={selectedListingId}
        isOpen={isPremiumModalOpen}
        onClose={() => setIsPremiumModalOpen(false)}
      />
    </div>
  );
}
