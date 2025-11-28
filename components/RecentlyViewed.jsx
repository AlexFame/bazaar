"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ListingCard from "@/components/ListingCard";
import { ListingCardSkeleton } from "@/components/SkeletonLoader";

export default function RecentlyViewed() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecentlyViewed() {
      const stored = localStorage.getItem("recently_viewed");
      if (!stored) {
        setLoading(false);
        return;
      }

      try {
        const ids = JSON.parse(stored);
        if (!Array.isArray(ids) || ids.length === 0) {
          setLoading(false);
          return;
        }

        // Fetch listings
        const { data, error } = await supabase
          .from("listings")
          .select("*, profiles:created_by(*)")
          .in("id", ids)
          .eq("status", "active");

        if (error) throw error;

        // Sort by order in ids (most recent first)
        const sorted = data.sort((a, b) => {
            return ids.indexOf(a.id) - ids.indexOf(b.id);
        });

        setListings(sorted);
      } catch (err) {
        console.error("Error loading recently viewed:", err);
      } finally {
        setLoading(false);
      }
    }

    loadRecentlyViewed();
  }, []);

  if (loading) return (
      <div className="grid grid-cols-2 gap-2">
          <ListingCardSkeleton />
          <ListingCardSkeleton />
      </div>
  );

  if (listings.length === 0) return null;

  return (
    <div className="mt-8 mb-4">
      <h2 className="text-lg font-bold mb-3 px-1">Вы недавно смотрели</h2>
      <div className="grid grid-cols-2 gap-2">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
}
