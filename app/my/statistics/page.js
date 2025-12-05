"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useLang } from "@/lib/i18n-client";
import BackButton from "@/components/BackButton";
import Link from "next/link";

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
      activeListings: "Активных объявлений",
      totalListings: "Всего объявлений",
      myListings: "Мои объявления",
      views: "просмотров",
      noListings: "У вас пока нет объявлений",
      createFirst: "Создайте первое объявление",
    },
    ua: {
      title: "Статистика профілю",
      totalViews: "Всього переглядів",
      totalContacts: "Всього контактів",
      totalMessages: "Всього повідомлень",
      totalFavorites: "В обраному",
      activeListings: "Активних оголошень",
      totalListings: "Всього оголошень",
      myListings: "Мої оголошення",
      views: "переглядів",
      noListings: "У вас поки немає оголошень",
      createFirst: "Створіть перше оголошення",
    },
    en: {
      title: "Profile Statistics",
      totalViews: "Total Views",
      totalContacts: "Total Contacts",
      totalMessages: "Total Messages",
      totalFavorites: "In Favorites",
      activeListings: "Active Listings",
      totalListings: "Total Listings",
      myListings: "My Listings",
      views: "views",
      noListings: "You don't have any listings yet",
      createFirst: "Create your first listing",
    }
  };

  const t = translations[lang] || translations.ru;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalViews: 0,
    totalContacts: 0,
    totalMessages: 0,
    totalFavorites: 0,
    activeListings: 0,
    totalListings: 0
  });
  const [listings, setListings] = useState([]);

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

        setListings(listingsData || []);

        // Calculate aggregated stats
        const totalViews = listingsData?.reduce((sum, l) => sum + (l.views_count || 0), 0) || 0;
        const totalContacts = listingsData?.reduce((sum, l) => sum + (l.contacts_count || 0), 0) || 0;
        const activeCount = listingsData?.filter(l => l.status === "active").length || 0;

        // Get favorites count
        const listingIds = listingsData?.map(l => l.id) || [];
        let favoritesCount = 0;
        if (listingIds.length > 0) {
          const { count } = await supabase
            .from("favorites")
            .select("*", { count: "exact", head: true })
            .in("listing_id", listingIds);
          favoritesCount = count || 0;
        }

        // Get messages count (approximate - conversations where user is seller)
        let messagesCount = 0;
        if (listingIds.length > 0) {
          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .in("listing_id", listingIds);
          messagesCount = count || 0;
        }

        setStats({
          totalViews,
          totalContacts,
          totalMessages: messagesCount,
          totalFavorites: favoritesCount,
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-airbnb-red"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-2xl font-bold">{t.title}</h1>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Total Views */}
          <Link href="/my" className="block hover:scale-[1.02] active:scale-95 transition-transform">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl p-6 shadow-airbnb h-full">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {stats.totalViews.toLocaleString()}
              </div>
              <div className="text-sm font-medium text-blue-900">{t.totalViews}</div>
            </div>
          </Link>

          {/* Total Favorites */}
          <Link href="/my?tab=favorites" className="block hover:scale-[1.02] active:scale-95 transition-transform">
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-3xl p-6 shadow-airbnb h-full">
              <div className="text-4xl font-bold text-red-600 mb-2">
                {stats.totalFavorites.toLocaleString()}
              </div>
              <div className="text-sm font-medium text-red-900">{t.totalFavorites}</div>
            </div>
          </Link>

          {/* Total Contacts */}
          <Link href="/messages" className="block hover:scale-[1.02] active:scale-95 transition-transform">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-3xl p-6 shadow-airbnb h-full">
              <div className="text-4xl font-bold text-green-600 mb-2">
                {stats.totalContacts.toLocaleString()}
              </div>
              <div className="text-sm font-medium text-green-900">{t.totalContacts}</div>
            </div>
          </Link>

          {/* Total Messages */}
          <Link href="/messages" className="block hover:scale-[1.02] active:scale-95 transition-transform">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-3xl p-6 shadow-airbnb h-full">
              <div className="text-4xl font-bold text-purple-600 mb-2">
                {stats.totalMessages.toLocaleString()}
              </div>
              <div className="text-sm font-medium text-purple-900">{t.totalMessages}</div>
            </div>
          </Link>
        </div>

        {/* Listings Count */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Link href="/my?tab=active" className="block hover:scale-[1.02] active:scale-95 transition-transform">
            <div className="bg-white border-2 border-gray-200 rounded-3xl p-6 shadow-sm h-full">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {stats.activeListings}
              </div>
              <div className="text-sm font-medium text-gray-600">{t.activeListings}</div>
            </div>
          </Link>

          <Link href="/my" className="block hover:scale-[1.02] active:scale-95 transition-transform">
            <div className="bg-white border-2 border-gray-200 rounded-3xl p-6 shadow-sm h-full">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {stats.totalListings}
              </div>
              <div className="text-sm font-medium text-gray-600">{t.totalListings}</div>
            </div>
          </Link>
        </div>

        {/* Listings List */}
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">{t.myListings}</h2>
          
          {listings.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-3xl">
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
              {listings.map((listing) => (
                <Link
                  key={listing.id}
                  href={`/listing/${listing.id}`}
                  className="block bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-airbnb transition-all"
                >
                  <div className="flex items-center gap-4">
                    {/* Image */}
                    <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                      {listing.image_path && (
                        <img
                          src={supabase.storage.from("listing-images").getPublicUrl(listing.image_path).data.publicUrl}
                          alt={listing.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{listing.title}</h3>
                      <p className="text-sm text-gray-500">
                        {listing.views_count || 0} {t.views}
                      </p>
                    </div>

                    {/* Arrow */}
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
