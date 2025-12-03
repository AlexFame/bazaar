"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useLang } from "@/lib/i18n-client";

const LABELS = {
  ru: "Назад",
  ua: "Назад",
  en: "Back",
};

export default function BackButton({ className = "" }) {
  const router = useRouter();
  const pathname = usePathname();
  const { lang } = useLang();
  const label = LABELS[lang] || LABELS.ru;

  const handleBack = () => {
    router.back();
  };

  // Handle swipe gesture with visual feedback
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;
    const container = document.querySelector('.telegram-container') || document.body;

    const handleTouchStart = (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      isSwiping = false;
    };

    const handleTouchMove = (e) => {
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const diffX = currentX - touchStartX;
      const diffY = Math.abs(currentY - touchStartY);

      // Only trigger if starting from the left edge (20px) and moving mostly horizontally
      if (touchStartX < 30 && diffX > 0 && diffX > diffY) {
        e.preventDefault(); // Prevent native scroll/back if possible
        isSwiping = true;
        
        // Visual feedback: move the container
        container.style.transform = `translateX(${diffX}px)`;
        container.style.transition = 'none';
      }
    };

    const handleTouchEnd = (e) => {
      if (!isSwiping) return;

      const touchEndX = e.changedTouches[0].clientX;
      const diffX = touchEndX - touchStartX;

      // Threshold to trigger back
      if (diffX > 100) {
        // Success: animate out and navigate back
        container.style.transition = 'transform 0.2s ease-out';
        container.style.transform = 'translateX(100%)';
        
        // Haptic feedback
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        }

        setTimeout(() => {
            router.back();
            // Reset after navigation (though page might unmount)
            setTimeout(() => {
                container.style.transform = '';
                container.style.transition = '';
            }, 300);
        }, 200);
      } else {
        // Cancel: animate back to 0
        container.style.transition = 'transform 0.2s ease-out';
        container.style.transform = 'translateX(0px)';
        
        setTimeout(() => {
            container.style.transform = '';
            container.style.transition = '';
        }, 200);
      }
      
      isSwiping = false;
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: false });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      // Ensure cleanup
      container.style.transform = '';
      container.style.transition = '';
    };
  }, [router, pathname]);

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
