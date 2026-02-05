import { supaAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

// Reusing the auth helper (ideally should be shared lib, but inlining for speed/safety as before)
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
    const { initData, listingId } = await req.json();
    
    if (!process.env.TG_BOT_TOKEN) return new Response(JSON.stringify({ error: 'Config error' }), { status: 500 });
    const authData = checkTelegramAuth(initData, process.env.TG_BOT_TOKEN);
    if (!authData || !authData.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const tgUserId = Number(authData.user.id);
    const supa = supaAdmin();

    // Resolve User ID
    const { data: profile } = await supa.from('profiles').select('id').eq('tg_user_id', tgUserId).single();
    if (!profile) return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404 });

    // Call RPC function 'bump_listing'
    // It securely checks if user owns the listing inside the SQL function using auth.uid(), 
    // BUT supaAdmin is service role, so it bypasses RLS.
    // The SQL function uses `auth.uid()` which might be null for service role calls unless we set context.
    // ALTERNATIVE: checking ownership here in JS is safer for Service Role usage.
    
    // Check ownership
    const { data: listing } = await supa.from('listings').select('created_by').eq('id', listingId).single();
    if (!listing) return new Response(JSON.stringify({ error: 'Listing not found' }), { status: 404 });
    if (listing.created_by !== profile.id) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });

    // Perform Bump
    const { error } = await supa.from('listings').update({ bumped_at: new Date().toISOString() }).eq('id', listingId);
    
    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
