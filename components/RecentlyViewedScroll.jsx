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

        // 1. Fetch listings raw
        const { data: rawListings, error } = await supabase
          .from("listings")
          .select("*")
          .in("id", ids);
          // Removed .eq("status", "active")

        if (error) throw error;

        let chunk = rawListings || [];

        // 2. Fetch related data manually
        if (chunk.length > 0) {
          const listingIds = chunk.map((l) => l.id);
          const userIds = [...new Set(chunk.map((l) => l.created_by).filter(Boolean))];

          // Fetch Images
          const { data: imagesData } = await supabase
            .from("listing_images")
            .select("listing_id, file_path")
            .in("listing_id", listingIds);

          // Fetch Profiles
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, tg_username, full_name, avatar_url")
            .in("id", userIds);

          // Merge
          chunk = chunk.map((listing) => {
            const listingImages = imagesData
              ? imagesData
                  .filter((img) => img.listing_id === listing.id)
                  .map((img) => ({ image_path: img.file_path }))
              : [];

            const profile = profilesData
              ? profilesData.find((p) => p.id === listing.created_by)
              : null;

            const mappedProfile = profile
              ? {
                  is_verified: false,
                  username: profile.tg_username,
                  first_name: profile.full_name ? profile.full_name.split(" ")[0] : "",
                  last_name: profile.full_name ? profile.full_name.split(" ").slice(1).join(" ") : "",
                  avatar_url: profile.avatar_url,
                }
              : null;

            return {
              ...listing,
              listing_images: listingImages,
              profiles: mappedProfile,
            };
          });
        }

        // Sort by order in localStorage (most recent first)
        const sorted = ids
          .map(id => chunk.find(l => l.id === id))
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
      <div 
        className="flex overflow-x-auto gap-3 px-4 pb-4 no-scrollbar snap-x snap-mandatory"
        style={{ 
          WebkitOverflowScrolling: "touch"
        }}
      >
        {listings.map((listing) => (
          <div 
            key={listing.id} 
            className="flex-shrink-0 snap-start"
            style={{ flex: "0 0 calc(50% - 6px)" }}
          >
            <ListingCard listing={listing} compact />
          </div>
        ))}
      </div>
    </div>
  );
}
