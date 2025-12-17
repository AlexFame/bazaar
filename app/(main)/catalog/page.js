"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORY_DEFS } from "@/lib/categories";
import { useLang } from "@/lib/i18n-client";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import BackButton from "@/components/BackButton";

export default function CatalogPage() {
  const { t, lang } = useLang();
  // const { t, lang } = useLang(); // Removed duplicate
  const router = useRouter();
  const searchParams = useSearchParams();
  const startSearch = searchParams.get("q") || "";
  const [searchTerm, setSearchTerm] = useState(startSearch);
  const [isListening, setIsListening] = useState(false);
  // Simple state for Catalog Filters (to be passed via URL)
  const [typeFilter, setTypeFilter] = useState("all"); 
  
  // Sync state with URL param 'cat'
  const catParam = searchParams.get("cat");
  const [selectedCategory, setSelectedCategory] = useState(catParam || null);

  useEffect(() => {
      setSelectedCategory(catParam || null);
  }, [catParam]);

  // Helper to determine primary sub-filter key
  const getPrimaryFilterKey = (catKey) => {
    switch(catKey) {
        case 'jobs': return 'industry';
        case 'pets': return 'product_type';
        case 'business': return 'service_type';
        case 'auto': return 'body_type';
        default: return 'subtype';
    }
  };

  const handleCategoryClick = (key) => {
      // Check if we are selecting a main category with subtypes
      const catDef = CATEGORY_DEFS.find(c => c.key === key);
      const primaryKey = getPrimaryFilterKey(key);
      const subFilter = catDef?.filters?.find(f => f.key === primaryKey);

      if (!selectedCategory && subFilter && subFilter.options && subFilter.options.length > 0) {
          // Open Subcategory View by updating URL
          router.push(`/catalog?cat=${key}`);
      } else {
          // Navigation to Feed
          const params = new URLSearchParams();
          if (typeFilter !== 'all') params.set("type", typeFilter);
          router.push(`/category/${key}?${params.toString()}`);
      }
  };

  const handleSubcategoryClick = (catKey, subKey = null) => {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.set("type", typeFilter);
      
      if (subKey) {
        const primaryKey = getPrimaryFilterKey(catKey);
        params.set(`dyn_${primaryKey}`, subKey);
      }
      
      router.push(`/category/${catKey}?${params.toString()}`);
  };

  const handleBack = () => {
      if (selectedCategory) {
          router.push('/catalog');
      } else {
          router.back();
      }
  };

  // Filter categories based on search
  const filteredCategories = CATEGORY_DEFS.filter((cat) => {
    const name = cat[lang] || cat.ru;
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const currentCategoryDef = selectedCategory ? CATEGORY_DEFS.find(c => c.key === selectedCategory) : null;
  const primaryKey = selectedCategory ? getPrimaryFilterKey(selectedCategory) : 'subtype';
  const subcategories = currentCategoryDef?.filters?.find(f => f.key === primaryKey)?.options || [];

  // Helper to safely render labels
  const getSafeLabel = (obj, fallback) => {
    if (typeof obj === 'string') return obj;
    if (!obj || typeof obj !== 'object') return fallback;
    return obj[lang] || obj.ru || obj.en || obj.ua || fallback;
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-24">
      <div 
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 40px)' }}
        className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md px-4 pb-4 border-b border-gray-100 dark:border-white/10"
      >
        <div className="flex items-center gap-3 mb-4">
            <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 dark:text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
            </button>
            <h1 className="text-2xl font-bold dark:text-white">
                {selectedCategory ? getSafeLabel(currentCategoryDef, currentCategoryDef?.ru) : "Каталог"}
            </h1>
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
            className="block w-full pl-10 pr-10 py-3 border border-gray-200 dark:border-white/10 rounded-xl leading-5 bg-gray-50 dark:bg-white/10 dark:text-white placeholder-gray-500 focus:outline-none focus:bg-white dark:focus:bg-black focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
          />
          
          {/* Voice Search Button */}
          <button
            type="button"
            className={`absolute inset-y-0 right-0 pr-3 flex items-center transition-colors ${
                isListening ? "text-red-500 animate-pulse" : "text-gray-400 hover:text-black dark:hover:text-white"
            }`}
            onClick={() => {
              const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
              if (!SpeechRecognition) {
                alert("Ваш браузер не поддерживает голосовой поиск");
                return;
              }

              if (isListening) {
                 window.voiceRecognition?.stop();
                 setIsListening(false);
                 return;
              }

              const recognition = new SpeechRecognition();
              window.voiceRecognition = recognition;
              
              const langMap = { 'ru': 'ru-RU', 'ua': 'uk-UA', 'en': 'en-US' };
              recognition.lang = langMap[lang] || 'ru-RU';
              recognition.continuous = false;
              recognition.interimResults = true;
              
              recognition.onstart = () => setIsListening(true);
              recognition.onend = () => {
                  setIsListening(false);
                  window.voiceRecognition = null;
              };
              recognition.onerror = (event) => {
                  console.error("Voice error:", event.error);
                  if (event.error === 'not-allowed') {
                       alert("Разрешите доступ к микрофону!");
                  }
                  setIsListening(false);
                  window.voiceRecognition = null;
              };
              
              recognition.onresult = (event) => {
                  let interimTranscript = '';
                  let finalTranscript = '';

                  for (let i = event.resultIndex; i < event.results.length; ++i) {
                      if (event.results[i].isFinal) {
                          finalTranscript += event.results[i][0].transcript;
                      } else {
                          interimTranscript += event.results[i][0].transcript;
                      }
                  }

                  if (finalTranscript) {
                       setSearchTerm(finalTranscript);
                  } else if (interimTranscript) {
                       setSearchTerm(interimTranscript);
                  }
              };
              
              try {
                recognition.start();
              } catch(e) { 
                  console.error(e); 
                  alert("Start error: " + e.message);
                  setIsListening(false); 
              }
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-5 h-5 ${isListening ? "scale-110" : ""}`}>
                {isListening ? (
                    <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" />
                ) : (
                    <>
                      <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                      <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
                    </>
                )}
            </svg>
          </button>
        </div>

        
        
        {/* Type Filters - Only show on main level */}
        {!selectedCategory && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mt-4">
            {[
                { key: 'all', label: t("typeAny") || "Все" },
                { key: 'sell', label: t("typeSell") || "Продам" },
                { key: 'buy', label: t("typeBuy") || "Куплю" },
                { key: 'free', label: t("typeFree") || "Отдам" },
                { key: 'exchange', label: t("typeExchange") || "Обмен" }
            ].map(opt => (
                <button
                    key={opt.key}
                    onClick={() => setTypeFilter(opt.key)}
                    className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                        typeFilter === opt.key
                            ? "bg-black text-white border-black"
                            : "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 border-transparent hover:bg-gray-200 dark:hover:bg-white/20"
                    }`}
                >
                    {opt.label}
                </button>
            ))}
            </div>
        )}
      </div>

      {/* Categories Grid or Subcategories List */}
      <div className="p-4">
        {selectedCategory ? (
            // Subcategories List View
            <div className="flex flex-col gap-2">
                 {/* All in Category */}
                 <button 
                    onClick={() => handleSubcategoryClick(selectedCategory)}
                    className="flex justify-between items-center p-4 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 active:scale-98 transition-all"
                >
                     <span className="font-bold text-lg dark:text-white px-2">{t("allListings") || "Все объявления"}</span>
                </button>

                {subcategories.map(sub => (
                    <button 
                        key={sub.value}
                        onClick={() => handleSubcategoryClick(selectedCategory, sub.value)}
                        className="flex justify-between items-center p-4 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 active:scale-98 transition-all"
                    >
                        <span className="font-medium text-gray-900 dark:text-gray-100">{getSafeLabel(sub.label, sub.label?.ru)}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400">
                             <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                    </button>
                ))}
            </div>
        ) : (
            // Main Categories List View (Same style as Subcategories)
            <div className="flex flex-col gap-2">
                 {/* All Listings Link */}
                 <Link
                    href="/category/all"
                    className="flex justify-between items-center p-4 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 active:scale-98 transition-all"
                >
                    <span className="font-bold text-lg dark:text-white px-2">{t("allListings") || "Все объявления"}</span>
                </Link>

                {filteredCategories.map((cat) => (
                    <button
                        key={cat.key}
                        onClick={() => handleCategoryClick(cat.key)}
                        className="flex justify-between items-center p-4 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 active:scale-98 transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <span className="text-2xl">{cat.icon}</span>
                            <span className="font-bold text-lg text-gray-900 dark:text-gray-100 text-left leading-tight break-words">
                                {getSafeLabel(cat, cat.ru)}
                            </span>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400 flex-shrink-0">
                             <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                    </button>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}
