import { supaAdmin } from "@/lib/supabaseAdmin";
import { withRateLimit } from '@/lib/ratelimit';
import { subscriptionToggleSchema, validateBody } from '@/lib/validation';

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

// GET /api/subscriptions?targetUserId=xxx&subscriberUserId=yyy
// Returns { subscribed: boolean }
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('targetUserId');
    const subscriberId = searchParams.get('subscriberId');
    
    if (!targetUserId || !subscriberId) {
      return new Response(JSON.stringify({ error: 'Missing targetUserId or subscriberId' }), { status: 400 });
    }

    const supabase = supaAdmin();
    const { data } = await supabase
      .from('user_subscriptions')
      .select('id')
      .eq('target_user_id', targetUserId)
      .eq('subscriber_id', subscriberId)
      .single();

    return new Response(JSON.stringify({ subscribed: !!data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

// POST /api/subscriptions
// Toggles subscription
async function subscriptionToggleHandler(req) {
  try {
    const body = await req.json();
    const v = validateBody(subscriptionToggleSchema, body);
    if (!v.ok) return v.error;
    
    const { initData, targetUserId } = v.data;

    if (!process.env.TG_BOT_TOKEN) return new Response(JSON.stringify({ error: 'Config error' }), { status: 500 });
    
    const authData = checkTelegramAuth(initData, process.env.TG_BOT_TOKEN);
    if (!authData) return new Response(JSON.stringify({ error: 'Invalid or expired initData' }), { status: 401 });

    const supabase = supaAdmin();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("tg_user_id", authData.id)
      .single();

    if (!profile) {
       return new Response(JSON.stringify({ error: 'Subscriber profile not found' }), { status: 404 });
    }

    const subscriberId = profile.id;

    if (subscriberId === targetUserId) {
       return new Response(JSON.stringify({ error: 'Cannot subscribe to yourself' }), { status: 400 });
    }

    // Check if already subscribed
    const { data: existing } = await supabase
      .from("user_subscriptions")
      .select("id")
      .eq("target_user_id", targetUserId)
      .eq("subscriber_id", subscriberId)
      .single();

    if (existing) {
      // Unsubscribe
      await supabase.from("user_subscriptions").delete().eq("id", existing.id);
      return new Response(JSON.stringify({ subscribed: false }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } else {
      // Subscribe
      await supabase.from("user_subscriptions").insert({
        subscriber_id: subscriberId,
        target_user_id: targetUserId
      });
      return new Response(JSON.stringify({ subscribed: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

  } catch (e) {
    console.error("POST /api/subscriptions ERROR:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

export const POST = withRateLimit(subscriptionToggleHandler, { limit: 10, window: '1 m' });
