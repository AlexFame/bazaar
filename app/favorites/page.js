// app/favorites/page.js
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getUserId } from "@/lib/userId";
import { useLang } from "@/lib/i18n-client";
import ListingCard from "@/components/ListingCard";
import { ListingCardSkeleton } from "@/components/SkeletonLoader";
import BackButton from "@/components/BackButton";

const pageTranslations = {
  ru: {
    title: "Понравившиеся",
    subtitle: "Объявления, которые вы сохранили",
    loading: "Загружаем избранное...",
    empty: "У вас пока нет избранных объявлений",
    emptyHint: "Нажмите на сердечко на любом объявлении, чтобы добавить его в избранное",
  },
  ua: {
    title: "Обране",
    subtitle: "Оголошення, які ви зберегли",
    loading: "Завантажуємо обране...",
    empty: "У вас поки немає обраних оголошень",
    emptyHint: "Натисніть на серце на будь-якому оголошенні, щоб додати його в обране",
  },
  en: {
    title: "Favorites",
    subtitle: "Listings you have saved",
    loading: "Loading favorites...",
    empty: "You don't have any favorite listings yet",
    emptyHint: "Tap the heart on any listing to add it to favorites",
  },
};

export default function FavoritesPage() {
  const { lang } = useLang();
  const t = pageTranslations[lang] || pageTranslations.ru;

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = async () => {
    const tgUserId = getUserId();
    if (!tgUserId) {
      setLoading(false);
      setListings([]);
      return;
    }

    try {
      // Get profile ID
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id")
        .eq("tg_user_id", Number(tgUserId))
        .single();

      if (!profileData) {
        setListings([]);
        setLoading(false);
        return;
      }

      // Get favorites with listing details
      const { data, error } = await supabase
        .from("favorites")
        .select(`
          listing_id,
          listings (
            *,
            profiles:created_by(*)
          )
        `)
        .eq("profile_id", profileData.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading favorites:", error);
        setListings([]);
      } else {
        // Extract listings from the joined data
        const favoriteListings = data
          .map(fav => fav.listings)
          .filter(listing => listing !== null);
        setListings(favoriteListings);
      }
    } catch (e) {
      console.error("Error loading favorites:", e);
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const handleFavoriteRemoved = () => {
    // Refresh favorites list when a favorite is removed
    setLoading(true);
    loadFavorites();
  };

  return (
    <div className="w-full flex justify-center mt-3">
      <div className="w-full max-w-[520px] px-3">
        <div className="mb-3">
            <BackButton />
        </div>
        <h1 className="text-lg font-semibold mb-1">{t.title}</h1>
        <p className="text-sm text-gray-500 mb-3">{t.subtitle}</p>

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
          <div className="bg-white rounded-2xl shadow-sm p-3 text-xs text-black/80">
            <p>{t.empty}</p>
            <p className="mt-1 text-black/60">{t.emptyHint}</p>
          </div>
        )}

        {!loading && listings.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-3">
            <div className="grid grid-cols-2 gap-2">
              {listings.map((listing) => (
                <ListingCard 
                  key={listing.id} 
                  listing={listing}
                  onDelete={handleFavoriteRemoved}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
