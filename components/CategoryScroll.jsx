"use client";

import { useLang } from "@/lib/i18n-client";
import { CATEGORY_DEFS } from "@/lib/categories";
import { useSearchParams } from "next/navigation";

export default function CategoryScroll() {
  const { lang } = useLang();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get("category");

  const firstRow = CATEGORY_DEFS.slice(0, 8);
  const secondRow = CATEGORY_DEFS.slice(8);

  const handleCategoryClick = (key) => {
      const params = new URLSearchParams(window.location.search);
      if (currentCategory === key) {
          params.delete("category"); // Toggle off
      } else {
          params.set("category", key);
      }
      router.push(`/?${params.toString()}`);
  };

  const renderButton = (cat) => {
      const isActive = currentCategory === cat.key;
      return (
        <button
          key={cat.key}
          type="button"
          onClick={() => handleCategoryClick(cat.key)}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1 border transition-colors ${
              isActive 
              ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white" 
              : "bg-[#F2F3F7] dark:bg-[#262626] text-black dark:text-white border-black/5 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          {cat.icon && (
            <span className="text-sm" aria-hidden="true">
              {cat.icon}
            </span>
          )}
          <span>{cat[lang] || cat.ru}</span>
        </button>
      );
  };

  return (
    <div className="w-full flex justify-center mt-3">
      <div className="w-full max-w-[520px] px-3">
        <div className="overflow-x-auto pb-2 no-scrollbar">
          <div className="inline-flex flex-col gap-2 mx-auto">
            {/* Первый ряд */}
            <div className="flex gap-2 justify-start">
              {firstRow.map(renderButton)}
            </div>

            {/* Второй ряд */}
            {secondRow.length > 0 && (
              <div className="flex gap-2 justify-start">
                {secondRow.map(renderButton)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
