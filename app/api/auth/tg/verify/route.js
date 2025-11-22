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
    
    // Debug logs
    console.log("Verifying Telegram Auth...");
    if (process.env.JWT_SECRET) {
        console.log("JWT_SECRET prefix:", process.env.JWT_SECRET.substring(0, 5) + "...");
    } else {
        console.error("JWT_SECRET is MISSING!");
    }
    
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
    const fakeEmail = `${tg_user_id}@telegram.bazaar.app`;

    const tg_first_name = data.user.first_name || '';
    const tg_last_name = data.user.last_name || '';
    const full_name = `${tg_first_name} ${tg_last_name}`.trim() || tg_username || `User ${tg_user_id}`;
    const avatar_url = data.user.photo_url || null;

    const supa = supaAdmin();
    
    // 1. Ensure user exists in auth.users
    let authUser;
    const { data: { users }, error: listErr } = await supa.auth.admin.listUsers();
    if (listErr) throw listErr;
    
    authUser = users.find(u => u.email === fakeEmail);
    
    if (!authUser) {
        // Create new auth user
        const { data: newUser, error: createErr } = await supa.auth.admin.createUser({
            email: fakeEmail,
            email_confirm: true,
            user_metadata: { tg_user_id, tg_username, full_name, avatar_url }
        });
        if (createErr) throw createErr;
        authUser = newUser.user;
    } else {
        // Update metadata if exists
        await supa.auth.admin.updateUserById(authUser.id, {
            user_metadata: { tg_user_id, tg_username, full_name, avatar_url }
        });
    }

    // 2. Ensure profile exists in public.profiles with SAME ID
    // Check if a profile with this tg_user_id ALREADY exists but with a DIFFERENT ID
    // This happens if auth.users was cleared but profiles wasn't
    const { data: existingProfile } = await supa
        .from('profiles')
        .select('*')
        .eq('tg_user_id', tg_user_id)
        .maybeSingle();

    if (existingProfile && existingProfile.id !== authUser.id) {
        console.warn(`Mismatch! Profile ${existingProfile.id} has tg_user_id ${tg_user_id}, but auth user is ${authUser.id}. Deleting old profile.`);
        await supa.from('profiles').delete().eq('id', existingProfile.id);
    }

    // Check if profile exists with correct ID
    const { data: currentProfile } = await supa
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

    let profile;
    if (currentProfile) {
        // Update only name and avatar, preserve other fields
        const { data: updated, error: updateErr } = await supa
            .from('profiles')
            .update({ 
                tg_username,
                full_name,
                avatar_url
            })
            .eq('id', authUser.id)
            .select()
            .single();
        if (updateErr) throw updateErr;
        profile = updated;
    } else {
        // Create new profile
        const { data: created, error: createErr } = await supa
            .from('profiles')
            .insert({ 
                id: authUser.id, 
                tg_user_id, 
                tg_username,
                full_name,
                avatar_url
            })
            .select()
            .single();
        if (createErr) throw createErr;
        profile = created;
    }

    // Create token (assuming JWT_SECRET is Supabase JWT secret)
    const token = jwt.sign({ 
        aud: 'authenticated', 
        role: 'authenticated', 
        sub: authUser.id, // MUST match auth.users.id
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
