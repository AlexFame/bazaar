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
    const { initData, ...payload } = body;
    
    if (!process.env.TG_BOT_TOKEN) return new Response(JSON.stringify({ error: 'Config error' }), { status: 500 });

    const authData = checkTelegramAuth(initData, process.env.TG_BOT_TOKEN);
    if (!authData || !authData.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const tgUserId = Number(authData.user.id);
    const supa = supaAdmin();

    // 1. Get Profile ID
    const { data: profile } = await supa.from('profiles').select('id').eq('tg_user_id', tgUserId).single();
    if (!profile) return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404 });

    const userId = profile.id;

    // 2. Handle Operation
    if (payload.id) {
        // Check if listing exists
        const { data: existing } = await supa.from('listings').select('created_by').eq('id', payload.id).maybeSingle();
        
        if (existing) {
             // UPDATE Existing
             if (existing.created_by !== userId) {
                 // Check admin? assume no admin edit for now unless requested
                 return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
             }
             
             // Strip immutable or protected fields
             const { id: _, created_by: __, created_at: ___, ...updateData } = payload;
             
             const { error } = await supa.from('listings').update(updateData).eq('id', payload.id);
             if (error) throw error;
        } else {
             // INSERT New (with specific ID)
             payload.created_by = userId;
             const { error } = await supa.from('listings').insert(payload);
             if (error) throw error;
        }
    } else {
        // INSERT
        // Force created_by to be the authenticated user
        payload.created_by = userId;
        const { error } = await supa.from('listings').insert(payload);
        if (error) throw error;
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (e) {
    console.error("Save API Error FULL:", e);
    // Return the actual error message to the client
    return new Response(JSON.stringify({ error: e.message || "Unknown server error", details: e }), { status: 500 });
  }
}
