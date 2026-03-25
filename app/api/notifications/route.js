import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from 'crypto';
import { withRateLimit } from '@/lib/ratelimit';

// Initialize Supabase Admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

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

export async function GET(req) {
  try {
    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    return NextResponse.json({ message: "Use client-side RLS for fetching to enable Realtime. Use PATCH to update." });

  } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function notificationPatchHandler(req) {
    try {
        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { id, all, userId, initData } = await req.json();

        // AUTH CHECK — require Telegram initData
        if (!initData || !process.env.TG_BOT_TOKEN) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const authData = checkTelegramAuth(initData, process.env.TG_BOT_TOKEN);
        if (!authData?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Resolve the authenticated user's profile
        const tgUserId = Number(authData.user.id);
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('tg_user_id', tgUserId)
            .single();

        if (!profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        // IMPORTANT: Use the authenticated user's ID, NOT the userId from body
        const authenticatedUserId = profile.id;

        if (all) {
            // Mark all as read for the AUTHENTICATED user
            const { error } = await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("user_id", authenticatedUserId)
                .eq("is_read", false);

            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        if (id) {
            // Mark single as read — but verify it belongs to the authenticated user
            const { error } = await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("id", id)
                .eq("user_id", authenticatedUserId); // Ensure ownership
            
            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Missing parameters" }, { status: 400 });

    } catch (err) {
        console.error("Notification update error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export const PATCH = withRateLimit(notificationPatchHandler, { limit: 20, window: '30 s' });
