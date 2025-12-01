"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ListingCard from "./ListingCard";
import { ListingCardSkeleton } from "./SkeletonLoader";

export default function RecentlyViewedScroll() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentlyViewed = async () => {
      try {
        const stored = localStorage.getItem("recently_viewed");
        if (!stored) {
          setLoading(false);
          return;
        }

        const ids = JSON.parse(stored);
        if (!Array.isArray(ids) || ids.length === 0) {
          setLoading(false);
          return;
        }

        // Fetch listings
        const { data, error } = await supabase
          .from("listings")
          .select(`
            *,
            listing_images(image_path),
            profiles:created_by(is_verified, username, first_name, last_name, avatar_url)
          `)
          .in("id", ids)
          .eq("status", "active");

        if (error) throw error;

        // Sort by order in localStorage (most recent first)
        const sorted = ids
          .map(id => data.find(l => l.id === id))
          .filter(Boolean);

        setListings(sorted);
      } catch (err) {
        console.error("Error fetching recently viewed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentlyViewed();
  }, []);

  if (loading) return null; // Or skeleton
  if (listings.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold px-4 mb-3">Недавно просмотренные</h2>
      <div className="flex overflow-x-auto px-4 gap-3 pb-4 no-scrollbar snap-x snap-mandatory">
        {listings.map((listing) => (
          <div key={listing.id} className="min-w-[160px] w-[160px] snap-center">
            <ListingCard listing={listing} compact />
          </div>
        ))}
      </div>
    </div>
  );
}
