"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import ListingCard from "@/components/ListingCard";
import { ListingCardSkeleton } from "@/components/SkeletonLoader";
import ReviewForm from "@/components/ReviewForm";
import ReviewList from "@/components/ReviewList";
import Image from "next/image";
import Link from "next/link";
import BackButton from "@/components/BackButton";

export default function ProfilePageClient({ profileId }) {
  const [profile, setProfile] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("listings"); // 'listings' | 'reviews'

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .single();
      
      if (profileError) throw profileError;
      setProfile(profileData);

      // 2. Listings
      const { data: listingsData } = await supabase
        .from("listings")
        .select("*, profiles:created_by(*)")
        .eq("created_by", profileId)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      
      setListings(listingsData || []);

      // 3. Reviews (Try to fetch if table exists)
      try {
          const { data: reviewsData, error: reviewsError } = await supabase
              .from("reviews")
              .select("*, reviewer:profiles!reviewer_id(full_name, tg_username, avatar_url)")
              .eq("target_id", profileId)
              .order("created_at", { ascending: false });
          
          if (reviewsError) {
              console.warn("Error fetching reviews (table might be missing):", reviewsError);
          } else if (reviewsData) {
              setReviews(reviewsData);
          }
      } catch (e) {
          console.log("Reviews fetch exception:", e);
      }

    } catch (err) {
      console.error("Error loading profile:", err);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  // Check current user
  useEffect(() => {
     const checkUser = async () => {
         if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user) {
             const tgId = window.Telegram.WebApp.initDataUnsafe.user.id;
             const { data } = await supabase.from('profiles').select('id').eq('tg_user_id', tgId).single();
             if (data) setCurrentUserProfile(data);
         }
     };
     checkUser();
  }, []);

  useEffect(() => {
    loadData();
  }, [profileId]);

  if (loading) {
      return (
          <div className="w-full flex justify-center mt-8">
              <div className="w-full max-w-[520px] px-3">
                  <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl p-6 shadow-sm dark:shadow-none flex flex-col items-center animate-pulse">
                      <div className="w-24 h-24 bg-gray-200 dark:bg-neutral-800 rounded-full mb-4"></div>
                      <div className="h-6 w-32 bg-gray-200 dark:bg-neutral-800 rounded mb-2"></div>
                      <div className="h-4 w-24 bg-gray-200 dark:bg-neutral-800 rounded"></div>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-2">
                      <ListingCardSkeleton />
                      <ListingCardSkeleton />
                  </div>
              </div>
          </div>
      );
  }

  if (!profile) {
      return (
        <div className="w-full flex justify-center mt-8">
            <div className="text-center text-gray-500">{t("user_not_found") || "Пользователь не найден"}</div>
        </div>
      );
  }

  // Вычисляем средний рейтинг
  const avgRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) 
    : null;

  return (
    <div 
      className="w-full flex justify-center mt-3 mb-20"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 40px)' }}
    >
      <div className="w-full max-w-[520px] px-3">
        
        {/* Header with Back Button */}
        <div className="mb-3">
           <BackButton />
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gray-100 mb-3 relative overflow-hidden border border-gray-100">
                {profile.avatar_url ? (
                    <Image 
                        src={profile.avatar_url} 
                        alt={profile.full_name || profile.tg_username || "User"} 
                        fill 
                        className="object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-br from-blue-100 to-purple-100 text-blue-500">
                        {(profile.full_name || profile.tg_username || "U")[0].toUpperCase()}
                    </div>
                )}
            </div>

            {/* Name & Verification */}
            <div className="flex items-center gap-1 mb-1">
                <h1 className="text-xl font-bold text-black">
                    {profile.full_name || profile.tg_username || `User ${profile.id.slice(0,4)}`}
                </h1>
                {profile.is_verified && (
                    <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                )}
            </div>

            {/* Rating & Stats */}
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <div className="flex items-center gap-1">
                    <span>⭐️</span>
                    <span className="font-semibold text-black">{avgRating || (t("no_reviews") || "Нет отзывов")}</span>
                    {reviews.length > 0 && <span className="text-xs">({reviews.length})</span>}
                </div>
                <div className="w-px h-3 bg-gray-300"></div>
                <div>
                    {t("on_site_since") || "На сайте с"} {new Date(profile.created_at).toLocaleDateString()}
                </div>
            </div>
        </div>

        {/* Actions for Owner */}
        {currentUserProfile?.id === profileId && (
            <div className="flex gap-2 mb-6">
                <Link 
                    href="/saved-searches"
                    className="flex-1 py-2 bg-gray-100 text-black text-xs font-semibold rounded-xl text-center flex items-center justify-center gap-2 hover:bg-gray-200 transition"
                >
                    🔍 {t("subscribed_search") || "Подписки"}
                </Link>
                <Link
                    href="/settings" 
                    className="flex-1 py-2 bg-gray-100 text-black text-xs font-semibold rounded-xl text-center flex items-center justify-center gap-2 hover:bg-gray-200 transition"
                >
                    ⚙️ {t("settings_title") || "Настройки"}
                </Link>
            </div>
        )}

        {/* Tabs */}
        <div className="flex mt-6 border-b border-gray-200">
            <button 
                onClick={() => setActiveTab("listings")}
                className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${activeTab === "listings" ? "text-black" : "text-gray-400 hover:text-gray-600"}`}
            >
                {t("listings_count") || "Объявления"} ({listings.length})
                {activeTab === "listings" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-black rounded-t-full"></div>}
            </button>
            <button 
                onClick={() => setActiveTab("reviews")}
                className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${activeTab === "reviews" ? "text-black" : "text-gray-400 hover:text-gray-600"}`}
            >
                {t("reviews_count") || "Отзывы"} ({reviews.length})
                {activeTab === "reviews" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-black rounded-t-full"></div>}
            </button>
        </div>

        {/* Content */}
        <div className="mt-4">
            {activeTab === "listings" && (
                listings.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                        {listings.map(listing => (
                            <ListingCard key={listing.id} listing={listing} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 text-gray-400 text-sm">
                        {t("user_no_active_listings") || "У пользователя нет активных объявлений"}
                    </div>
                )
            )}

            {activeTab === "reviews" && (
                <div>
                    {/* Only show form if not owner */}
                    {(!currentUserProfile || currentUserProfile.id !== profileId) && (
                        <ReviewForm targetUserId={profileId} onReviewSubmitted={loadData} />
                    )}
                    <ReviewList reviews={reviews} />
                </div>
            )}
        </div>

      </div>
    </div>
  );
}
