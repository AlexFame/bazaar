import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { withRateLimit } from '@/lib/ratelimit';
import { notificationSendSchema, validateBody } from '@/lib/validation';

function checkTelegramAuth(initData, botToken) {
  if (!initData) return null;
  const url = new URLSearchParams(initData);
  const hash = url.get('hash');
  url.delete('hash');
  const params = [...url.entries()].sort(([a],[b]) => a.localeCompare(b));
  const dataCheckString = params.map(([k,v]) => `${k}=${v}`).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken.trim()).digest();
  const check = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  if (check !== hash) return null;
  const obj = Object.fromEntries(url.entries());
  if (obj.user) { try { obj.user = JSON.parse(obj.user); } catch (e) {} }
  return obj;
}

async function notificationSendHandler(req) {
  console.log("🔔 [Notification API] Request received");
  try {
    // Initialize Supabase Admin client inside handler
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Check both names to be safe, but prioritize the one used in lib/supabaseAdmin.js
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN;

    if (!supabaseUrl || !supabaseKey) {
        console.error("❌ [Notification API] Missing Supabase credentials");
        const missing = [];
        if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
        if (!supabaseKey) missing.push("SUPABASE_SERVICE_ROLE");
        return NextResponse.json({ error: `Server config error: Missing ${missing.join(", ")}` }, { status: 500 });
    }

    if (!TG_BOT_TOKEN) {
         console.error("❌ [Notification API] TG_BOT_TOKEN is missing");
         return NextResponse.json({ error: "Server configuration error (Telegram)" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const v = validateBody(notificationSendSchema, body);
    if (!v.ok) return v.error;
    const { recipientId, message, listingTitle, initData } = v.data;

    // AUTH CHECK
    if (!initData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const authData = checkTelegramAuth(initData, TG_BOT_TOKEN);
    if (!authData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!recipientId || !message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (!TG_BOT_TOKEN) {
      console.error("TG_BOT_TOKEN is not set");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // 1. Get recipient's Telegram ID
    console.log(`🔔 [Notification API] Fetching TG ID for profile: ${recipientId}`);
    
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("tg_user_id")
      .eq("id", recipientId)
      .single();

    if (error) {
        console.error(`❌ [Notification API] Error fetching profile:`, error);
        return NextResponse.json({ error: "Profile fetch error" }, { status: 500 });
    }

    if (!profile?.tg_user_id) {
      console.log(`⚠️ [Notification API] Recipient ${recipientId} has no tg_user_id`);
      return NextResponse.json({ error: "Recipient has no Telegram ID" }, { status: 404 });
    }

    console.log(`✅ [Notification API] Found TG ID: ${profile.tg_user_id}. Saving to DB and sending message...`);

    // 2. Save to Database (So it appears in In-App Notifications)
    const { error: dbError } = await supabase.from("notifications").insert({
        user_id: recipientId,
        type: "msg", // 'msg' type for general messages
        title: listingTitle || "Новое сообщение",
        message: message,
        data: { listing_title: listingTitle },
        is_read: false
    });

    if (dbError) {
        console.error("❌ [Notification API] Error saving to DB:", dbError);
        // We continue to send TG message even if DB fails, or should we? 
        // Better to log and continue.
    } else {
        console.log("✅ [Notification API] Notification saved to DB");
    }

    // 3. Send Telegram message
    // Construct the message text (Plain text to avoid parsing errors)
    const text = `📩 Новое сообщение\n\n📌 ${listingTitle || "Объявление"}\n\n${message}`;

    // Optional: Add button to open the app
    // Note: We need the correct URL for the WebApp. 
    // If we don't have it, we just send text.
    
    // Clean token (remove 'bot' prefix if user added it by mistake)
    const cleanToken = TG_BOT_TOKEN.replace(/^bot/, "");
    const apiUrl = `https://api.telegram.org/bot${cleanToken}/sendMessage`;

    console.log(`🔔 [Notification API] Sending to TG URL: ${apiUrl.replace(cleanToken, "HIDDEN")}`);

    const tgRes = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: profile.tg_user_id,
        text: text,
        // parse_mode removed to avoid 400 errors with special chars
      }),
    });

    const tgData = await tgRes.json();

    if (!tgData.ok) {
      console.error("Telegram API error:", tgData);
      return NextResponse.json({ error: "Failed to send TG message", details: tgData }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Notification error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const POST = withRateLimit(notificationSendHandler, { limit: 10, window: '1 m' });
