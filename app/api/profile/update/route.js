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
    const { initData, ...updates } = body;

    // 1. Validate Auth
    if (!process.env.TG_BOT_TOKEN) return new Response(JSON.stringify({ error: 'Config error' }), { status: 500 });
    const authData = checkTelegramAuth(initData, process.env.TG_BOT_TOKEN);
    if (!authData || !authData.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const tgUserId = Number(authData.user.id);

    // 2. Resolve Profile ID
    const supa = supaAdmin();
    const { data: profile } = await supa.from('profiles').select('id').eq('tg_user_id', tgUserId).single();
    
    if (!profile) {
        return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404 });
    }

    // 3. Allowed Updates Whitelist
    // We only allow specific fields to be updated via this endpoint
    const allowed = ['notification_preferences', 'full_name', 'email']; 
    const cleanUpdates = {};
    
    for (const key of Object.keys(updates)) {
        if (allowed.includes(key)) {
            cleanUpdates[key] = updates[key];
        }
    }

    if (Object.keys(cleanUpdates).length === 0) {
        return new Response(JSON.stringify({ success: true, message: 'No changes' }), { status: 200 });
    }

    // 4. Update Profile
    const { error: updateError } = await supa
        .from('profiles')
        .update(cleanUpdates)
        .eq('id', profile.id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (e) {
    console.error("Profile Update Error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
