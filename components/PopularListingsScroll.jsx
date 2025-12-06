"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import ListingCard from "./ListingCard";
import { useLang } from "@/lib/i18n-client";
import cache from "@/lib/cache";

export default function PopularListingsScroll() {
  const { lang, t } = useLang();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const autoScrollInterval = useRef(null);

  // Load popular listings with caching
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        // Use cache to reduce database load (5 minute TTL)
        const chunk = await cache.getOrSet(
          'popular_listings',
          async () => {
            // 1. Fetch listings raw
            const { data: rawListings, error } = await supabase
              .from("listings")
              .select("*")
              .order("created_at", { ascending: false })
              .limit(12);

            if (error) {
              console.error("Error loading popular listings:", error);
              return [];
            }

            let listings = rawListings || [];

            // 2. Fetch related data manually
            if (listings.length > 0) {
              const listingIds = listings.map((l) => l.id);
              const userIds = [...new Set(listings.map((l) => l.created_by).filter(Boolean))];

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
              listings = listings.map((listing) => {
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

            return listings;
          },
          5 * 60 * 1000 // 5 minutes cache
        );

        if (!cancelled) setItems(chunk);
      } catch (e) {
        console.error("Error:", e);
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => (cancelled = true);
  }, []);

  // Auto-scroll effect
  useEffect(() => {
    if (!scrollRef.current || items.length < 2) return;

    const scroll = scrollRef.current;
    
    autoScrollInterval.current = setInterval(() => {
      const containerWidth = scroll.clientWidth;
      const scrollLeft = scroll.scrollLeft;
      const scrollWidth = scroll.scrollWidth;
      
      const firstCard = scroll.firstElementChild;
      if (!firstCard) return;
      
      const cardWidth = firstCard.offsetWidth;
      const gap = parseFloat(window.getComputedStyle(scroll).gap) || 0;
      const scrollAmount = cardWidth + gap;
      
      if (scrollLeft + containerWidth >= scrollWidth - 10) {
        scroll.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        scroll.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }
    }, 8000);

    return () => {
      if (autoScrollInterval.current) {
        clearInterval(autoScrollInterval.current);
      }
    };
  }, [items]);

  // Pause auto-scroll on user interaction
  const handleUserScroll = () => {
    if (autoScrollInterval.current) {
      clearInterval(autoScrollInterval.current);
      setTimeout(() => {
        if (scrollRef.current && items.length >= 2) {
          const scroll = scrollRef.current;
          autoScrollInterval.current = setInterval(() => {
            const containerWidth = scroll.clientWidth;
            const scrollLeft = scroll.scrollLeft;
            const scrollWidth = scroll.scrollWidth;
            
            const firstCard = scroll.firstElementChild;
            if (!firstCard) return;
            
            const cardWidth = firstCard.offsetWidth;
            const gap = parseFloat(window.getComputedStyle(scroll).gap) || 0;
            const scrollAmount = cardWidth + gap;
            
            if (scrollLeft + containerWidth >= scrollWidth - 10) {
              scroll.scrollTo({ left: 0, behavior: "smooth" });
            } else {
              scroll.scrollBy({ left: scrollAmount, behavior: "smooth" });
            }
          }, 8000);
        }
      }, 5000);
    }
  };

  const [currentPage, setCurrentPage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  if (loading) return null;
  if (items.length === 0) return null;

  // Show only first 2 items
  const displayItems = items.slice(0, 2);

  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold px-3 mb-3">{t("popularListings") || "Популярные Объявления"}</h2>
      <div className="px-3">
        <div className="grid grid-cols-2 gap-3">
          {displayItems.map((listing) => (
            <ListingCard key={listing.id} listing={listing} compact />
          ))}
        </div>
      </div>
    </div>
  );
}
