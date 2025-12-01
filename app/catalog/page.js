"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORY_DEFS } from "@/lib/categories";
import { useLang } from "@/lib/i18n-client";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export default function CatalogPage() {
  const { t, lang } = useLang();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  // Filter categories based on search
  const filteredCategories = Object.entries(CATEGORY_DEFS).filter(([key, def]) => {
    const name = def.name[lang] || def.name.ru;
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md px-4 py-4 border-b border-gray-100">
        <h1 className="text-2xl font-bold mb-4">Каталог</h1>
        
        {/* Search in Catalog */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Поиск категории..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-2 focus:ring-black transition-all"
          />
        </div>
      </div>

      {/* Categories Grid */}
      <div className="p-4 grid grid-cols-2 gap-4">
        {filteredCategories.map(([key, def]) => (
          <Link 
            key={key} 
            href={`/?category=${key}`}
            className="group relative flex flex-col items-center justify-center p-6 bg-gray-50 rounded-3xl hover:bg-gray-100 transition-all duration-300 active:scale-95 aspect-square"
          >
            {/* Icon/Emoji with background glow */}
            <div className="relative w-20 h-20 flex items-center justify-center mb-3">
              <div className="absolute inset-0 bg-white rounded-full shadow-sm opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
              <span className="relative text-5xl drop-shadow-sm transform group-hover:scale-110 transition-transform duration-300">
                {def.icon}
              </span>
            </div>
            
            {/* Title */}
            <span className="text-sm font-bold text-center text-gray-900 leading-tight px-2">
              {def.name[lang] || def.name.ru}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
