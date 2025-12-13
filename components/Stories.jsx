"use client";

import { useRouter } from "next/navigation";
import { CATEGORY_DEFS } from "@/lib/categories";

export default function Stories({ categoryFilter, setCategoryFilter, lang, txt }) {
  const router = useRouter();

  return (
    <div className="pt-3 pb-1 max-w-[520px] mx-auto">
      <div className="overflow-x-auto no-scrollbar">
        <div className="flex gap-4 min-w-min px-4">
          {/* All Categories "Story" */}
          <button
            onClick={() => router.push('/catalog')}
            className="flex flex-col items-center gap-1.5 min-w-[64px]"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all ${categoryFilter === 'all' ? 'border-black p-0.5' : 'border-transparent'}`}>
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-white text-xl">
                ♾️
              </div>
            </div>
            <span className={`text-[10px] font-medium text-center leading-tight ${categoryFilter === 'all' ? 'text-black font-bold' : 'text-gray-500'}`}>
              {txt.allCategories || "Все"}
            </span>
          </button>

          {CATEGORY_DEFS.map(cat => {
              const getSafeLabel = (obj, fallback) => {
                  if (typeof obj === 'string') return obj;
                  if (!obj || typeof obj !== 'object') return fallback;
                  return obj[lang] || obj.ru || obj.en || obj.ua || fallback;
              };

            return (
            <button
              key={cat.key}
              onClick={() => setCategoryFilter(cat.key)}
              className="flex flex-col items-center gap-1.5 min-w-[64px]"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all ${categoryFilter === cat.key ? 'border-black p-0.5' : 'border-transparent'}`}>
                <div
                  className="w-full h-full rounded-full flex items-center justify-center text-2xl shadow-sm"
                  style={{ backgroundColor: cat.background || '#f3f4f6' }}
                >
                  {cat.icon}
                </div>
              </div>
              <span className={`text-[10px] font-medium text-center leading-tight line-clamp-2 max-w-[70px] ${categoryFilter === cat.key ? 'text-black font-bold' : 'text-gray-500'}`}>
                {getSafeLabel(cat, cat.ru)}
              </span>
            </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
