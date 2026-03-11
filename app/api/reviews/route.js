import { createClient } from "@supabase/supabase-js";
import { supaAdmin } from "@/lib/supabaseAdmin";
import { withRateLimit } from '@/lib/ratelimit';
import { reviewCreateSchema, validateBody } from '@/lib/validation';
import { validateComment } from '@/lib/moderation';

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

// GET /api/reviews?targetUserId=xxx
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('targetUserId');
    
    if (!targetUserId) {
      return new Response(JSON.stringify({ error: 'Missing targetUserId' }), { status: 400 });
    }

    const supa = supaAdmin();
    // Fetch reviews and join with reviewer profile
    const { data: reviews, error } = await supa
      .from('reviews')
      .select('*, reviewer:reviewer_id(id, full_name, tg_username, avatar_url)')
      .eq('target_user_id', targetUserId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify(reviews), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error("GET /api/reviews Error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

// POST /api/reviews
async function reviewsHandler(req) {
  try {
    const body = await req.json();
    const v = validateBody(reviewCreateSchema, body);
    if (!v.ok) return v.error;
    
    const { initData, targetUserId, listingId, rating, comment } = v.data;

    if (!process.env.TG_BOT_TOKEN) return new Response(JSON.stringify({ error: 'Config error' }), { status: 500 });
    
    const authData = checkTelegramAuth(initData, process.env.TG_BOT_TOKEN);
    if (!authData) return new Response(JSON.stringify({ error: 'Invalid or expired initData' }), { status: 401 });

    const supa = supaAdmin();
    
    // Get the reviewer's profile UUID
    const { data: profile } = await supa
      .from("profiles")
      .select("id")
      .eq("tg_user_id", authData.id)
      .single();

    if (!profile) {
       return new Response(JSON.stringify({ error: 'Reviewer profile not found' }), { status: 404 });
    }

    const reviewerId = profile.id;

    if (reviewerId === targetUserId) {
       return new Response(JSON.stringify({ error: 'Cannot review yourself' }), { status: 400 });
    }

    // Optional: Validate comment using moderation
    if (comment) {
       const modCheck = validateComment(comment);
       if (!modCheck.valid) {
          return new Response(JSON.stringify({ error: 'Comment violates guidelines', details: modCheck.errorKey }), { status: 400 });
       }
    }

    // Create review
    const { data, error } = await supa
      .from("reviews")
      .insert({
        reviewer_id: reviewerId,
        target_user_id: targetUserId,
        listing_id: listingId || null,
        rating,
        comment
      })
      .select('*, reviewer:reviewer_id(id, full_name, tg_username, avatar_url)')
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        return new Response(JSON.stringify({ error: 'You have already reviewed this user.' }), { status: 400 });
      }
      throw error;
    }

    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error("POST /api/reviews ERROR:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

export const POST = withRateLimit(reviewsHandler, { limit: 10, window: '30 s' });
