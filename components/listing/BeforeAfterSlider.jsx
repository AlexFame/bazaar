"use client";

import { useState, useRef, useEffect } from "react";
import { useLang } from "@/lib/i18n-client";

export default function BeforeAfterSlider({ beforeImage, afterImage }) {
  const { t } = useLang();

  if (!beforeImage || !afterImage) return null;

  return (
    <div className="w-full mb-6">
      <h3 className="text-sm font-semibold mb-3 dark:text-white">
          {t("before_after_label") || "До / Після"}
      </h3>
      
      <div className="grid grid-cols-2 gap-2">
         {/* BEFORE */}
         <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 dark:bg-neutral-800 border border-black/5 dark:border-white/5">
            <img
              src={beforeImage}
              alt="Before"
              className="w-full h-full object-cover pointer-events-none"
            />
            <div className="absolute top-2 left-2 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider backdrop-blur-sm">
                {t("label_before") || "До"}
            </div>
         </div>

         {/* AFTER */}
         <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 dark:bg-neutral-800 border border-black/5 dark:border-white/5">
            <img
              src={afterImage}
              alt="After"
              className="w-full h-full object-cover pointer-events-none"
            />
            <div className="absolute top-2 left-2 bg-green-600/80 text-white text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider backdrop-blur-sm">
                {t("label_after") || "Після"}
            </div>
         </div>
      </div>
    </div>
  );
}
