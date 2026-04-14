import { NextResponse } from "next/server";
import { supaAdmin } from "@/lib/supabaseAdmin";
import crypto from 'crypto';
import { withRateLimit } from '@/lib/ratelimit';

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

async function myListingsHandler(req) {
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

    // --- BULK PREFETCH: return all tabs in one shot ---
    if (tab === 'all') {
        const [activeRes, archiveRes, draftRes, favRes] = await Promise.all([
            admin.from('listings').select('*, profiles:created_by(*)')
                .eq('created_by', profile.id)
                .in('status', ['active', 'reserved'])
                .order('created_at', { ascending: false }),
            admin.from('listings').select('*, profiles:created_by(*)')
                .eq('created_by', profile.id)
                .in('status', ['closed', 'sold', 'archived'])
                .order('created_at', { ascending: false }),
            admin.from('listings').select('*, profiles:created_by(*)')
                .eq('created_by', profile.id)
                .eq('status', 'draft')
                .order('created_at', { ascending: false }),
            admin.from('favorites')
                .select('listing_id, listings(*, profiles:created_by(*))')
                .eq('profile_id', profile.id)
                .order('created_at', { ascending: false }),
        ]);

        return NextResponse.json({
            tabs: {
                active: activeRes.data || [],
                archive: archiveRes.data || [],
                draft: draftRes.data || [],
                favorites: (favRes.data || []).map(f => f.listings).filter(Boolean),
            },
            isAdmin: profile.is_admin,
        });
    }

    if (tab === 'favorites') {
        const { data: favorites, error } = await admin
            .from('favorites')
            .select('listing_id, listings(*, profiles:created_by(*))')
            .eq('profile_id', profile.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const items = (favorites || [])
            .map((favorite) => favorite.listings)
            .filter(Boolean);

        return NextResponse.json({ items, isAdmin: profile.is_admin });
    }

    // 2. Fetch Listings (Bypassing RLS)
    let query = admin
        .from('listings')
        .select('*, profiles:created_by(*)')
        .eq('created_by', profile.id)
        .order('created_at', { ascending: false });

    if (tab === 'active') {
        query = query.in('status', ['active', 'reserved']);
    } else if (tab === 'archive') {
        query = query.in('status', ['closed', 'sold', 'archived']);
    } else if (tab === 'draft') {
        query = query.eq('status', 'draft');
    } else {
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

export const POST = withRateLimit(myListingsHandler, { limit: 20, window: '30 s' });
