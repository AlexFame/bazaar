// app/favorites/page.js
"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n-client";
import ListingCard from "@/components/ListingCard";
import { ListingCardSkeleton } from "@/components/SkeletonLoader";
import BackButton from "@/components/BackButton";
import { listFavorites } from "@/lib/favoritesClient";

export default function FavoritesPage() {
  const { t } = useLang();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      setListings(await listFavorites());
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
