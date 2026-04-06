"use client";

import { useLang } from "@/lib/i18n-client";
import { SparklesIcon } from "@heroicons/react/24/solid";

export default function SwipeModeBanner({ onStart }) {
  const { t } = useLang();

  return (
    <div className="w-full px-3 my-4">
      <div 
        className="w-full relative overflow-hidden rounded-2xl p-[2px] cursor-pointer touch-manipulation transition-transform active:scale-95 shadow-lg shadow-purple-500/20"
        onClick={onStart}
      >
        {/* Animated Neon Border Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse"></div>
        
        {/* Inner Content Container */}
        <div className="relative w-full h-full bg-neutral-900 rounded-[14px] flex flex-col items-center justify-center py-6 px-4">
          
          {/* Flame / Sparkle Icon Row */}
          <div className="flex items-center gap-2 mb-2">
            <SparklesIcon className="w-6 h-6 text-pink-400" />
            <h2 className="text-xl md:text-2xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-pink-200 uppercase" style={{ textShadow: '0 2px 10px rgba(255,255,255,0.2)'}}>
              {`${t("swipe_word") || "EXPERTS"} ${t("discover_word") || "NEARBY"}`}
            </h2>
            <SparklesIcon className="w-6 h-6 text-blue-400" />
          </div>

          <p className="text-gray-300 text-xs md:text-sm font-medium mb-4 text-center max-w-[280px]">
             {t("swipe_banner_desc") || "Находите мастеров поблизости в один свайп"}
          </p>

          <button 
            className="rounded-full bg-gradient-to-r from-pink-500 to-purple-600 px-8 py-2 text-sm font-bold text-white shadow-md shadow-pink-500/30 uppercase tracking-widest pointer-events-none"
          >
            {t("swipe_banner_btn") || "НАЧАТЬ"}
          </button>

          {/* Cards illustration decoration (Optional css shapes) */}
          <div className="absolute right-2 top-2 opacity-10 rotate-12">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="white"><path d="M4 6h16v12H4z"/><path d="M3 4h18v16H3z" fill="none" stroke="white" strokeWidth="2"/></svg>
          </div>
        </div>
      </div>
    </div>
  );
}
