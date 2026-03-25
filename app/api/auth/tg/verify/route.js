import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { supaAdmin } from '@/lib/supabaseAdmin';
import { withRateLimit } from '@/lib/ratelimit';
import { authVerifySchema, validateBody } from '@/lib/validation';

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

async function verifyHandler(req) {
  try {
    const body = await req.json();
    const v = validateBody(authVerifySchema, body);
    if (!v.ok) return v.error;
    const { initData } = v.data;
    
    if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET is MISSING!");
        return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500 });
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
        .select('id, avatar_url, full_name')
        .eq('tg_user_id', tg_user_id)
        .maybeSingle();

    let authUser;

    if (existingProfile) {
        // FAST PATH: Get AuthUser directly by ID (O(1)). Eliminates fetching all users!
        const { data: userResponse } = await supa.auth.admin.getUserById(existingProfile.id);
        const existingAuthUser = userResponse?.user;

        if (existingAuthUser) {
            authUser = existingAuthUser;
        } else {
            // Profile exists, but Auth User doesn't. Restore the Auth User with correct ID.
            const { data: newUser, error: createErr } = await supa.auth.admin.createUser({
                id: existingProfile.id,
                email: fakeEmail,
                email_confirm: true,
                user_metadata: { tg_user_id, tg_username }
            });
            
            if (createErr) {
                // If it fails with "Email exists", it means another mismatched Auth User holds the email.
                if (createErr.status === 422 || createErr.message.includes('already exists') || createErr.code === 'user_already_exists') {
                    console.warn(`Email already taken by a mismatched user. Resolving via listUsers fallback...`);
                    const { data: { users } } = await supa.auth.admin.listUsers();
                    const badUser = users.find(u => u.email === fakeEmail);
                    if (badUser) {
                         await supa.auth.admin.deleteUser(badUser.id);
                         const { data: retryUser, error: retryErr } = await supa.auth.admin.createUser({
                             id: existingProfile.id, email: fakeEmail, email_confirm: true, user_metadata: { tg_user_id, tg_username }
                         });
                         if (retryErr) throw retryErr;
                         authUser = retryUser.user;
                    } else throw createErr;
                } else throw createErr;
            } else {
                authUser = newUser.user;
            }
        }
    } else {
        // FAST PATH: First time login. Create user directly.
        const { data: newUser, error: createErr } = await supa.auth.admin.createUser({
            email: fakeEmail,
            email_confirm: true,
            user_metadata: { tg_user_id, tg_username }
        });
        
        if (createErr) {
            // If email exists, it's an orphaned Auth User without a Profile (edge case).
            if (createErr.status === 422 || createErr.message.includes('already exists') || createErr.code === 'user_already_exists') {
                console.warn(`Orphaned Auth User detected. Resolving via listUsers fallback...`);
                const { data: { users } } = await supa.auth.admin.listUsers();
                const orphanUser = users.find(u => u.email === fakeEmail);
                if (orphanUser) authUser = orphanUser;
                else throw createErr;
            } else throw createErr;
        } else {
            authUser = newUser.user;
        }
    }

    // 3. Upsert profile to ensure it's up to date
    const updates = { 
        id: authUser.id, 
        tg_user_id, 
        tg_username,
        full_name: data.user.first_name + (data.user.last_name ? ` ${data.user.last_name}` : '')
    };
    
    let avatar_url = data.user.photo_url || null;

    // If initData didn't provide a photo, let's try to fetch it via the Bot API
    if (!avatar_url) {
        try {
            const photosRes = await fetch(`https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/getUserProfilePhotos?user_id=${tg_user_id}&limit=1`);
            const photosData = await photosRes.json();
            if (photosData.ok && photosData.result.total_count > 0) {
                // Get the largest size of the first photo
                const photoSizes = photosData.result.photos[0];
                const bestPhoto = photoSizes[photoSizes.length - 1]; // Last is usually largest, or first is smallest. Actually photos is array of sizes.
                const fileRes = await fetch(`https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/getFile?file_id=${bestPhoto.file_id}`);
                const fileData = await fileRes.json();
                if (fileData.ok) {
                    avatar_url = `https://api.telegram.org/file/bot${process.env.TG_BOT_TOKEN}/${fileData.result.file_path}`;
                }
            }
        } catch (botErr) {
            console.error("Failed to fetch avatar from Bot API:", botErr);
        }
    }

    if (avatar_url) {
        updates.avatar_url = avatar_url;
    } else if (existingProfile && existingProfile.avatar_url) {
        updates.avatar_url = existingProfile.avatar_url;
    }

    const { data: profile, error: profileErr } = await supa
        .from('profiles')
        .upsert(updates)
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

    const res = new Response(JSON.stringify({ ok: true, user: profile }), { status: 200 });
    res.headers.set('Set-Cookie', `app_session=${token}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${30 * 24 * 60 * 60}`);
    return res;
  } catch (e) {
    console.error("Auth error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

export const POST = withRateLimit(verifyHandler, { limit: 10, window: '1 m' });
