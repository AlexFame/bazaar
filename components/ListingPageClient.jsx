"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ListingPageClient() {
  const params = useParams();
  const router = useRouter();

  const [listing, setListing] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    if (!params?.id) return;
    loadListing(params.id);
  }, [params?.id]);

  async function loadListing(id) {
    try {
      setLoading(true);
      setErrorText("");

      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        console.error("Error loading listing:", error);
        setErrorText("Объявление не найдено.");
        setListing(null);
        return;
      }

      setListing(data);

      if (data.main_image_path || data.image_path) {
        const { data: publicData } = supabase.storage
          .from("listing-images")
          .getPublicUrl(data.main_image_path || data.image_path);

        setImageUrl(publicData?.publicUrl || null);
      } else {
        setImageUrl(null);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="w-full flex justify-center">
      <div className="w-full max-w-xl px-4 pt-10 pb-24">
        {loading && (
          <p className="text-sm text-gray-700">Загрузка объявления…</p>
        )}

        {!loading && errorText && (
          <>
            <p className="text-sm text-red-600 mb-4">{errorText}</p>
            <button
              className="inline-flex rounded-full bg-black text-white text-xs px-4 py-2"
              onClick={() => router.push("/")}
            >
              На главную
            </button>
          </>
        )}

        {!loading && !errorText && listing && (
          <div className="bg-white rounded-3xl px-4 py-4 shadow-sm">
            {imageUrl && (
              <div className="w-full mb-3 rounded-2xl overflow-hidden bg-gray-50">
                <img
                  src={imageUrl}
                  alt={listing.title || "Фото"}
                  className="w-full h-auto object-contain max-h-[500px]"
                />
              </div>
            )}

            <h1 className="text-base font-semibold mb-1">
              {listing.title || "Без названия"}
            </h1>

            {listing.description && (
              <p className="text-sm text-gray-800 mb-2">
                {listing.description}
              </p>
            )}

            <div className="text-sm text-gray-900 mb-1">
              {listing.price ? `${listing.price} €` : ""}
              {listing.city ? ` · ${listing.city}` : ""}
            </div>

            {listing.contact && (
              <div className="text-xs text-gray-700 mb-4">
                Контакт: {listing.contact}
              </div>
            )}

            <button
              className="inline-flex rounded-full bg-black text-white text-xs px-4 py-2"
              onClick={() => router.push("/")}
            >
              На главную
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
