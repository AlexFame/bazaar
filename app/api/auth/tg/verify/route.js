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

    const supa = supaAdmin();
    
    // 1. Check for existing profile (The "Truth" for data)
    const { data: existingProfile } = await supa
        .from('profiles')
        .select('id')
        .eq('tg_user_id', tg_user_id)
        .maybeSingle();

    let authUser;

    // 2. Check for existing Auth User by email
    const { data: { users }, error: listErr } = await supa.auth.admin.listUsers();
    if (listErr) throw listErr;
    
    let existingAuthUser = users.find(u => u.email === fakeEmail);

    if (existingProfile) {
        // Case A: Profile exists. We MUST match this ID to keep data access.
        
        if (existingAuthUser) {
            if (existingAuthUser.id === existingProfile.id) {
                // Perfect match
                authUser = existingAuthUser;
            } else {
                // Mismatch! The auth user is wrong (likely new/empty). The profile is old (has data).
                // Delete the wrong auth user so we can recreate it with the correct ID
                console.warn(`Mismatch! Deleting wrong auth user ${existingAuthUser.id} to restore profile ${existingProfile.id}`);
                await supa.auth.admin.deleteUser(existingAuthUser.id);
                
                // Re-create with correct ID
                const { data: newUser, error: createErr } = await supa.auth.admin.createUser({
                    id: existingProfile.id, // RESTORE OLD ID
                    email: fakeEmail,
                    email_confirm: true,
                    user_metadata: { tg_user_id, tg_username }
                });
                if (createErr) throw createErr;
                authUser = newUser.user;
            }
        } else {
            // Profile exists, but no Auth User (Orphan). Restore Auth User.
            console.log(`Restoring orphan profile ${existingProfile.id}`);
            const { data: newUser, error: createErr } = await supa.auth.admin.createUser({
                id: existingProfile.id, // RESTORE OLD ID
                email: fakeEmail,
                email_confirm: true,
                user_metadata: { tg_user_id, tg_username }
            });
            if (createErr) throw createErr;
            authUser = newUser.user;
        }
    } else {
        // Case B: No profile. Standard flow.
        if (existingAuthUser) {
            authUser = existingAuthUser;
        } else {
            const { data: newUser, error: createErr } = await supa.auth.admin.createUser({
                email: fakeEmail, // Auto ID
                email_confirm: true,
                user_metadata: { tg_user_id, tg_username }
            });
            if (createErr) throw createErr;
            authUser = newUser.user;
        }
    }

    // 3. Upsert profile to ensure it's up to date
    const { data: profile, error: profileErr } = await supa
        .from('profiles')
        .upsert({ 
            id: authUser.id, 
            tg_user_id, 
            tg_username
            // updated_at removed to avoid schema error
        })
        .select()
        .single();
        
    if (profileErr) throw profileErr;

    // Create token
    const token = jwt.sign({ 
        aud: 'authenticated', 
        role: 'authenticated', 
        sub: authUser.id, // Now guaranteed to match auth.users.id
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
