"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ListingCard from "./ListingCard";
import { useLang } from "@/lib/i18n-client";

export default function PopularListingsScroll() {
  const { lang, t } = useLang();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load popular listings
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("listings")
          .select(`
            *,
            listing_images(image_path),
            profiles:created_by(is_verified, username, first_name, last_name, avatar_url)
          `)
          .eq("status", "active")
          .order("views_count", { ascending: false })
          .limit(12);

        if (error) {
          console.error("Error loading popular listings:", error);
          if (!cancelled) setItems([]);
          return;
        }

        if (!cancelled) setItems(Array.isArray(data) ? data : []);
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

  if (loading || !items.length) return null;

  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold px-4 mb-3">Популярное</h2>
      <div className="relative">
        <div className="flex overflow-x-auto px-4 gap-3 pb-4 no-scrollbar snap-x snap-mandatory mask-fade-right">
          {items.map((listing) => (
            <div key={listing.id} className="min-w-[160px] w-[160px] snap-center">
              <ListingCard listing={listing} compact />
            </div>
          ))}
        </div>
        {/* Gradient overlay for scroll indication */}
        <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
