import { NextResponse } from "next/server";
import { sendNotification } from "@/lib/bot";
import { supaAdmin } from "@/lib/supabaseAdmin";
import crypto from "crypto";

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

export async function POST(request) {
  try {
    const { recipientId, message, type = "general", data, initData } = await request.json();

    // AUTH CHECK
    if (!initData || !process.env.TG_BOT_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const authData = checkTelegramAuth(initData, process.env.TG_BOT_TOKEN);
    if (!authData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!recipientId || !message) {
      return NextResponse.json(
        { error: "recipientId and message are required" },
        { status: 400 }
      );
    }

    const supa = supaAdmin();

    // 1. Get recipient's Telegram user ID and notification preferences (Admin bypass)
    const { data: profile, error: profileError } = await supa
      .from("profiles")
      .select("tg_user_id, notification_preferences")
      .eq("id", recipientId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Recipient not found" },
        { status: 404 }
      );
    }

    // 2. Insert into In-App Notifications
    // const { data: notificationData } = await request.json(); // REMOVED: Already read above
    
    await supa.from("notifications").insert({
        user_id: recipientId,
        type: type,
        message: message,
        data: data || null, 
        title: type === 'new_comment' ? 'notification_new_comment' 
             : type === 'review' ? 'notification_new_review'
             : type === 'offer' ? 'notification_new_offer'
             : 'notification_default',
        is_read: false
    });

    // 3. Telegram Notification
    // Check if user has this notification type enabled
    const prefs = profile.notification_preferences || {};
    const notificationEnabled = prefs[type] !== false; // Default to true if not set

    if (!notificationEnabled) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "User has disabled this notification type",
      });
    }

    // Send notification via Telegram
    const result = await sendNotification(profile.tg_user_id, message);

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      // Even if Telegram fails, we saved in-app notification, so partial success?
      // But let's report error for clarity.
      return NextResponse.json(
        { error: "Failed to send Telegram notification", details: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Telegram notification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
