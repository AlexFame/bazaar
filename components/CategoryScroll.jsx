"use client";

import { useLang } from "@/lib/i18n-client";
import { CATEGORY_DEFS } from "@/lib/categories";

export default function CategoryScroll() {
  const { lang } = useLang();

  const firstRow = CATEGORY_DEFS.slice(0, 8);
  const secondRow = CATEGORY_DEFS.slice(8);

  return (
    <div className="w-full flex justify-center mt-3">
      <div className="w-full max-w-[520px] px-3">
        {/* ОДИН скролл-контейнер */}
        <div className="overflow-x-auto pb-2">
          {/* Внутри — две строки */}
          <div className="inline-flex flex-col gap-2">
            {/* Первая линия */}
            <div className="flex gap-2 mb-1">
              {firstRow.map((cat) => (
                <button
                  key={cat.key}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full bg-white text-xs font-medium whitespace-nowrap flex items-center"
                >
                  {cat.icon && (
                    <span className="mr-1" aria-hidden="true">
                      {cat.icon}
                    </span>
                  )}
                  <span>{cat[lang] || cat.ru}</span>
                </button>
              ))}
            </div>

            {/* Вторая линия */}
            <div className="flex gap-2">
              {secondRow.map((cat) => (
                <button
                  key={cat.key}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full bg-white text-xs font-medium whitespace-nowrap flex items-center"
                >
                  {cat.icon && (
                    <span className="mr-1" aria-hidden="true">
                      {cat.icon}
                    </span>
                  )}
                  <span>{cat[lang] || cat.ru}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
