import { supaAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';
import { sanitizeTitle, sanitizeContent } from '@/lib/security';
import { withRateLimit } from '@/lib/ratelimit';
import { sendNotification } from '@/lib/bot';
import { revalidatePath } from 'next/cache';

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

async function saveHandler(req) {
  try {
    const body = await req.json();
    const { initData, ...payload } = body;
    
    console.log("SAVE API PAYLOAD:", {
      id: payload.id,
      title: payload.title,
      imageCount: payload.images?.length,
      ba: !!payload.before_after_images
    });
    
    if (!process.env.TG_BOT_TOKEN) return new Response(JSON.stringify({ error: 'Config error' }), { status: 500 });

    const authData = checkTelegramAuth(initData, process.env.TG_BOT_TOKEN);
    if (!authData || !authData.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const tgUserId = Number(authData.user.id);
    const supa = supaAdmin();

    // 1. Get Profile ID and Admin Status
    const { data: profile } = await supa.from('profiles').select('id, is_admin').eq('tg_user_id', tgUserId).single();
    if (!profile) return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404 });

    const userId = profile.id;
    const isAdmin = profile.is_admin || false;

    // 2. Handle Operation
    const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.(?:com|ru|net|org|io|me|xyz|ua)[^\s]*)/i;
    const GIBBERISH_REGEX = /[bcdfghjklmnpqrstvwxzбвгджзйклмнпрстфхцчшщ]{5,}/i;
    
    let { images: _img, id: _id, created_by: _cb, created_at: _ca, 
          is_vip: _vip, is_urgent: _urg, vip_until: _vu,
          views_count: _vc, contacts_count: _cc,
          ...listingData } = payload;
    
    // Sanitize user inputs (XSS prevention)
    if (listingData.title) listingData.title = sanitizeTitle(listingData.title);
    if (listingData.description) listingData.description = sanitizeContent(listingData.description);
    if (listingData.contacts) listingData.contacts = sanitizeContent(listingData.contacts);
    if (listingData.location_text) listingData.location_text = sanitizeContent(listingData.location_text);
    
    // Check if this is a "status only" update (e.g. marking as sold)
    const isStatusOnlyUpdate = payload.id && listingData.status && !listingData.title && (!payload.images || payload.images.length === 0);

    // Auto-fill required fields for Drafts
    if (listingData.status === 'draft') {
        if (!listingData.title || listingData.title.length < 3) {
            listingData.title = (listingData.title || "Черновик") + (listingData.title ? "" : " " + new Date().toLocaleTimeString());
            if (listingData.title.length < 3) listingData.title += "___";
        }
        if (!listingData.contacts) {
            listingData.contacts = "draft_placeholder";
        }
    } else if (!isStatusOnlyUpdate) {
        // STRICT VALIDATION FOR ACTIVE LISTINGS
        if (!payload.images || !Array.isArray(payload.images) || payload.images.length === 0) {
             return new Response(JSON.stringify({ error: 'validation_images_required' }), { status: 400 });
        }

        const title = listingData.title || "";
        if (title.length < 3) return new Response(JSON.stringify({ error: 'Title too short' }), { status: 400 });
        if (URL_REGEX.test(title)) return new Response(JSON.stringify({ error: 'Links in title forbidden' }), { status: 400 });
        if (GIBBERISH_REGEX.test(title)) return new Response(JSON.stringify({ error: 'validation_title_gibberish' }), { status: 400 });

        const desc = listingData.description || "";
        if (URL_REGEX.test(desc)) return new Response(JSON.stringify({ error: 'Links in description forbidden' }), { status: 400 });
        if (GIBBERISH_REGEX.test(desc)) return new Response(JSON.stringify({ error: 'Description looks like gibberish' }), { status: 400 });
        
        if (listingData.price < 0 || listingData.price > 10000000) return new Response(JSON.stringify({ error: 'Invalid price' }), { status: 400 });
    }

    let isNewPublish = false;

    if (payload.id) {
        // Check if listing exists
        const { data: existing } = await supa.from('listings').select('created_by, status').eq('id', payload.id).maybeSingle();
        
        if (existing) {
             // UPDATE Existing
             // BYPASS for Admins (useful for parsed listings)
             if (existing.created_by !== userId && !isAdmin) {
                 console.warn("Ownership mismatch for non-admin:", { userId, owner: existing.created_by });
                 return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
             }

             // If publishing a draft (or any unknown status -> active), update created_at to now so it bumps to top
             if (listingData.status === 'active' && existing.status === 'draft') {
                 const now = new Date().toISOString();
                 listingData.created_at = now;
                 listingData.bumped_at = now;
                 isNewPublish = true;
             }
             
             const { error } = await supa.from('listings').update(listingData).eq('id', payload.id);
             if (error) throw error;
        } else {
             // INSERT New (with specific ID)
             // Manually add created_by and id
             const insertData = { ...listingData, created_by: userId, id: payload.id, bumped_at: new Date().toISOString() };
             const { error } = await supa.from('listings').insert(insertData);
             if (error) throw error;
             if (listingData.status === 'active') isNewPublish = true;
        }
    } else {
        // INSERT (no ID provided)
        const insertData = { ...listingData, created_by: userId, bumped_at: new Date().toISOString() };
        const { data, error } = await supa.from('listings').insert(insertData).select('id').single();
        if (error) throw error;
        payload.id = data.id;
        if (listingData.status === 'active') isNewPublish = true;
    }

    // 3. Handle Images (Sync)
    const { images } = payload;
    if (Array.isArray(images)) {
        const listingId = payload.id;
        
        // Delete all existing images for this listing
        // (This fixes the duplication bug where client couldn't delete properly)
        await supa.from('listing_images').delete().eq('listing_id', listingId);

        // Insert new images
        if (images.length > 0) {
            const imageRows = images.map(img => ({
                listing_id: listingId,
                file_path: img.path,
                position: img.position
            }));
            
            const { error: imgError } = await supa.from('listing_images').insert(imageRows);
            if (imgError) {
                console.error("Error syncing images:", imgError);
                // We don't fail the whole request but we log it.
            }
        }
    }

    // 4. Notify Subscribers if newly published
    if (isNewPublish) {
       (async () => {
           try {
               const { data: subs } = await supa.from('user_subscriptions')
                   .select('subscriber:subscriber_id(id, tg_user_id, notification_preferences)')
                   .eq('target_user_id', userId);
                   
               if (subs && subs.length > 0) {
                   const { data: sellerProfile } = await supa.from('profiles').select('full_name, tg_username').eq('id', userId).single();
                   const sellerName = sellerProfile?.full_name || sellerProfile?.tg_username || 'Продавец';
                   
                   for (const sub of subs) {
                       const { subscriber } = sub;
                       if (!subscriber || !subscriber.tg_user_id) continue;
                       
                       // check notification prefs (default true)
                       const notifyPref = subscriber.notification_preferences?.['subscription'] ?? true;
                       if (!notifyPref) continue;
                       
                       const msg = `🔔 ${sellerName} выложил(а) новое объявление: "${listingData.title || title}"!`;
                       
                       await supa.from('notifications').insert({
                           user_id: subscriber.id,
                           type: 'subscription',
                           message: msg,
                           data: { listing_id: payload.id },
                           title: 'notification_new_subscription_post',
                           is_read: false
                       });
                       
                       await sendNotification(subscriber.tg_user_id, msg);
                   }
               }
           } catch (err) {
               console.error("Error notifying subscribers:", err);
           }
       })();
    }

    // Invalidate the main feed cache
    revalidatePath('/', 'page');
    revalidatePath('/(main)', 'layout'); 

    return new Response(JSON.stringify({ success: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e) {
    console.error("Save API Error FULL:", e);
    // Return a clean JSON error even if 'e' is complex
    const errorBody = JSON.stringify({ 
      error: e.message || "Unknown server error", 
      details: String(e) 
    });
    
    return new Response(errorBody, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export const POST = withRateLimit(saveHandler, { limit: 10, window: '30 s' });
