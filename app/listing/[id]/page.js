"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useLang } from "@/lib/i18n-client";

export default function ListingPage({ params }) {
  const { id } = params;
  const { t } = useLang();

  const [listing, setListing] = useState(null);
  const [imageUrls, setImageUrls] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!id) return;

    async function loadListing() {
      setLoading(true);
      try {
        const { data: listingData, error: listingError } = await supabase
          .from("listings")
          .select("*")
          .eq("id", id)
          .single();

        if (listingError) {
          console.error("Ошибка загрузки объявления:", listingError);
          return;
        }

        setListing(listingData);

        const folder = `listing-${listingData.id}`;
        let urls = [];

        const { data: files, error: listError } = await supabase.storage
          .from("listing-images")
          .list(folder);

        if (!listError && Array.isArray(files) && files.length > 0) {
          urls = files
            .map((file) => {
              const path = `${folder}/${file.name}`;
              const { data } = supabase.storage
                .from("listing-images")
                .getPublicUrl(path);
              return data?.publicUrl;
            })
            .filter(Boolean);
        } else if (listingData.image_path) {
          const { data } = supabase.storage
            .from("listing-images")
            .getPublicUrl(listingData.image_path);
          if (data?.publicUrl) urls = [data.publicUrl];
        }

        setImageUrls(urls);
        setCurrentIndex(0);
      } catch (err) {
        console.error("Ошибка:", err);
      } finally {
        setLoading(false);
      }
    }

    loadListing();
  }, [id]);

  function handleScroll(e) {
    const scrollLeft = e.target.scrollLeft;
    const width = e.target.clientWidth;
    const index = Math.round(scrollLeft / width);

    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  }

  return (
    <div className="w-full flex justify-center mt-3">
      <div className="w-full max-w-[520px] px-3">
        <div className="mb-3">
          <Link
            href="/"
            className="inline-flex items-center px-3 py-1.5 rounded-full border border-black text-xs font-medium bg-white hover:bg-black hover:text-white transition-colors"
          >
            ← Назад
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-3 shadow-sm">
          {loading && (
            <p className="text-xs text-black/60">Загружаем объявление...</p>
          )}

          {!loading && !listing && (
            <p className="text-xs text-black/60">Объявление не найдено.</p>
          )}

          {!loading && listing && (
            <>
              {/* ГАЛЕРЕЯ СО СКРОЛЛОМ БЕЗ SCROLLBAR */}
              {imageUrls.length > 0 && (
                <>
                  <div
                    className="w-full flex gap-3 overflow-x-auto pb-2 no-scrollbar"
                    style={{
                      scrollSnapType: "x mandatory",
                      WebkitOverflowScrolling: "touch",
                      msOverflowStyle: "none",
                      scrollbarWidth: "none",
                    }}
                    onScroll={handleScroll}
                  >
                    {imageUrls.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`Фото ${i + 1}`}
                        className="rounded-2xl object-cover flex-shrink-0"
                        style={{
                          width: "100%",
                          height: "300px",
                          scrollSnapAlign: "center",
                        }}
                      />
                    ))}
                  </div>

                  <style jsx>{`
                    .no-scrollbar::-webkit-scrollbar {
                      display: none;
                    }
                  `}</style>

                  {/* ТОЧКИ (Airbnb style) */}
                  {imageUrls.length > 1 && (
                    <div className="flex justify-center gap-2 mt-2 mb-3">
                      {imageUrls.map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full transition-all ${
                            i === currentIndex ? "bg-black" : "bg-black/20"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {listing.title && (
                <h1 className="text-sm font-semibold mt-1 mb-1">
                  {listing.title}
                </h1>
              )}

              {typeof listing.price === "number" && (
                <p className="text-sm font-semibold mb-1">{listing.price} €</p>
              )}

              {listing.description && (
                <p className="text-xs text-black/80 whitespace-pre-wrap mb-2">
                  {listing.description}
                </p>
              )}

              {listing.location_text && (
                <p className="text-xs mt-1 text-black/60">
                  {listing.location_text}
                </p>
              )}

              {listing.contacts && listing.contacts !== "EMPTY" && (
                <p className="text-xs mt-1 text-black/60">{listing.contacts}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
