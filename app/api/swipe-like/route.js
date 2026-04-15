import { NextResponse } from "next/server";
import { supaAdmin } from "@/lib/supabaseAdmin";
import { sendNotification } from "@/lib/bot";

import crypto from 'crypto';

function checkTelegramAuth(initData, botToken) {
  if (!initData || !botToken) return null;
  const url = new URLSearchParams(initData);
  const hash = url.get('hash');
  url.delete('hash');

  const params = [...url.entries()]
    .sort(([a],[b]) => a.localeCompare(b));

  const dataCheckString = params
    .map(([k,v]) => `${k}=${v}`)
    .join('\n');

  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken.trim()).digest();
  const check = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

  if (check !== hash) return null;

  const obj = Object.fromEntries(url.entries());
  if (obj.user) {
    try { obj.user = JSON.parse(obj.user); } catch(e) {}
  }
  return obj;
}

export async function POST(req) {
  try {
    const { listingId, initData, action } = await req.json();

    if (!listingId) {
      return NextResponse.json({ error: "Missing listingId" }, { status: 400 });
    }

    // Auth via Telegram initData
    const authData = checkTelegramAuth(initData, process.env.TG_BOT_TOKEN);
    if (!authData || !authData.user) {
      console.error("Swipe-like auth failed. initData present:", !!initData, "botToken present:", !!process.env.TG_BOT_TOKEN);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tgUserId = authData.user.id;
    const supa = supaAdmin();

    // Get the user's profile UUID from their Telegram ID
    const { data: userProfile, error: profileError } = await supa
      .from("profiles")
      .select("id, full_name, tg_username")
      .eq("tg_user_id", tgUserId)
      .maybeSingle();

    if (profileError) {
      console.error("Swipe-like profile lookup error:", profileError);
      return NextResponse.json({ error: "Profile lookup failed" }, { status: 500 });
    }

    if (!userProfile) {
      console.error("Swipe-like: no profile for tg_user_id", tgUserId);
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { error: favError } = await supa
      .from("favorites")
      .upsert(
        { profile_id: userProfile.id, listing_id: listingId },
        { onConflict: "profile_id,listing_id", ignoreDuplicates: true }
      );

    if (favError) {
        console.error("Swipe-like favorite insert error:", favError);
        return NextResponse.json({ error: "Favorite insert failed" }, { status: 500 });
    }

    if (action === "favorite") {
      // If just favorite, we do not notify the seller
      return NextResponse.json({ success: true, action: "favorite" });
    }

    // 2. Fetch the Listing to get Seller ID and Title
    const { data: listing } = await supa
      .from("listings")
      .select("title, created_by")
      .eq("id", listingId)
      .maybeSingle();

    if (listing && listing.created_by !== userProfile.id) {
       // Fetch Seller's Telegram ID
       const { data: sellerProfile } = await supa
         .from("profiles")
         .select("tg_user_id, full_name, tg_username")
         .eq("id", listing.created_by)
         .maybeSingle();

       if (sellerProfile && sellerProfile.tg_user_id) {
           const buyerName = userProfile.full_name || userProfile.tg_username || "Пользователь";
           const text = `🔥 <b>Новый отклик!</b>\n${buyerName} заинтересовался вашей услугой <b>«${listing.title}»</b> через функцию "Умный подбор".\n\nНапишите ему первым, пока он не ушел к конкурентам!`;
           
           const replyUrl = `${process.env.NEXT_PUBLIC_BASE_URL}?user=${userProfile.id}`;

           await sendNotification(sellerProfile.tg_user_id, text, {
               reply_markup: {
                   inline_keyboard: [[
                     { text: `💬 Написать ${buyerName}`, web_app: { url: replyUrl } }
                   ]]
               }
           });
       }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Swipe Like API Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
