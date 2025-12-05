"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ListingCard from "./ListingCard";
import { ListingCardSkeleton } from "./SkeletonLoader";

import { useLang } from "@/lib/i18n-client";

export default function SimilarListings({ categoryId, currentId, title }) {
  const { t } = useLang();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSimilar() {
      // If we have a title, use smart search. 
      // Fallback to category search if no title (shouldn't happen often)
      
      let data = [];
      let error = null;

      if (title) {
          // Use our smart search RPC
          const { data: searchResults, error: searchError } = await supabase
            .rpc('search_listings', { 
                search_query: title, 
                filter_category: categoryId || undefined,
                match_threshold: 0.1 
            });
            
          if (searchError) {
              console.error("Similar search error:", searchError);
          } else {
              data = searchResults;
          }
      } else if (categoryId) {
          // Fallback: simple category fetch
          const { data: catData, error: catError } = await supabase
            .from("listings")
            .select("*, profiles:created_by(*)")
            .eq("category_key", categoryId)
            .order("created_at", { ascending: false })
            .limit(5); // Fetch 5 to have buffer for exclusion
           
          err = catError;
          data = catData;
      }

      if (data) {
        // Filter out current listing
        const filtered = data.filter(l => l.id !== currentId).slice(0, 4);
        setListings(filtered);
      }
      setLoading(false);
    }

    fetchSimilar();
  }, [categoryId, currentId, title]);

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
