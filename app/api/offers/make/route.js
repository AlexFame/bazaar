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
    
    const { data: offerData, error } = await supa
        .from('offers')
        .insert({
            listing_id,
            buyer_id: userId,
            price,
            status: 'pending'
        })
        .select(`
            *,
            listing:listings(id, title, created_by),
            buyer:profiles!buyer_id(id, full_name, tg_username)
        `)
        .single();

    if (error) {
        if (error.code === '23505') { // Unique violation
             return new Response(JSON.stringify({ error: 'You already have a pending offer for this item' }), { status: 400 });
        }
        throw error;
    }
    
    // 4. Send Notification to Seller
    const listing = offerData.listing;
    const buyer = offerData.buyer;
    const sellerId = listing.created_by;
    
    // Don't notify if making offer on own item (should act. be blocked)
    if (sellerId && sellerId !== userId) {
        const fetch = require('node-fetch'); // or use gloabl fetch if available in Next.js 13+
        // Actually, we can just reuse the logic from notifications route OR simply insert + send here directly
        // Reuse internal logic is cleaner? But let's just do it directly with 'supa' to be fast.
        
        const message = `💸 Новое предложение цены! \n\nПользователь ${buyer.full_name || buyer.tg_username} предложил ${price}€ за "${listing.title}".`;
        
        // In-App
        await supa.from("notifications").insert({
            user_id: sellerId,
            type: "offer",
            title: "Новое предложение",
            message: message,
            data: { offer_id: offerData.id, listing_id: listing_id }
        });
        
        // Telegram
        // Get seller tg_id
        const { data: sellerProfile } = await supa.from("profiles").select("tg_user_id, notification_preferences").eq("id", sellerId).single();
        
        if (sellerProfile && sellerProfile.tg_user_id) {
             const prefs = sellerProfile.notification_preferences || {};
             if (prefs.offer !== false) {
                 const { sendNotification } = require("@/lib/bot");
                 await sendNotification(sellerProfile.tg_user_id, message);
             }
        }
    }

    return new Response(JSON.stringify({ success: true, offer: offerData }), { status: 200 });

  } catch (err) {
    console.error('Make Offer API Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
