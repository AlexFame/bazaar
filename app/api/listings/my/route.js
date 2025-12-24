import { NextResponse } from "next/server";
import { supaAdmin } from "@/lib/supabaseAdmin";
import crypto from 'crypto';

// Auth Helper
function checkTelegramAuth(initData, botToken) {
  if (!initData) return null;
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
      try {
        obj.user = JSON.parse(obj.user);
      } catch (e) { }
  }
  return obj;
}

export async function POST(req) {
  try {
    const { initData, tab } = await req.json();
    
    if (!process.env.TG_BOT_TOKEN) {
        return NextResponse.json({ error: "Server config error" }, { status: 500 });
    }

    const authData = checkTelegramAuth(initData, process.env.TG_BOT_TOKEN);
    if (!authData || !authData.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tgUserId = authData.user.id;
    const admin = supaAdmin();

    // 1. Get Profile ID
    const { data: profile } = await admin
        .from('profiles')
        .select('id, is_admin')
        .eq('tg_user_id', tgUserId)
        .single();
        
    if (!profile) {
        return NextResponse.json({ items: [] });
    }

    // 2. Fetch Listings (Bypassing RLS)
    let query = admin
        .from('listings')
        .select('*, profiles:created_by(*)') // Join profile if needed for UI consistency
        .eq('created_by', profile.id)
        .order('created_at', { ascending: false });

    // Filter by tab
    if (tab === 'active') {
        query = query.in('status', ['active', 'reserved']);
    } else if (tab === 'archive') {
        query = query.in('status', ['closed', 'sold', 'archived']);
    } else if (tab === 'draft') {
        query = query.eq('status', 'draft');
    } else {
        // Fallback or specific status
        query = query.in('status', ['active', 'reserved']);
    }

    const { data: listings, error } = await query;
    
    if (error) throw error;

    return NextResponse.json({ items: listings || [], isAdmin: profile.is_admin });

  } catch (e) {
    console.error("My Listings API Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
