"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useLang } from "@/lib/i18n-client";
import BackButton from "@/components/BackButton";
import Link from "next/link";
import { 
  EyeIcon, 
  HeartIcon, 
  ShareIcon, 
  ChartBarIcon, 
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  PhoneIcon
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartIconSolid } from "@heroicons/react/24/solid";

function StatisticsListingItem({ listing, t, sortBy }) {
  const [imageError, setImageError] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    let path = listing.main_image_path || listing.image_path;
    if (Array.isArray(path)) path = path[0];

    if (path && typeof path === 'string') {
      const trimmed = path.trim();
      if (trimmed.length > 4 && !trimmed.toLowerCase().includes('photo') && !trimmed.toLowerCase().includes('фото')) {
        const src = trimmed.startsWith('http') 
          ? trimmed 
          : supabase.storage.from("listing-images").getPublicUrl(trimmed).data.publicUrl;
        setImageUrl(src);
        setImageError(false); // Reset error when image path changes
        return;
      }
    }
    setImageUrl(null);
    setImageError(false); // Reset error if no valid image path
  }, [listing]);

  return (
    <Link
      href={`/listing/${listing.id}`}
      className="block bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 hover:shadow-airbnb dark:hover:bg-white/10 transition-all"
    >
      <div className="flex items-center gap-4">
        {/* Image */}
        <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-xl overflow-hidden flex-shrink-0 relative">
          {imageUrl && !imageError ? (
            <img
              src={imageUrl}
              alt={listing.title}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">{listing.title}</h3>
          
          {/* Detailed Stats Row */}
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 mt-3 text-xs sm:grid-cols-4 items-center">
            {/* 1. Views */}
            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5" title={t.views}>
              <EyeIcon className="w-4 h-4" /> 
              <span className="font-semibold">{listing.views_count || 0}</span>
            </span>
            
            {/* 2. Favorites (conditionally render, but keep slot) */}
            {(listing.favorites_count > 0 || sortBy === 'favorites') ? (
                <span className="text-red-500 flex items-center gap-1.5 font-medium" title={t.totalFavorites}>
                  <HeartIconSolid className="w-4 h-4" /> {listing.favorites_count || 0}
                </span>
            ) : <span />}

             {/* 3. Impressions (CTR) - Changed Icon */}
            <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1.5 font-medium" title="Impressions (CTR)">
               <ChartBarIcon className="w-4 h-4" /> 
               {listing.impressions_count || 0} ({listing.ctr?.toFixed(1)}%)
            </span>

            {/* 4. Days Active */}
            <span className="text-gray-400 flex items-center gap-1.5 justify-self-end text-[10px]" title={t.daysActive}>
              <CalendarIcon className="w-3.5 h-3.5" /> {listing.days_active} {t.daysActive?.toLowerCase()}
            </span>
          </div>
        </div>

        {/* Arrow */}
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

export default function ProfileStatisticsPage() {
  const router = useRouter();
  const { t: tLang, lang } = useLang();
  
  const translations = {
    ru: {
      title: "Статистика профиля",
      totalViews: "Всего просмотров",
      totalContacts: "Всего контактов",
      totalMessages: "Всего сообщений",
      totalFavorites: "В избранном",
      totalShares: "Репостов",
      avgConversion: "Конверсия",
      activeListings: "Активных объявлений",
      totalListings: "Всего объявлений",
      myListings: "Мои объявления",
      views: "просмотров",
      noListings: "У вас пока нет объявлений",
      createFirst: "Создайте первое объявление",
      sortByFavorites: "Сортировка по избранному",
      resetSort: "Сбросить",
      daysActive: "дн.",
    },
    ua: {
      title: "Статистика профілю",
      totalViews: "Всього переглядів",
      totalContacts: "Всього контактів",
      totalMessages: "Всього повідомлень",
      totalFavorites: "В обраному",
      totalShares: "Репостів",
      avgConversion: "Конверсія",
      activeListings: "Активних оголошень",
      totalListings: "Всього оголошень",
      myListings: "Мої оголошення",
      views: "переглядів",
      noListings: "У вас поки немає оголошень",
      createFirst: "Створіть перше оголошення",
      sortByFavorites: "Сортування за обраним",
      resetSort: "Скинути",
      daysActive: "дн.",
    },
    en: {
      title: "Profile Statistics",
      totalViews: "Total Views",
      totalContacts: "Total Contacts",
      totalMessages: "Total Messages",
      totalFavorites: "In Favorites",
      totalShares: "Total Shares",
      avgConversion: "Avg. Conversion",
      activeListings: "Active Listings",
      totalListings: "Total Listings",
      myListings: "My Listings",
      views: "views",
      noListings: "You don't have any listings yet",
      createFirst: "Create your first listing",
      sortByFavorites: "Sort by favorites",
      resetSort: "Reset",
      daysActive: "d.",
    }
  };

  const t = translations[lang] || translations.ru;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalViews: 0,
    totalContacts: 0,
    totalMessages: 0,
    totalFavorites: 0,
    totalShares: 0,
    avgConversion: 0,
    activeListings: 0,
    totalListings: 0
  });
  const [listings, setListings] = useState([]);
  const [sortBy, setSortBy] = useState("date"); // 'date' | 'favorites'

  useEffect(() => {
    async function loadData() {
      try {
        let userId = null;

        // 1. Try Supabase Auth
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            userId = user.id;
        } else {
            // 2. Try Telegram WebApp
            if (typeof window !== "undefined") {
                const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
                if (tgUser?.id) {
                    // Fetch profile by Telegram ID
                    const { data: profile } = await supabase
                        .from("profiles")
                        .select("id")
                        .eq("tg_user_id", tgUser.id)
                        .single();
                    
                    if (profile) {
                        userId = profile.id;
                    }
                }
            }
        }

        if (!userId) {
          // No user found - just show empty state
          console.warn("No user ID found");
          setLoading(false);
          return;
        }

        // Load all user listings
        const { data: listingsData, error: listingsError} = await supabase
          .from("listings")
          .select("*")
          .eq("created_by", userId)
          .order("created_at", { ascending: false });

        if (listingsError) {
          console.error("Error loading listings:", listingsError);
          setLoading(false);
          return;
        }

        // Calculate aggregated stats
        const totalViews = listingsData?.reduce((sum, l) => sum + (l.views_count || 0), 0) || 0;
        const totalContacts = listingsData?.reduce((sum, l) => sum + (l.contacts_count || 0), 0) || 0;
        const activeCount = listingsData?.filter(l => l.status === "active").length || 0;

        // Get favorites count per listing
        const listingIds = listingsData?.map(l => l.id) || [];
        let favoritesCount = 0;
        let sharesCount = 0;
        let listingsWithStats = listingsData || [];

        if (listingIds.length > 0) {
          // Fetch Favorites
          const { data: allFavorites } = await supabase
            .from("favorites")
            .select("listing_id")
            .in("listing_id", listingIds);
          
          favoritesCount = allFavorites?.length || 0;

          // Fetch Shares (from analytics events)
          const { data: shareEvents } = await supabase
            .from("listing_analytics_events")
            .select("listing_id")
            .eq("event_type", "share")
            .in("listing_id", listingIds);
          
          sharesCount = shareEvents?.length || 0;

          // Map counts to listings
          const favoritesMap = {};
          allFavorites?.forEach(f => {
            favoritesMap[f.listing_id] = (favoritesMap[f.listing_id] || 0) + 1;
          });

          const sharesMap = {};
          shareEvents?.forEach(s => {
            sharesMap[s.listing_id] = (sharesMap[s.listing_id] || 0) + 1;
          });

          // Fetch Messages count per listing
           const { data: messageCounts } = await supabase
            .from("messages")
            .select("listing_id")
            .in("listing_id", listingIds);
            
           const messagesMap = {};
           messageCounts?.forEach(m => {
               messagesMap[m.listing_id] = (messagesMap[m.listing_id] || 0) + 1;
           });


          listingsWithStats = listingsData.map(l => {
            const views = l.views_count || 0;
            const contacts = l.contacts_count || 0;
            const messages = messagesMap[l.id] || 0;
            const shares = sharesMap[l.id] || 0;
            
            // Conversion: (Contacts + Messages) / Views * 100
            const conversion = views > 0 ? ((contacts + messages) / views) * 100 : 0;

            // Days Active
            const created = new Date(l.created_at);
            const now = new Date();
            const daysActive = Math.max(0, Math.floor((now - created) / (1000 * 60 * 60 * 24)));

            return {
              ...l,
              favorites_count: favoritesMap[l.id] || 0,
              shares_count: shares,
              messages_count: messages,
              conversion_rate: conversion,
              days_active: daysActive
            };
          });
          // Fetch Impressions (Search Appearances)
          const { data: impressionEvents } = await supabase
            .from("listing_analytics_events")
            .select("listing_id")
            .eq("event_type", "impression")
            .in("listing_id", listingIds);
          
          const impressionsMap = {};
          impressionEvents?.forEach(i => {
              impressionsMap[i.listing_id] = (impressionsMap[i.listing_id] || 0) + 1;
          });

          listingsWithStats = listingsData.map(l => {
            const views = l.views_count || 0;
            const contacts = l.contacts_count || 0; // Will be populated after migration
            const messages = messagesMap[l.id] || 0;
            const shares = sharesMap[l.id] || 0;
            const impressions = impressionsMap[l.id] || 0;
             
            // CTR: Views / Impressions * 100
             const ctr = impressions > 0 ? (views / impressions) * 100 : 0;
            
            // Conversion: (Contacts + Messages) / Views * 100
            const conversion = views > 0 ? ((contacts + messages) / views) * 100 : 0;

            // Days Active
            const created = new Date(l.created_at);
            const now = new Date();
            const daysActive = Math.max(0, Math.floor((now - created) / (1000 * 60 * 60 * 24)));

            return {
              ...l,
              favorites_count: favoritesMap[l.id] || 0,
              shares_count: shares,
              messages_count: messages,
              impressions_count: impressions,
              ctr: ctr,
              conversion_rate: conversion,
              days_active: daysActive
            };
          });
        }

        // Get total messages count
        let messagesCount = 0;
        if (listingIds.length > 0) {
          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .in("listing_id", listingIds);
          messagesCount = count || 0;
        }

        // Calculate Average Conversion across all listings
        const totalInteractions = totalContacts + messagesCount;
        const avgConversion = totalViews > 0 ? (totalInteractions / totalViews) * 100 : 0;

        setListings(listingsWithStats);
        setStats({
          totalViews,
          totalContacts,
          totalMessages: messagesCount,
          totalFavorites: favoritesCount,
          totalShares: sharesCount,
          avgConversion,
          activeListings: activeCount,
          totalListings: listingsData?.length || 0
        });

      } catch (error) {
        console.error("Error loading statistics:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const sortedListings = [...listings].sort((a, b) => {
    if (sortBy === "favorites") {
      return (b.favorites_count || 0) - (a.favorites_count || 0);
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const handleFavoritesClick = (e) => {
    e.preventDefault();
    setSortBy(sortBy === "favorites" ? "date" : "favorites");
    
    // Scroll to listings
    document.getElementById("listings-list")?.scrollIntoView({ behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-airbnb-red"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-24 transition-colors duration-300">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md px-4 py-4 border-b border-gray-100 dark:border-white/10">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-2xl font-bold dark:text-white">{t.title}</h1>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Total Views */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 rounded-3xl p-6 shadow-airbnb dark:shadow-none h-full border border-transparent dark:border-blue-500/20">
            <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
              {stats.totalViews.toLocaleString()}
            </div>
            <div className="text-sm font-medium text-blue-900 dark:text-blue-300 flex items-center gap-1">
              <EyeIcon className="w-4 h-4" /> {t.totalViews}
            </div>
          </div>

          {/* Total Favorites (Click to sort) */}
          <button 
            onClick={handleFavoritesClick} 
            className={`block w-full text-left hover:scale-[1.02] active:scale-95 transition-transform ${sortBy === 'favorites' ? 'ring-2 ring-red-400' : ''}`}
          >
            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10 rounded-3xl p-6 shadow-airbnb dark:shadow-none h-full relative overflow-hidden border border-transparent dark:border-red-500/20">
              {sortBy === 'favorites' && (
                 <div className="absolute top-3 right-3 text-red-500">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                 </div>
              )}
              <div className="text-4xl font-bold text-red-600 dark:text-red-400 mb-2">
                {stats.totalFavorites.toLocaleString()}
              </div>
              <div className="text-sm font-medium text-red-900 dark:text-red-300 flex items-center gap-1">
                <HeartIconSolid className="w-4 h-4" /> {t.totalFavorites}
              </div>
            </div>
          </button>

          {/* Total Shares */}
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-900/10 rounded-3xl p-6 shadow-airbnb dark:shadow-none h-full border border-transparent dark:border-indigo-500/20">
            <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
              {stats.totalShares.toLocaleString()}
            </div>
            <div className="text-sm font-medium text-indigo-900 dark:text-indigo-300 flex items-center gap-1">
              <ShareIcon className="w-4 h-4" /> {t.totalShares}
            </div>
          </div>

          {/* Avg Conversion */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-900/10 rounded-3xl p-6 shadow-airbnb dark:shadow-none h-full border border-transparent dark:border-emerald-500/20">
            <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
              {stats.avgConversion.toFixed(1)}%
            </div>
            <div className="text-sm font-medium text-emerald-900 dark:text-emerald-300 flex items-center gap-1">
              <ChartBarIcon className="w-4 h-4" /> {t.avgConversion}
            </div>
          </div>
        </div>

        {/* Secondary Stats Row */}
        <div className="grid grid-cols-2 gap-4 mb-6">
           {/* Total Contacts */}
           <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 rounded-3xl p-6 shadow-airbnb dark:shadow-none h-full border border-transparent dark:border-green-500/20">
             <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
               {stats.totalContacts.toLocaleString()}
             </div>
             <div className="text-sm font-medium text-green-900 dark:text-green-300 flex items-center gap-1">
               <PhoneIcon className="w-4 h-4" /> {t.totalContacts}
             </div>
           </div>

          {/* Total Messages */}
          <Link href="/messages" className="block hover:scale-[1.02] active:scale-95 transition-transform">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10 rounded-3xl p-6 shadow-airbnb dark:shadow-none h-full border border-transparent dark:border-purple-500/20">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                {stats.totalMessages.toLocaleString()}
              </div>
              <div className="text-sm font-medium text-purple-900 dark:text-purple-300 flex items-center gap-1">
                <ChatBubbleLeftRightIcon className="w-4 h-4" /> {t.totalMessages}
              </div>
            </div>
          </Link>
        </div>

        {/* Listings Count */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Link href="/my?tab=active" className="block hover:scale-[1.02] active:scale-95 transition-transform">
            <div className="bg-white dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-sm h-full">
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {stats.activeListings}
              </div>
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400">{t.activeListings}</div>
            </div>
          </Link>

          <Link href="/my" className="block hover:scale-[1.02] active:scale-95 transition-transform">
            <div className="bg-white dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-sm h-full">
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {stats.totalListings}
              </div>
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400">{t.totalListings}</div>
            </div>
          </Link>
        </div>

        {/* Listings List */}
        <div className="mt-8" id="listings-list">
          <div className="flex items-center justify-between mb-4">
             <h2 className="text-xl font-bold dark:text-white">{t.myListings}</h2>
             {sortBy === 'favorites' && (
                <button 
                  onClick={() => setSortBy('date')}
                  className="text-sm text-red-500 font-medium"
                >
                  {t.resetSort}
                </button>
             )}
          </div>
          
          {sortedListings.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-white/5 rounded-3xl">
              <p className="text-gray-500 mb-4">{t.noListings}</p>
              <Link 
                href="/create"
                className="inline-block px-6 py-3 bg-airbnb-red text-white rounded-full font-medium hover:scale-105 transition-transform"
              >
                {t.createFirst}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedListings.map((listing) => (
                <StatisticsListingItem 
                  key={listing.id} 
                  listing={listing} 
                  t={t} 
                  sortBy={sortBy} 
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
