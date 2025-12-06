import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE;

// Init server-side Supabase client with admin rights
const supa = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req) {
  try {
    const { listing_id, price, initData } = await req.json();

    if (!initData) {
      return new Response(JSON.stringify({ error: 'Missing initData' }), { status: 401 });
    }

    // 1. Verify Telegram Auth
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');
    
    // Sort keys alphabetically
    const keys = Array.from(urlParams.keys()).sort();
    const dataCheckString = keys.map(key => `${key}=${urlParams.get(key)}`).join('\n');
    
    // Calculate secret key
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(process.env.TG_BOT_TOKEN).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    
    if (calculatedHash !== hash) {
       return new Response(JSON.stringify({ error: 'Auth failed' }), { status: 401 });
    }

    // 2. Get User ID (Supabase ID linked to Telegram ID)
    const userStr = urlParams.get('user');
    const tgUser = JSON.parse(userStr);
    const tgUserId = tgUser.id;

    // Resolve profile ID
    const { data: profile } = await supa
      .from('profiles')
      .select('id')
      .eq('tg_user_id', tgUserId)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'User profile not found' }), { status: 404 });
    }

    const userId = profile.id;

    // 3. Create Offer
    // Check if offer already exists? The DB constraint handles unique pending.
    // Upsert? Or just Insert and fail if exists?
    // User can cancel old offer.
    // Let's try to insert. 
    
    const { data, error } = await supa
        .from('offers')
        .insert({
            listing_id,
            buyer_id: userId,
            price,
            status: 'pending'
        })
        .select()
        .single();

    if (error) {
        if (error.code === '23505') { // Unique violation
             return new Response(JSON.stringify({ error: 'You already have a pending offer for this item' }), { status: 400 });
        }
        throw error;
    }

    return new Response(JSON.stringify({ success: true, offer: data }), { status: 200 });

  } catch (err) {
    console.error('Make Offer API Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
