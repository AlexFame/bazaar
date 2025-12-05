"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  },
  ua: {
    my: "Мої оголошення",
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
  },
  en: {
    my: "My listings",
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
    tab_favorites: "Favorites",
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
        // Fetch own listings (active/draft)
        const result = await supabase
          .from("listings")
          .select("*, profiles:created_by(*)")
          .eq("created_by", profileData.id)
          .eq("status", activeTab)
          .order("created_at", { ascending: false });
        
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

  // ... (existing code)

  return (
    <div className="w-full flex justify-center mt-3 mb-20">
      <div className="w-full max-w-[520px] px-3">
        
        {/* ... (existing header code) ... */}

        {/* Tabs */}
        <div className="flex mb-4 border-b border-gray-200">
            <button 
                onClick={() => setActiveTab("active")}
                className={`flex-1 pb-2 text-sm font-medium transition-colors relative ${activeTab === "active" ? "text-black" : "text-gray-400 hover:text-gray-600"}`}
            >
                {t("tab_active")}
                {activeTab === "active" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-black rounded-t-full"></div>}
            </button>
            <button 
                onClick={() => setActiveTab("draft")}
                className={`flex-1 pb-2 text-sm font-medium transition-colors relative ${activeTab === "draft" ? "text-black" : "text-gray-400 hover:text-gray-600"}`}
            >
                {t("tab_drafts")}
                {activeTab === "draft" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-black rounded-t-full"></div>}
            </button>
            <button 
                onClick={() => setActiveTab("favorites")}
                className={`flex-1 pb-2 text-sm font-medium transition-colors relative ${activeTab === "favorites" ? "text-black" : "text-gray-400 hover:text-gray-600"}`}
            >
                {t("tab_favorites")}
                {activeTab === "favorites" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-black rounded-t-full"></div>}
            </button>
        </div>

        {/* Action Buttons */}
        <div className="mb-3 flex flex-col gap-2">
            {/* Statistics Button */}
            <Link 
                href="/my/statistics"
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:shadow-lg transition-all"
            >
                <span>📊</span>
                Статистика
            </Link>
            
            {/* Create Listing Button */}
            <Link 
                href="/create"
                className="w-full py-3 bg-black text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
            >
                <span>+</span>
                {localStrings.createBtn}
            </Link>
        </div>

        {/* Listings List */}
        {loading && (
             <div className="bg-white rounded-2xl shadow-sm p-3">
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
           <div className="bg-white rounded-2xl shadow-sm p-3 text-xs text-black/80 text-center py-8">
             <p className="text-gray-500 text-sm mb-2">{activeTab === 'active' ? localStrings.empty : "У вас нет черновиков."}</p>
             {activeTab === 'active' && <p className="text-black/60">{localStrings.hintCreate}</p>}
           </div>
        )}

        {!loading && listings.length > 0 && (
          <FadeIn delay={0.2}>
            <div className="bg-white rounded-2xl shadow-sm p-3">
              <div className="grid grid-cols-2 gap-2">
                {listings.map((listing) => (
                  <ListingCard 
                    key={listing.id} 
                    listing={listing} 
                    showActions={true}
                    onDelete={() => handleDelete(listing.id)}
                    onPromote={() => handlePromote(listing.id)}
                    onAnalytics={() => router.push(`/my/analytics/${listing.id}`)}
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
