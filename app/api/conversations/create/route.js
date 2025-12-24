import { supaAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

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
  if (obj.user) {
    try { obj.user = JSON.parse(obj.user); } catch (e) {}
  }
  return obj;
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { initData, listingId, sellerId } = body;
        
        if (!process.env.TG_BOT_TOKEN) return new Response('Config Error', { status: 500 });
        
        const authData = checkTelegramAuth(initData, process.env.TG_BOT_TOKEN);
        if (!authData?.user) return new Response('Unauthorized', { status: 401 });
        
        const tgUserId = authData.user.id;
        const supa = supaAdmin();
        
        // 1. Get Profile ID (Buyer)
        const { data: buyerProfile } = await supa.from('profiles').select('id').eq('tg_user_id', tgUserId).single();
        if (!buyerProfile) return new Response('Profile not found', { status: 404 });
        
        const buyerId = buyerProfile.id;

        // 2. Check overlap
        if (buyerId === sellerId) {
             return new Response('Cannot chat with self', { status: 400 });
        }

        // 3. Check existing conversation
        // Since listing_id, buyer_id, seller_id unique constraint exists?
        // Actually schema says: unique(listing_id, buyer_id, seller_id)
        
        const { data: existing } = await supa
            .from('conversations')
            .select('id')
            .eq('listing_id', listingId)
            .eq('buyer_id', buyerId)
            .eq('seller_id', sellerId)
            .maybeSingle();

        if (existing) {
             return new Response(JSON.stringify(existing), { status: 200 });
        }
        
        // 4. Create New
        const { data: newConv, error } = await supa
            .from('conversations')
            .insert({
                listing_id: listingId,
                buyer_id: buyerId,
                seller_id: sellerId
            })
            .select()
            .single();

        if (error) throw error;

        return new Response(JSON.stringify(newConv), {
           status: 200, // Created
           headers: { 'Content-Type': 'application/json' }
        });

    } catch (e) {
        console.error("Create Chat API Error:", e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
