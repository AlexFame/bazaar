import { NextResponse } from "next/server";
import { supaAdmin } from "@/lib/supabaseAdmin";
import TelegramService from "@/lib/telegram";

function checkTelegramAuth(initData, botToken) {
  if (!initData) return null;
  const crypto = require('crypto');
  const url = new URLSearchParams(initData);
  const hash = url.get("hash");
  url.delete("hash");

  const keys = Array.from(url.keys()).sort();
  const dataCheckString = keys.map((key) => `${key}=${url.get(key)}`).join("\n");
  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (computedHash !== hash) return null;

  const userStr = url.get("user");
  if (!userStr) return null;
  return JSON.parse(userStr);
}

export async function POST(req) {
  try {
    const { listingId, initData } = await req.json();

    if (!listingId) {
      return NextResponse.json({ error: "Missing listingId" }, { status: 400 });
    }

    // Auth via Telegram initData
    const authData = checkTelegramAuth(initData, process.env.TG_BOT_TOKEN);
    if (!authData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supa = supaAdmin();

    // Get the user's profile UUID from their Telegram ID
    const { data: userProfile } = await supa
      .from("profiles")
      .select("id, first_name")
      .eq("tg_user_id", authData.id)
      .single();

    if (!userProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // 1. Add to Favorites
    const { error: favError } = await supa
      .from("favorites")
      .insert({ profile_id: userProfile.id, listing_id: listingId });
      
    if (favError && favError.code !== '23505') { // Ignore unique violation
        console.error("Favorite error", favError);
    }

    // 2. Fetch the Listing to get Seller ID and Title
    const { data: listing } = await supa
      .from("listings")
      .select("title, user_id")
      .eq("id", listingId)
      .single();

    if (listing && listing.user_id !== userProfile.id) {
       // Fetch Seller's Telegram ID
       const { data: sellerProfile } = await supa
         .from("profiles")
         .select("telegram_id, first_name")
         .eq("id", listing.user_id)
         .single();

       if (sellerProfile && sellerProfile.telegram_id) {
           const buyerName = userProfile.first_name || "Пользователь";
           const text = `🔥 *Новый отклик!*\n${buyerName} заинтересовался вашей услугой *«${listing.title}»* через функцию "Умный подбор".\n\nНапишите ему первым, пока он не ушел к конкурентам!`;
           
           const replyUrl = `${process.env.NEXT_PUBLIC_BASE_URL}?user=${userProfile.id}`;

           await TelegramService.sendNotification(sellerProfile.telegram_id, text, {
               inline_keyboard: [[
                 { text: `💬 Написать ${buyerName}`, web_app: { url: replyUrl } }
               ]]
           });
       }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Swipe Like API Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
