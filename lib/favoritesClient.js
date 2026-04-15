"use client";

import { supabase } from "@/lib/supabaseClient";
import { getUserId } from "@/lib/userId";

function getTelegramInitData() {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp?.initData || null;
}

async function callFavoritesApi(payload) {
  const initData = getTelegramInitData();
  if (!initData) return null;

  const res = await fetch("/api/favorites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, initData }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Favorites API failed");
  }

  return data;
}

export async function resolveFavoriteProfileId() {
  if (typeof window !== "undefined" && window._cachedProfileId) {
    return window._cachedProfileId;
  }

  let profileId = null;
  const tgUserId = getUserId();

  if (tgUserId) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("tg_user_id", Number(tgUserId))
      .maybeSingle();
    profileId = data?.id || null;
  }

  if (!profileId) {
    const { data } = await supabase.auth.getUser();
    profileId = data?.user?.id || null;
  }

  if (profileId && typeof window !== "undefined") {
    window._cachedProfileId = profileId;
  }

  return profileId;
}

export async function getFavoriteStatus(listingId) {
  const apiData = await callFavoritesApi({ action: "status", listingId });
  if (apiData) return Boolean(apiData.isFavorite);

  const profileId = await resolveFavoriteProfileId();
  if (!profileId) return false;

  const { data, error } = await supabase
    .from("favorites")
    .select("id")
    .eq("profile_id", profileId)
    .eq("listing_id", listingId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function setFavorite(listingId, shouldFavorite) {
  const apiData = await callFavoritesApi({
    action: shouldFavorite ? "add" : "remove",
    listingId,
  });
  if (apiData) return Boolean(apiData.isFavorite);

  const profileId = await resolveFavoriteProfileId();
  if (!profileId) {
    throw new Error("Profile not resolved");
  }

  if (shouldFavorite) {
    const { error } = await supabase
      .from("favorites")
      .upsert(
        { profile_id: profileId, listing_id: listingId },
        { onConflict: "profile_id,listing_id", ignoreDuplicates: true },
      );
    if (error) throw error;
    return true;
  }

  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("profile_id", profileId)
    .eq("listing_id", listingId);
  if (error) throw error;
  return false;
}

export async function listFavorites() {
  const apiData = await callFavoritesApi({ action: "list" });
  if (apiData) return apiData.items || [];

  const profileId = await resolveFavoriteProfileId();
  if (!profileId) return [];

  const { data, error } = await supabase
    .from("favorites")
    .select("listing_id, listings(*, profiles:created_by(*))")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((favorite) => favorite.listings).filter(Boolean);
}
