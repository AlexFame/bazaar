import { NextResponse } from "next/server";
import crypto from "crypto";
import { supaAdmin } from "@/lib/supabaseAdmin";
import { withRateLimit } from "@/lib/ratelimit";

function checkTelegramAuth(initData, botToken) {
  if (!initData || !botToken) return null;

  const url = new URLSearchParams(initData);
  const hash = url.get("hash");
  url.delete("hash");

  const dataCheckString = [...url.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secret = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken.trim())
    .digest();
  const check = crypto
    .createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");

  if (check !== hash) return null;

  const user = url.get("user");
  if (!user) return null;

  try {
    return JSON.parse(user);
  } catch (error) {
    console.error("[favorites.auth] failed to parse Telegram user", { error });
    return null;
  }
}

function logFavoriteError(action, message, context = {}) {
  console.error(`[favorites.${action}] ${message}`, context);
}

async function favoritesHandler(req) {
  let action = "unknown";

  try {
    const body = await req.json();
    action = body.action || "status";
    const { listingId, initData } = body;

    const tgUser = checkTelegramAuth(initData, process.env.TG_BOT_TOKEN);
    if (!tgUser?.id) {
      logFavoriteError(action, "unauthorized request", {
        hasInitData: Boolean(initData),
        hasBotToken: Boolean(process.env.TG_BOT_TOKEN),
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = supaAdmin();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id")
      .eq("tg_user_id", Number(tgUser.id))
      .maybeSingle();

    if (profileError) {
      logFavoriteError(action, "profile lookup failed", {
        tgUserId: tgUser.id,
        error: profileError,
      });
      return NextResponse.json({ error: "Profile lookup failed" }, { status: 500 });
    }

    if (!profile?.id) {
      logFavoriteError(action, "profile not found", { tgUserId: tgUser.id });
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (action === "list") {
      const { data, error } = await admin
        .from("favorites")
        .select("listing_id, listings(*, profiles:created_by(*))")
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) {
        logFavoriteError(action, "list query failed", { profileId: profile.id, error });
        return NextResponse.json({ error: "Favorites list failed" }, { status: 500 });
      }

      return NextResponse.json({
        items: (data || []).map((item) => item.listings).filter(Boolean),
      });
    }

    if (!listingId) {
      return NextResponse.json({ error: "Missing listingId" }, { status: 400 });
    }

    if (action === "status") {
      const { data, error } = await admin
        .from("favorites")
        .select("id")
        .eq("profile_id", profile.id)
        .eq("listing_id", listingId)
        .maybeSingle();

      if (error) {
        logFavoriteError(action, "status query failed", {
          profileId: profile.id,
          listingId,
          error,
        });
        return NextResponse.json({ error: "Favorite status failed" }, { status: 500 });
      }

      return NextResponse.json({ isFavorite: Boolean(data) });
    }

    if (action === "add") {
      const { error } = await admin
        .from("favorites")
        .upsert(
          { profile_id: profile.id, listing_id: listingId },
          { onConflict: "profile_id,listing_id", ignoreDuplicates: true },
        );

      if (error) {
        logFavoriteError(action, "insert failed", {
          profileId: profile.id,
          listingId,
          error,
        });
        return NextResponse.json({ error: "Favorite add failed" }, { status: 500 });
      }

      return NextResponse.json({ isFavorite: true });
    }

    if (action === "remove") {
      const { error } = await admin
        .from("favorites")
        .delete()
        .eq("profile_id", profile.id)
        .eq("listing_id", listingId);

      if (error) {
        logFavoriteError(action, "delete failed", {
          profileId: profile.id,
          listingId,
          error,
        });
        return NextResponse.json({ error: "Favorite remove failed" }, { status: 500 });
      }

      return NextResponse.json({ isFavorite: false });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    logFavoriteError(action, "unexpected error", { error });
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export const POST = withRateLimit(favoritesHandler, { limit: 60, window: "30 s" });
