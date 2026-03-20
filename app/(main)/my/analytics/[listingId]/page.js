"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useLang } from "@/lib/i18n-client";
import BackButton from "@/components/BackButton";
import Image from "next/image";
import { getTelegramUser } from "@/lib/telegram";

export default function AnalyticsPage() {
  const { listingId } = useParams();
  const router = useRouter();
  const { t } = useLang();

  const [loading, setLoading] = useState(true);
  const [listing, setListing] = useState(null);
  const [stats, setStats] = useState([]);
  const [totalStats, setTotalStats] = useState({
    views: 0,
    contacts: 0,
    messages: 0,
    favorites: 0
  });
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    async function loadData() {
      if (!listingId) return;

      try {
        // 1. Verify Authentication (Standard)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            // For Analytics, we really need a session for the RPC to work with auth.uid()
            // If user is not logged in via Supabase, RLS/RPC might fail if it relies on auth.uid()
            // The RPC uses `auth.uid()`.
            // So we need to ensure we are logged in.
            // If we are getting "Access Denied", implies we ARE logged in but ID mismatch OR not logged in.
            
            // Try to rely on the generic fetch if RPC fails?
            // No, let's try RPC first.
        }

        // 2. Fetch via RPC
        const { data, error } = await supabase
          .rpc('get_listing_analytics', { target_listing_id: listingId });

        if (error) {
            console.error("RPC Error:", error);
            if (error.message.includes("Access denied")) {
                 setErrorMsg(t("analytics_access_denied_text"));
            } else if (error.message.includes("Not authenticated")) {
                 setErrorMsg(t("analytics_login_required"));
            } else {
                 setErrorMsg(t("analytics_error_prefix") + error.message);
            }
            return;
        }

        if (!data || data.length === 0) {
             setErrorMsg(t("analytics_listing_not_found"));
             return;
        }

        const row = data[0];
        
        // Fetch listing details for preview (Title, Image) - simpler query
        const { data: listingData } = await supabase
            .from('listings')
            .select('title, price, main_image_path')
            .eq('id', listingId)
            .single();

        setListing(listingData || { title: t("no_title") || 'Объявление', price: 0 });

        setStats(row.daily_stats || []);
        setTotalStats({
            views: row.views_count,
            contacts: row.contacts_count,
            messages: row.messages_count,
            favorites: row.favorites_count
        });

      } catch (error) {
        console.error("Error:", error);
        setErrorMsg((t("analytics_unknown_error") || "Неизвестная ошибка: ") + error.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [listingId, router, t]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-white"></div>
      </div>
    );
  }

  if (errorMsg) {
      return (
          <div className="min-h-screen bg-white dark:bg-black p-6 flex flex-col items-center justify-center text-center">
              <h1 className="text-xl font-bold text-red-500 mb-2">{errorMsg === t("analytics_access_denied_text") ? t("analytics_access_denied_title") : t("analytics_error_title")}</h1>
              <p className="text-gray-600 dark:text-gray-300 mb-4">{errorMsg}</p>
              <BackButton />
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
          <h1 className="text-lg font-bold text-black dark:text-white">{t("analytics_title") || "Статистика"}</h1>
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
              <div className="text-blue-500 dark:text-blue-400 text-xs font-medium mb-1">{t("analytics_views") || "Просмотры"}</div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{totalStats.views}</div>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl">
              <div className="text-green-500 dark:text-green-400 text-xs font-medium mb-1">{t("analytics_contacts") || "Контакты"}</div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">{totalStats.contacts}</div>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl">
              <div className="text-purple-500 dark:text-purple-400 text-xs font-medium mb-1">{t("analytics_messages") || "Сообщения"}</div>
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{totalStats.messages}</div>
            </div>
            <div className="p-4 bg-pink-50 dark:bg-pink-900/20 rounded-2xl">
              <div className="text-pink-500 dark:text-pink-400 text-xs font-medium mb-1">{t("analytics_favorites") || "В избранном"}</div>
              <div className="text-2xl font-bold text-pink-700 dark:text-pink-300">{totalStats.favorites}</div>
            </div>
          </div>

          {/* Views Chart */}
          <div className="bg-white dark:bg-white/5 rounded-2xl p-4 border border-gray-100 dark:border-white/5">
            <h3 className="text-sm font-bold text-black dark:text-white mb-4">{t("analytics_chart_title") || "Просмотры за 30 дней"}</h3>
            
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
                  {t("analytics_no_data") || "Нет данных за этот период"}
                </div>
              )}
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-gray-400">
              <span>{t("analytics_days_ago") || "30 дней назад"}</span>
              <span>{t("analytics_today") || "Сегодня"}</span>
            </div>
          </div>

          {/* Engagement Tip */}
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl flex gap-3">
            <div className="text-2xl">💡</div>
            <div>
              <h3 className="text-sm font-bold text-yellow-800 dark:text-yellow-200 mb-1">{t("analytics_tip_title") || "Совет"}</h3>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                {t("analytics_tip_text") || "Чтобы получить больше просмотров, попробуйте обновить фотографии или добавить более подробное описание. Также вы можете воспользоваться услугами продвижения."}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
