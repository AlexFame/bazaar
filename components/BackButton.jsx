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



  // Force HIDE Telegram BackButton to keep "Close" button visible
  useEffect(() => {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.BackButton) {
          const bb = window.Telegram.WebApp.BackButton;
          // Always hide it, as user requested to keep "Close"
          bb.hide();
          
          // Cleanup just in case
          return () => {
              bb.hide();
          };
      }
  }, [router]);

  return (
    <button
      onClick={handleBack}
      className={`inline-flex items-center px-3 py-1.5 rounded-full border border-black dark:border-white text-xs font-medium bg-white dark:bg-black text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors ${className}`}
    >
      ← {label}
    </button>
  );
}
