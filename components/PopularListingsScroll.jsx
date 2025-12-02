"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import ListingCard from "./ListingCard";
import { useLang } from "@/lib/i18n-client";

export default function PopularListingsScroll() {
  const { lang, t } = useLang();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const autoScrollInterval = useRef(null);

  // Load popular listings
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        // 1. Fetch listings raw
        const { data: rawListings, error } = await supabase
          .from("listings")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(12);

        if (error) {
          console.error("Error loading popular listings:", error);
          if (!cancelled) setItems([]);
          return;
        }

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

  // Auto-scroll effect - scroll one card at a time
  useEffect(() => {
    if (!scrollRef.current || items.length < 2) return;

    const scroll = scrollRef.current;
    
    autoScrollInterval.current = setInterval(() => {
      const containerWidth = scroll.offsetWidth;
      const scrollLeft = scroll.scrollLeft;
      const scrollWidth = scroll.scrollWidth;
      
      // Calculate card width (container width / 2 - gap)
      const cardWidth = (containerWidth - 16 - 12) / 2; // 16px padding left, 12px gap
      
      if (scrollLeft + containerWidth >= scrollWidth - 10) {
        // Reset to start
        scroll.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        // Scroll by one card width + gap
        scroll.scrollBy({ left: cardWidth + 12, behavior: "smooth" });
      }
    }, 10000); // Auto-scroll every 10 seconds (much slower)

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
      // Resume after 5 seconds of no interaction
      setTimeout(() => {
        if (scrollRef.current && items.length >= 2) {
          const scroll = scrollRef.current;
          autoScrollInterval.current = setInterval(() => {
            const containerWidth = scroll.offsetWidth;
            const scrollLeft = scroll.scrollLeft;
            const scrollWidth = scroll.scrollWidth;
            const cardWidth = (containerWidth - 16 - 12) / 2;
            
            if (scrollLeft + containerWidth >= scrollWidth - 10) {
              scroll.scrollTo({ left: 0, behavior: "smooth" });
            } else {
              scroll.scrollBy({ left: cardWidth + 12, behavior: "smooth" });
            }
          }, 10000);
        }
      }, 5000);
    }
  };

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold px-4 mb-3">Популярные Объявления</h2>
      <div className="overflow-hidden">
        <div
          ref={scrollRef}
          onTouchStart={handleUserScroll}
          onMouseDown={handleUserScroll}
          className="flex overflow-x-scroll gap-3 px-4 pb-4 no-scrollbar"
          style={{ 
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch"
          }}
        >
          {items.map((listing) => (
            <div 
              key={listing.id} 
              className="flex-shrink-0 snap-start"
              style={{ width: "calc((100% - 32px - 12px) / 2)" }}
            >
              <ListingCard listing={listing} compact />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
