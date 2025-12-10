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

    // 2. Check Ownership
    const { data: listing } = await supa.from('listings').select('created_by').eq('id', id).single();
    if (!listing) return new Response(JSON.stringify({ error: 'Listing not found' }), { status: 404 });

    if (listing.created_by !== userId) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    // 3. Delete (Images will cascade if configured, but let's be safe later? Cascade is ON in schema)
    // schema: created_by ... on delete cascade. Listing images -> listing_id on delete cascade.
    // So just deleting listing is enough.
    
    // However, STORAGE files are NOT automatically deleted by Postgres Cascade.
    // We should delete images from storage too.
    
    // Fetch images first
    const { data: images } = await supa.from('listing_images').select('file_path').eq('listing_id', id);
    if (images && images.length > 0) {
        const paths = images.map(i => i.file_path);
        const { error: storageError } = await supa.storage.from('listing-images').remove(paths);
        if (storageError) console.error("Storage delete error:", storageError);
    }

    const { error } = await supa.from('listings').delete().eq('id', id);
    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (e) {
    console.error("Delete API Error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
