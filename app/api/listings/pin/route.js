import { supaAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

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
  if (obj.user) try { obj.user = JSON.parse(obj.user); } catch (e) {}
  return obj;
}

export async function POST(req) {
  try {
    const { initData, listingId, durationDays = 7 } = await req.json();
    
    if (!process.env.TG_BOT_TOKEN) return new Response(JSON.stringify({ error: 'Config error' }), { status: 500 });
    const authData = checkTelegramAuth(initData, process.env.TG_BOT_TOKEN);
    if (!authData || !authData.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const tgUserId = Number(authData.user.id);
    const supa = supaAdmin();

    const { data: profile } = await supa.from('profiles').select('id, is_admin').eq('tg_user_id', tgUserId).single();
    if (!profile) return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404 });

    // Check ownership
    const { data: listing } = await supa.from('listings').select('created_by').eq('id', listingId).single();
    if (!listing) return new Response(JSON.stringify({ error: 'Listing not found' }), { status: 404 });
    if (listing.created_by !== profile.id && !profile.is_admin) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });

    // Calculate VIP expiration
    const now = new Date();
    now.setDate(now.getDate() + Number(durationDays));
    
    // Perform Pin
    const { error } = await supa.from('listings').update({ 
        is_vip: true,
        vip_until: now.toISOString()
    }).eq('id', listingId);
    
    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
