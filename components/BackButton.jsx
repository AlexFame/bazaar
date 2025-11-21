"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useLang } from "@/lib/i18n-client";

const LABELS = {
  ru: "Назад",
  ua: "Назад",
  en: "Back",
};

export default function BackButton({ className = "" }) {
  const router = useRouter();
  const { lang } = useLang();
  const label = LABELS[lang] || LABELS.ru;

  const handleBack = () => {
    router.back();
  };

  // Handle swipe gesture (simple implementation)
  useEffect(() => {
    let touchStartX = 0;
    let touchEndX = 0;

    const handleTouchStart = (e) => {
      touchStartX = e.changedTouches[0].screenX;
    };

    const handleTouchEnd = (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    };

    const handleSwipe = () => {
      // Swipe right (back)
      if (touchEndX - touchStartX > 100) { // Threshold of 100px
        // Only trigger if starting from the left edge (optional, but common for "back")
        if (touchStartX < 50) {
            router.back();
        }
      }
    };

    document.addEventListener("touchstart", handleTouchStart);
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [router]);

  // Try to enable Telegram BackButton
  useEffect(() => {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.BackButton) {
          const bb = window.Telegram.WebApp.BackButton;
          bb.show();
          bb.onClick(handleBack);

          return () => {
              bb.offClick(handleBack);
              bb.hide();
          };
      }
  }, [router]);

  return (
    <button
      onClick={handleBack}
      className={`inline-flex items-center px-3 py-1.5 rounded-full border border-black text-xs font-medium bg-white hover:bg-black hover:text-white transition-colors ${className}`}
    >
      ← {label}
    </button>
  );
}
