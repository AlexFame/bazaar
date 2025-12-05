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
    
  // Use WebAppData key as per Telegram docs
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken.trim()).digest();
  const check = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  
  if (check !== hash) return null;
  
  const obj = Object.fromEntries(url.entries());
  if (obj.user) {
      try {
        obj.user = JSON.parse(obj.user);
      } catch (e) {
          console.error("Error parsing user:", e);
      }
  }
  return obj;
}

export async function POST(req, { params }) {
  try {
    const { id } = params;
    const { initData } = await req.json();

    if (!process.env.TG_BOT_TOKEN) {
        return new Response(JSON.stringify({ error: 'Server config error' }), { status: 500 });
    }

    const authData = checkTelegramAuth(initData, process.env.TG_BOT_TOKEN);
    if (!authData || !authData.user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const tgUserId = Number(authData.user.id);
    const supa = supaAdmin();

    // 1. Get the listing and check ownership
    const { data: listing, error: fetchError } = await supa
        .from('listings')
        .select('created_by, profiles:created_by(tg_user_id)')
        .eq('id', id)
        .single();

    if (fetchError || !listing) {
        return new Response(JSON.stringify({ error: 'Listing not found' }), { status: 404 });
    }

    // Check if the requestor is the owner
    // listing.profiles.tg_user_id should match tgUserId
    const ownerTgId = listing.profiles?.tg_user_id;

    if (ownerTgId !== tgUserId) {
         // Check for admin
         const { data: adminProfile } = await supa
            .from('profiles')
            .select('is_admin')
            .eq('tg_user_id', tgUserId)
            .single();
            
         if (!adminProfile?.is_admin) {
             return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
         }
    }

    // 2. Delete the listing
    const { error: deleteError } = await supa
        .from('listings')
        .delete()
        .eq('id', id);

    if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (e) {
    console.error("Delete API Error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
