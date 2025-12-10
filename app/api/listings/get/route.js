import { supaAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

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
      } catch (e) { console.error(e); }
  }
  return obj;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { id, initData } = body;
    
    if (!id || !initData) return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400 });

    if (!process.env.TG_BOT_TOKEN) return new Response(JSON.stringify({ error: 'Config error' }), { status: 500 });
    
    const authData = checkTelegramAuth(initData, process.env.TG_BOT_TOKEN);
    if (!authData || !authData.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const tgUserId = Number(authData.user.id);
    const supa = supaAdmin();

    // 1. Get Profile ID
    const { data: profile } = await supa.from('profiles').select('id').eq('tg_user_id', tgUserId).single();
    if (!profile) return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404 });

    const userId = profile.id;

    // 2. Fetch Listing (Secure fetch)
    const { data: listing, error } = await supa
      .from('listings')
      .select('*, listing_images(*)')
      .eq('id', id)
      .single();

    if (error || !listing) return new Response(JSON.stringify({ error: 'Listing not found' }), { status: 404 });
    
    // 3. Check Ownership
    if (listing.created_by !== userId) {
        // Allow if admin, but for now strict
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }
    
    // Sort images by position
    if (listing.listing_images?.length) {
        listing.listing_images.sort((a,b) => a.position - b.position);
    }

    return new Response(JSON.stringify({ listing }), { status: 200 });

  } catch (e) {
    console.error("Get Listing API Error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
