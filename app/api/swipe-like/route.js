import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import TelegramService from "@/lib/telegram";

export async function POST(req) {
  try {
    const { listingId, initData } = await req.json();

    if (!listingId) {
      return NextResponse.json({ error: "Missing listingId" }, { status: 400 });
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { get(name) { return cookieStore.get(name)?.value; } } }
    );

    // Get current user auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Add to Favorites
    const { error: favError } = await supabase
      .from("favorites")
      .insert({ user_id: user.id, listing_id: listingId });
      
    if (favError && favError.code !== '23505') { // Ignore unique violation if already favorited
        console.error("Favorite error", favError);
    }

    // 2. Fetch the Listing to get Seller ID and Listing Title
    const { data: listing } = await supabase
      .from("listings")
      .select("title, user_id")
      .eq("id", listingId)
      .single();

    if (listing && listing.user_id !== user.id) {
       // Fetch Seller's Telegram ID
       const { data: sellerProfile } = await supabase
         .from("profiles")
         .select("telegram_id, first_name")
         .eq("id", listing.user_id)
         .single();
         
       // Fetch Buyer's Profile
       const { data: buyerProfile } = await supabase
         .from("profiles")
         .select("first_name")
         .eq("id", user.id)
         .single();

       if (sellerProfile && sellerProfile.telegram_id) {
           const buyerName = buyerProfile?.first_name || "Пользователь";
           const text = `🔥 *Новый отклик!*\n${buyerName} заинтересовался вашей услугой *«${listing.title}»* через функцию "Умный подбор".\n\nНапишите ему первым, пока он не ушел к конкурентам!`;
           
           // We can attach a URL to open chatting with this user via Mini App deep link
           const replyUrl = `${process.env.NEXT_PUBLIC_BASE_URL}?user=${user.id}`;

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
