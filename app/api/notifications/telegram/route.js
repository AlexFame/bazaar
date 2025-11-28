import { NextResponse } from "next/server";
import { sendNotification } from "@/lib/bot";
import { supabase } from "@/lib/supabaseClient";

export async function POST(request) {
  try {
    const { recipientId, message, type = "general" } = await request.json();

    if (!recipientId || !message) {
      return NextResponse.json(
        { error: "recipientId and message are required" },
        { status: 400 }
      );
    }

    // Get recipient's Telegram user ID and notification preferences
    const { data: profile, error: profileError } = await supabase
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
      return NextResponse.json(
        { error: "Failed to send notification", details: result.error },
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
