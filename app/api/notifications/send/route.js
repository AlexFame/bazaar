import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req) {
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

    const { recipientId, message, listingTitle } = await req.json();

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

    console.log(`✅ [Notification API] Found TG ID: ${profile.tg_user_id}. Sending message...`);

    // 2. Send Telegram message
    // Construct the message text
    const text = `📩 *Новое сообщение*\n\n📌 *${listingTitle || "Объявление"}*\n\n${message}`;

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
        parse_mode: "Markdown",
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
