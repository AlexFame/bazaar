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

  // Auto-scroll effect with progress animation
  useEffect(() => {
    if (items.length <= 2) return;

    const totalPages = Math.ceil(items.length / 2);
    const duration = 5000; // 5 seconds
    const intervalTime = 50; // Update every 50ms for smooth animation
    
    let elapsed = 0;
    
    const progressInterval = setInterval(() => {
      elapsed += intervalTime;
      const newProgress = (elapsed / duration) * 100;
      
      if (newProgress >= 100) {
        setProgress(0);
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentPage((prev) => (prev + 1) % totalPages);
          setIsTransitioning(false);
        }, 300); // Match transition duration
        elapsed = 0;
      } else {
        setProgress(newProgress);
      }
    }, intervalTime);

    return () => clearInterval(progressInterval);
  }, [items, currentPage]);

  if (loading) return null;
  if (items.length === 0) return null;

  // Calculate total pages
  const totalPages = Math.ceil(items.length / 2);

  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold px-3 mb-3">Популярные Объявления</h2>
      <div className="px-3">
        {/* Sliding carousel */}
        <div className="relative overflow-hidden">
          <div 
            className="flex transition-transform duration-300 ease-in-out"
            style={{ 
              transform: `translateX(-${currentPage * 100}%)`,
            }}
          >
            {Array.from({ length: totalPages }).map((_, pageIndex) => {
              const startIndex = pageIndex * 2;
              const pageItems = items.slice(startIndex, startIndex + 2);
              
              return (
                <div 
                  key={pageIndex}
                  className="min-w-full flex-shrink-0"
                >
                  <div className="grid grid-cols-2 gap-3">
                    {pageItems.map((listing) => (
                      <ListingCard key={listing.id} listing={listing} compact />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Animated progress timeline */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentPage(index);
                  setProgress(0);
                }}
                className="relative h-1.5 rounded-full overflow-hidden transition-all"
                style={{ width: index === currentPage ? '24px' : '6px' }}
                aria-label={`Go to page ${index + 1}`}
              >
                <div className="absolute inset-0 bg-gray-300" />
                {index === currentPage && (
                  <div 
                    className="absolute inset-0 bg-black transition-all"
                    style={{ 
                      width: `${progress}%`,
                      transition: 'width 50ms linear'
                    }}
                  />
                )}
                {index < currentPage && (
                  <div className="absolute inset-0 bg-black" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
