"use client";

import { useLang } from "@/lib/i18n-client";
import { CATEGORY_DEFS } from "@/lib/categories";
import { useRouter } from "next/navigation";

export default function CategoryScroll() {
  const { lang } = useLang();
  const router = useRouter();

  const firstRow = CATEGORY_DEFS.slice(0, 8);
  const secondRow = CATEGORY_DEFS.slice(8);

  return (
    <div className="w-full flex justify-center mt-3">
      <div className="w-full max-w-[520px] px-3">
        <div className="overflow-x-auto pb-2">
          <div className="inline-flex flex-col gap-2 mx-auto">
            {/* Первый ряд */}
            <div className="flex gap-2 justify-start">
              {firstRow.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => {
                    const params = new URLSearchParams(window.location.search);
                    params.set("category", cat.key);
                    router.push(`/?${params.toString()}`);
                  }}
                  className="flex-shrink-0 px-4 py-2 rounded-full bg-[#F2F3F7] dark:bg-[#262626] text-xs font-medium whitespace-nowrap flex items-center gap-1 border border-black/5 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-gray-700 text-black dark:text-white transition-colors"
                >
                  {cat.icon && (
                    <span className="text-sm" aria-hidden="true">
                      {cat.icon}
                    </span>
                  )}
                  <span>{cat[lang] || cat.ru}</span>
                </button>
              ))}
            </div>

            {/* Второй ряд */}
            {secondRow.length > 0 && (
              <div className="flex gap-2 justify-start">
                {secondRow.map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => {
                      const params = new URLSearchParams(window.location.search);
                      params.set("category", cat.key);
                      router.push(`/?${params.toString()}`);
                    }}
                    className="flex-shrink-0 px-4 py-2 rounded-full bg-[#F2F3F7] dark:bg-[#262626] text-xs font-medium whitespace-nowrap flex items-center gap-1 border border-black/5 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-gray-700 text-black dark:text-white transition-colors"
                  >
                    {cat.icon && (
                      <span className="text-sm" aria-hidden="true">
                        {cat.icon}
                      </span>
                    )}
                    <span>{cat[lang] || cat.ru}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
