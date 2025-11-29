"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ListingCard from "./ListingCard";
import { ListingCardSkeleton } from "./SkeletonLoader";

import { useLang } from "@/lib/i18n-client";

export default function SimilarListings({ categoryId, currentId }) {
  const { t } = useLang();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSimilar() {
      if (!categoryId) {
          setLoading(false);
          return;
      }

      const { data, error } = await supabase
        .from("listings")
        .select("*, profiles:created_by(*)")
        .eq("category", categoryId)
        .neq("id", currentId)
        .order("created_at", { ascending: false })
        .limit(4);

      if (!error && data) {
        setListings(data);
      }
      setLoading(false);
    }

    fetchSimilar();
  }, [categoryId, currentId]);

  if (!loading && listings.length === 0) return null;

  return (
    <div className="mt-8 mb-8">
      <h2 className="text-xl font-bold mb-4">{t("similar_ads") || "Похожие объявления"}</h2>
      <div className="grid grid-cols-2 gap-2">
        {loading
          ? [...Array(2)].map((_, i) => <div key={i} className="overflow-hidden"><ListingCardSkeleton /></div>)
          : listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
      </div>
    </div>
  );
}
