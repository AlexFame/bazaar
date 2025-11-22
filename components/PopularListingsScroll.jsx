"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ListingCard from "./ListingCard";
import { useLang } from "@/lib/i18n-client";


// быстрее: 6 секунд на один слайд
const SLIDE_DURATION = 6000;

export default function PopularListingsScroll() {
  const { lang } = useLang();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentIndex, setCurrentIndex] = useState(0);

  // грузим популярные объявления
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("listings")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(12);

        if (error) {
          console.error("Ошибка загрузки популярных объявлений:", error);
          if (!cancelled) setItems([]);
          return;
        }

        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Ошибка:", e);
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => (cancelled = true);
  }, []);

  // автопереключение
  useEffect(() => {
    if (!items.length) return;

    setCurrentIndex(0);

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % Math.ceil(items.length / 2);
        return next;
      });
    }, SLIDE_DURATION);

    return () => clearInterval(interval);
  }, [items.length]);

  if (loading || !items.length) return null;

  const title = t("popularListings");

  // разбиваем на группы по 2
  const slides = [];
  for (let i = 0; i < items.length; i += 2) {
    slides.push(items.slice(i, i + 2));
  }

  return (
    <div className="w-full flex justify-center mt-3">
      <div className="w-full max-w-[520px] px-3">
        <div className="flex items-center justify-between mb-1 px-0.5">
          <p className="text-sm font-semibold">{title}</p>
        </div>

        {/* СЛАЙДЕР ПО 2 КАРТОЧКИ */}
        <div className="relative w-full overflow-hidden">
          <div
            className="flex transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {slides.map((pair, idx) => (
              <div
                key={idx}
                className="w-full flex-shrink-0 grid grid-cols-2 gap-2"
              >
                {pair.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* прогресс */}
        {slides.length > 1 && (
          <div className="mt-2 h-1 w-full rounded-full bg-black/10 overflow-hidden">
            <div
              key={currentIndex}
              className="h-full bg-black progress-bar"
              style={{ animationDuration: `${SLIDE_DURATION}ms` }}
            />
          </div>
        )}

        <style jsx>{`
          .progress-bar {
            width: 0%;
            animation-name: progressFill;
            animation-timing-function: linear;
            animation-iteration-count: 1;
            animation-fill-mode: forwards;
          }

          @keyframes progressFill {
            from {
              width: 0%;
            }
            to {
              width: 100%;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
