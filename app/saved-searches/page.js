"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getTelegramUser } from "@/lib/telegram";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useLang } from "@/lib/i18n-client";

const translations = {
  ru: {
    back: "← Назад",
    title: "Сохраненные поиски",
    loading: "Загрузка...",
    empty: "Нет сохраненных поисков.",
    confirm_delete: "Удалить этот поиск?"
  },
  ua: {
    back: "← Назад",
    title: "Збережені пошуки",
    loading: "Завантаження...",
    empty: "Немає збережених пошуків.",
    confirm_delete: "Видалити цей пошук?"
  },
  en: {
    back: "← Back",
    title: "Saved Searches",
    loading: "Loading...",
    empty: "No saved searches.",
    confirm_delete: "Delete this search?"
  }
};

export default function SavedSearchesPage() {
  const { lang } = useLang();
  const t = translations[lang] || translations.ru;
  const [searches, setSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadSearches() {
      const tgUser = getTelegramUser();
      if (!tgUser) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("id").eq("tg_user_id", tgUser.id).single();
      if (!profile) {
          setLoading(false);
          return;
      }

      const { data, error } = await supabase
        .from("saved_searches")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });

      if (!error) {
        setSearches(data);
      }
      setLoading(false);
    }

    loadSearches();
  }, []);

  async function handleDelete(id) {
      if(!confirm(t.confirm_delete)) return;
      
      const { error } = await supabase.from("saved_searches").delete().eq("id", id);
      if (!error) {
          setSearches(searches.filter(s => s.id !== id));
      }
  }

  function applySearch(search) {
      const p = search.query_params;
      const params = new URLSearchParams();
      
      // Support both new 'query' and legacy/current 'searchTerm'
      if (p.query) params.set("q", p.query);
      else if (p.searchTerm) params.set("q", p.searchTerm);

      if (p.locationFilter) params.set("location", p.locationFilter);
      if (p.minPrice) params.set("price_min", p.minPrice);
      if (p.maxPrice) params.set("price_max", p.maxPrice);
      if (p.categoryFilter && p.categoryFilter !== 'all') params.set("category", p.categoryFilter);
      if (p.typeFilter && p.typeFilter !== 'all') params.set("type", p.typeFilter);
      if (p.conditionFilter && p.conditionFilter !== 'all') params.set("condition", p.conditionFilter);
      if (p.barterFilter && p.barterFilter !== 'all') params.set("barter", p.barterFilter);
      if (p.withPhotoFilter && p.withPhotoFilter !== 'all') params.set("photo", p.withPhotoFilter);
      if (p.dateFilter && p.dateFilter !== 'all') params.set("date", p.dateFilter);
      if (p.radiusFilter) params.set("radius", p.radiusFilter);
      
      // Dynamic filters
      if (p.dynamicFilters) {
          Object.entries(p.dynamicFilters).forEach(([k, v]) => {
              if (v) params.set(`dyn_${k}`, v);
          });
      }

      router.push(`/?${params.toString()}`);
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/my" className="text-sm text-gray-500">{t.back}</Link>
        <h1 className="text-xl font-bold">{t.title}</h1>
      </div>

      {loading && <p>{t.loading}</p>}

      {!loading && searches.length === 0 && (
          <p className="text-gray-500 text-center mt-10">{t.empty}</p>
      )}

      <div className="space-y-3">
        {searches.map(search => (
            <div key={search.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer hover:border-black transition-colors" onClick={() => applySearch(search)}>
                <div>
                    <h3 className="font-semibold">{search.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                        {new Date(search.created_at).toLocaleDateString()}
                    </p>
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(search.id); }}
                    className="p-2 text-gray-400 hover:text-red-500"
                >
                    🗑️
                </button>
            </div>
        ))}
      </div>
    </div>
  );
}
