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
  const [pendingCategory, setPendingCategory] = useState(null);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  const handleCategoryClick = (key) => {
      const catDef = CATEGORY_DEFS.find(c => c.key === key);
      const subFilter = catDef?.filters?.find(f => f.key === 'subtype');

      if (subFilter && subFilter.options && subFilter.options.length > 0) {
          setPendingCategory(key);
          setIsSubModalOpen(true);
      } else {
          router.push(`/category/${key}`);
      }
  };

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
          <button 
            key={cat.key} 
            onClick={() => handleCategoryClick(cat.key)}
            className="group relative flex flex-col items-center justify-center p-6 bg-white dark:bg-white/5 rounded-3xl hover:shadow-airbnb-hover transition-all duration-300 active:scale-95 shadow-airbnb border border-gray-100 dark:border-white/10 w-full"
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
            <span className="text-base font-bold text-center text-gray-900 dark:text-gray-100 leading-tight mb-2">
              {cat[lang] || cat.ru}
            </span>

            {/* Subcategories Preview (Visual Only) */}
            {(() => {
                const subFilter = cat.filters?.find(f => f.key === 'subtype');
                if (subFilter && subFilter.options) {
                    return (
                        <div className="flex flex-wrap justify-center gap-1 mt-2 pointer-events-none">
                            {subFilter.options.slice(0, 3).map(opt => (
                                <span key={opt.value} className="px-2 py-0.5 bg-gray-50 dark:bg-white/10 rounded-md text-[10px] text-gray-500 dark:text-gray-400">
                                    {opt.label[lang] || opt.label.ru}
                                </span>
                            ))}
                            {subFilter.options.length > 3 && (
                                <span className="px-2 py-0.5 bg-gray-50 dark:bg-white/10 rounded-md text-[10px] text-gray-500 dark:text-gray-400">
                                    +{subFilter.options.length - 3}
                                </span>
                            )}
                        </div>
                    );
                }
                return null;
            })()}
          </button>
        ))}
      </div>

        {/* Subcategory Selection Modal */}
        {isSubModalOpen && pendingCategory && (() => {
            const catDef = CATEGORY_DEFS.find(c => c.key === pendingCategory);
            const subFilter = catDef?.filters?.find(f => f.key === 'subtype');
            
            return (
                <div 
                    className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setIsSubModalOpen(false)}
                >
                    <div 
                       className="bg-white dark:bg-zinc-900 w-full max-w-[500px] rounded-t-3xl p-5 flex flex-col gap-4 shadow-2xl animate-in slide-in-from-bottom duration-300"
                       onClick={e => e.stopPropagation()}
                    >
                        <div className="w-12 h-1 bg-gray-300 dark:bg-white/20 rounded-full mx-auto mb-2" />
                        
                        <div className="flex items-center gap-3 mb-2">
                             <span className="text-3xl">{catDef?.icon}</span>
                             <h3 className="text-xl font-bold dark:text-white">
                                 {catDef?.[lang] || catDef?.ru}
                             </h3>
                        </div>

                        <div className="grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
                            <button
                                onClick={() => {
                                    router.push(`/category/${pendingCategory}`);
                                    setIsSubModalOpen(false);
                                }}
                                className="p-3 bg-black text-white rounded-xl text-sm font-bold text-center"
                            >
                                {t("all") || "Все"}
                            </button>
                            
                            {subFilter?.options?.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => {
                                        router.push(`/category/${pendingCategory}?dyn_subtype=${opt.value}`);
                                        setIsSubModalOpen(false);
                                    }}
                                    className="p-3 bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-gray-100 dark:hover:bg-white/10 hover:bg-gray-200 rounded-xl text-sm font-medium text-center transition-colors"
                                >
                                    {opt.label[lang] || opt.label.ru}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            );
        })()}
    </div>
  );
}
