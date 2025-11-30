"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useLang } from "@/lib/i18n-client";
import BackButton from "@/components/BackButton";
import Image from "next/image";

export default function AnalyticsPage() {
  const { listingId } = useParams();
  const router = useRouter();
  const { t: tLang, lang } = useLang();
  
  const translations = {
    ru: {
      title: "Статистика",
      views: "Просмотры",
      contacts: "Контакты",
      messages: "Сообщения",
      favorites: "В избранном",
      chartTitle: "Просмотры за 30 дней",
      noData: "Нет данных за этот период",
      daysAgo: "30 дней назад",
      today: "Сегодня",
      tipTitle: "Совет",
      tipText: "Чтобы получить больше просмотров, попробуйте обновить фотографии или добавить более подробное описание. Также вы можете воспользоваться услугами продвижения.",
    },
    ua: {
      title: "Статистика",
      views: "Перегляди",
      contacts: "Контакти",
      messages: "Повідомлення",
      favorites: "В обраному",
      chartTitle: "Перегляди за 30 днів",
      noData: "Немає даних за цей період",
      daysAgo: "30 днів тому",
      today: "Сьогодні",
      tipTitle: "Порада",
      tipText: "Щоб отримати більше переглядів, спробуйте оновити фотографії або додати більш детальний опис. Також ви можете скористатися послугами просування.",
    },
    en: {
      title: "Analytics",
      views: "Views",
      contacts: "Contacts",
      messages: "Messages",
      favorites: "Favorites",
      chartTitle: "Views for 30 days",
      noData: "No data for this period",
      daysAgo: "30 days ago",
      today: "Today",
      tipTitle: "Tip",
      tipText: "To get more views, try updating photos or adding a more detailed description. You can also use promotion services.",
    }
  };

  const t = translations[lang] || translations.ru;

  const [loading, setLoading] = useState(true);
  const [listing, setListing] = useState(null);
  const [stats, setStats] = useState([]);
  const [totalStats, setTotalStats] = useState({
    views: 0,
    contacts: 0,
    messages: 0,
    favorites: 0
  });

  useEffect(() => {
    async function loadData() {
      if (!listingId) return;

      try {
        // 1. Verify ownership and get listing details
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        const { data: listingData, error: listingError } = await supabase
          .from("listings")
          .select("*, listing_images(image_path)")
          .eq("id", listingId)
          .single();

        if (listingError || !listingData) {
          console.error("Error loading listing:", listingError);
          router.push("/my");
          return;
        }

        if (listingData.created_by !== user.id) {
          router.push("/my"); // Not owner
          return;
        }

        setListing(listingData);

        // 2. Load daily stats for the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: statsData, error: statsError } = await supabase
          .from("listing_daily_stats")
          .select("*")
          .eq("listing_id", listingId)
          .gte("date", thirtyDaysAgo.toISOString().split('T')[0])
          .order("date", { ascending: true });

        if (statsError) console.error("Error loading stats:", statsError);

        const loadedStats = statsData || [];
        setStats(loadedStats);

        // Calculate totals
        const totals = loadedStats.reduce((acc, curr) => ({
          views: acc.views + (curr.views_count || 0),
          contacts: acc.contacts + (curr.contact_clicks || 0),
          messages: acc.messages + (curr.message_clicks || 0),
          favorites: acc.favorites + (curr.favorite_adds || 0)
        }), { 
          views: listingData.views_count || 0, // Use total views from listing for base
          contacts: 0, 
          messages: 0, 
          favorites: 0 
        });
        
        // Adjust totals from daily stats if needed, but listing.views_count is the source of truth for total views
        // For other metrics, we sum up daily stats
        setTotalStats({
            views: listingData.views_count || 0,
            contacts: loadedStats.reduce((sum, d) => sum + (d.contact_clicks || 0), 0),
            messages: loadedStats.reduce((sum, d) => sum + (d.message_clicks || 0), 0),
            favorites: loadedStats.reduce((sum, d) => sum + (d.favorite_adds || 0), 0),
        });

      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [listingId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-white"></div>
      </div>
    );
  }

  if (!listing) return null;

  // Prepare chart data
  const maxViews = Math.max(...stats.map(s => s.views_count || 0), 10);
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black pb-20">
      <div className="max-w-md mx-auto bg-white dark:bg-[#171717] min-h-screen shadow-xl overflow-hidden relative">
        
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#171717]/80 backdrop-blur-md border-b border-gray-100 dark:border-white/5 px-4 py-3 flex items-center gap-3">
          <BackButton />
          <h1 className="text-lg font-bold text-black dark:text-white">Статистика</h1>
        </div>

        <div className="p-4 space-y-6">
          
          {/* Listing Preview */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
            <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden relative flex-shrink-0">
               {listing.main_image_path ? (
                  <Image 
                    src={`https://phhgutvyirqdgeeclmqg.supabase.co/storage/v1/object/public/listing-images/${listing.main_image_path}`}
                    fill
                    className="object-cover"
                    alt="Listing"
                  />
               ) : (
                 <div className="w-full h-full bg-gray-300" />
               )}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-black dark:text-white truncate">{listing.title}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{listing.price} €</p>
            </div>
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
              <div className="text-blue-500 dark:text-blue-400 text-xs font-medium mb-1">Просмотры</div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{totalStats.views}</div>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl">
              <div className="text-green-500 dark:text-green-400 text-xs font-medium mb-1">Контакты</div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">{totalStats.contacts}</div>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl">
              <div className="text-purple-500 dark:text-purple-400 text-xs font-medium mb-1">Сообщения</div>
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{totalStats.messages}</div>
            </div>
            <div className="p-4 bg-pink-50 dark:bg-pink-900/20 rounded-2xl">
              <div className="text-pink-500 dark:text-pink-400 text-xs font-medium mb-1">В избранном</div>
              <div className="text-2xl font-bold text-pink-700 dark:text-pink-300">{totalStats.favorites}</div>
            </div>
          </div>

          {/* Views Chart */}
          <div className="bg-white dark:bg-white/5 rounded-2xl p-4 border border-gray-100 dark:border-white/5">
            <h3 className="text-sm font-bold text-black dark:text-white mb-4">Просмотры за 30 дней</h3>
            
            <div className="h-40 flex items-end gap-1">
              {stats.length > 0 ? stats.map((day, i) => {
                const height = Math.max(4, (day.views_count / maxViews) * 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center group relative">
                    <div 
                      className="w-full bg-blue-500/20 dark:bg-blue-500/40 rounded-t-sm hover:bg-blue-500 transition-colors"
                      style={{ height: `${height}%` }}
                    ></div>
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[10px] px-2 py-1 rounded pointer-events-none whitespace-nowrap z-10">
                      {new Date(day.date).toLocaleDateString()} : {day.views_count}
                    </div>
                  </div>
                )
              }) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                  Нет данных за этот период
                </div>
              )}
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-gray-400">
              <span>30 дней назад</span>
              <span>Сегодня</span>
            </div>
          </div>

          {/* Engagement Tip */}
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl flex gap-3">
            <div className="text-2xl">💡</div>
            <div>
              <h3 className="text-sm font-bold text-yellow-800 dark:text-yellow-200 mb-1">Совет</h3>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                Чтобы получить больше просмотров, попробуйте обновить фотографии или добавить более подробное описание.
                Также вы можете воспользоваться услугами продвижения.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
