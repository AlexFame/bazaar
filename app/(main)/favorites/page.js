// app/favorites/page.js
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getUserId } from "@/lib/userId";
import { useLang } from "@/lib/i18n-client";
import ListingCard from "@/components/ListingCard";
import { ListingCardSkeleton } from "@/components/SkeletonLoader";
import BackButton from "@/components/BackButton";

export default function FavoritesPage() {
  const { t } = useLang();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = async () => {
    let tgUserId = getUserId();
    let profileId = null;

    // 1. Try Telegram ID
    if (tgUserId) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id")
        .eq("tg_user_id", Number(tgUserId))
        .single();
      if (profileData) profileId = profileData.id;
    }

    // 2. Fallback to Supabase Auth
    if (!profileId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
         // Try to find profile by user_id
         const { data: profileData } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", user.id)
            .maybeSingle();
         if (profileData) profileId = profileData.id;
      }
    }

    if (!profileId) {
      setLoading(false);
      setListings([]);
      return;
    }

    try {
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
        .eq("profile_id", profileId)
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
    <div 
      className="w-full flex justify-center mt-3"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 40px)' }}
    >
      <div className="w-full max-w-[520px] px-3">
        <div className="mb-3">
            <BackButton />
        </div>
        <h1 className="text-lg font-semibold mb-1">{t("favorites_title") || "Понравившиеся"}</h1>
        <p className="text-sm text-gray-500 mb-3">{t("favorites_subtitle") || "Объявления, которые вы сохранили"}</p>

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
            <p>{t("favorites_empty") || "У вас пока нет избранных объявлений"}</p>
            <p className="mt-1 text-black/60">{t("favorites_empty_hint") || "Нажмите на сердечко на любом объявлении, чтобы добавить его в избранное"}</p>
          </div>
        )}

        {!loading && listings.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-3">
            <div className="grid grid-cols-2 gap-2">
              {listings.map((listing) => (
                <ListingCard 
                  key={listing.id} 
                  listing={listing}
                  isFavoriteInit={true}
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
