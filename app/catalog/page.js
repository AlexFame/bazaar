"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORY_DEFS } from "@/lib/categories";
import { useLang } from "@/lib/i18n-client";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import BackButton from "@/components/BackButton";

export default function CatalogPage() {
  const { t, lang } = useLang();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  // Filter categories based on search
  const filteredCategories = CATEGORY_DEFS.filter((cat) => {
    const name = cat[lang] || cat.ru;
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md px-4 py-4 border-b border-gray-100 dark:border-white/10">
        <div className="flex items-center gap-3 mb-4">
            <BackButton />
            <h1 className="text-2xl font-bold dark:text-white">Каталог</h1>
        </div>
        
        {/* Search in Catalog */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder={t("catalog_search_placeholder") || "Поиск категории..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-white/10 rounded-xl leading-5 bg-gray-50 dark:bg-white/10 dark:text-white placeholder-gray-500 focus:outline-none focus:bg-white dark:focus:bg-black focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
          />
        </div>
      </div>

      {/* Categories Grid */}
      <div className="p-4 grid grid-cols-2 gap-4">
        {filteredCategories.map((cat) => (
          <Link 
            key={cat.key} 
            href={`/category/${cat.key}`}
            className="group relative flex flex-col items-center justify-center p-6 bg-white dark:bg-white/5 rounded-3xl hover:shadow-airbnb-hover transition-all duration-300 active:scale-95 shadow-airbnb border border-gray-100 dark:border-white/10"
          >
            {/* Icon/Emoji */}
            <div className="relative w-full flex items-center justify-center mb-3">
              <div className="w-16 h-16 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-white/10 dark:to-white/5 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                <span className="text-4xl drop-shadow-sm">
                  {cat.icon}
                </span>
              </div>
            </div>
            
            {/* Title */}
            <span className="text-base font-bold text-center text-gray-900 dark:text-gray-100 leading-tight">
              {cat[lang] || cat.ru}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
