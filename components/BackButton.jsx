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
