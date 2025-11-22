import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { supaAdmin } from '@/lib/supabaseAdmin';

function checkTelegramAuth(initData, botToken) {
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
  
  if (check !== hash) {
      console.log("Auth Failed:");
      console.log("Received Hash:", hash);
      console.log("Calculated Hash:", check);
      console.log("Data Check String:", dataCheckString);
      console.log("Bot Token (first 5):", botToken.substring(0, 5));
      return null;
  }
  
  const obj = Object.fromEntries(url.entries());
  if (obj.user) {
      try {
        obj.user = JSON.parse(obj.user);
      } catch (e) {
          console.error("Error parsing user field:", e);
      }
  }
  return obj;
}

export async function POST(req) {
  try {
    const { initData } = await req.json();
    
    if (!process.env.TG_BOT_TOKEN) {
        console.error("TG_BOT_TOKEN is missing");
        return new Response(JSON.stringify({ error: 'Server configuration error: TG_BOT_TOKEN missing' }), { status: 500 });
    }

    const data = checkTelegramAuth(initData, process.env.TG_BOT_TOKEN);
    if (!data) {
        console.error("Telegram auth hash mismatch");
        return new Response(JSON.stringify({ error: 'Telegram authentication failed (hash mismatch)' }), { status: 401 });
    }

    const tg_user_id = Number(data.user.id);
    const tg_username = data.user.username || null;

    const supa = supaAdmin();
    // ensure profile by tg_user_id
    const { data: existing, error: selErr } = await supa.from('profiles').select('*').eq('tg_user_id', tg_user_id).maybeSingle();
    if (selErr) throw selErr;
    let profile = existing;
    if (!profile) {
      const { data: ins, error: insErr } = await supa.from('profiles').insert({ tg_user_id, tg_username }).select('*').single();
      if (insErr) throw insErr;
      profile = ins;
    } else if (profile.tg_username !== tg_username) {
      await supa.from('profiles').update({ tg_username }).eq('id', profile.id);
    }

    // Create token (assuming JWT_SECRET is Supabase JWT secret)
    const token = jwt.sign({ 
        aud: 'authenticated', 
        role: 'authenticated', 
        sub: profile.id, 
        user_metadata: { tg_user_id } 
    }, process.env.JWT_SECRET, { expiresIn: '30d' });

    const res = new Response(JSON.stringify({ ok: true, token, user: profile }), { status: 200 });
    res.headers.set('Set-Cookie', `app_session=${token}; Path=/; HttpOnly; SameSite=Lax; Secure`);
    return res;
  } catch (e) {
    console.error("Auth error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
