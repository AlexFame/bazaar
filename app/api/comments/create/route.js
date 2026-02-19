import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { sanitizeContent } from '@/lib/security';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN;

const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

function checkTelegramAuth(initData) {
    if (!initData) return null;
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');
    
    // Sort keys
    const keys = Array.from(urlParams.keys()).sort();
    const dataCheckString = keys.map(key => `${key}=${urlParams.get(key)}`).join('\n');
    
    // HMAC-SHA256 signature check
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(TG_BOT_TOKEN).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    
    if (calculatedHash !== hash) return null;
    
    const userStr = urlParams.get('user');
    if (!userStr) return null;
    return JSON.parse(userStr);
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { initData, listingId, content } = body;

        // 1. Auth Check
        let userId = null;
        const tgUser = checkTelegramAuth(initData);
        if (!tgUser) {
             return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        // 2. Resolve Profile ID
        const { data: profile } = await supaAdmin
             .from('profiles')
             .select('id')
             .eq('telegram_id', tgUser.id)
             .single();
        
        if (!profile) {
             return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404 });
        }
        userId = profile.id;

        // 3. Sanitize input (XSS prevention)
        const cleanContent = sanitizeContent(content);
        if (!cleanContent || cleanContent.length < 1) {
            return new Response(JSON.stringify({ error: "Comment cannot be empty" }), { status: 400 });
        }

        // 4. Insert Comment
        const { data, error } = await supaAdmin
            .from('listing_comments')
            .insert({
                listing_id: listingId,
                user_id: userId,
                content: cleanContent
            })
            .select() // Return inserted data
            .single();

        if (error) throw error;

        // 4. Send Notification (Optional, handled by existing logic or here?)
        // The client code was handling it via another fetch.
        // We can just return success and let client handle notify? 
        // Or handle it here. For simplicity, let client do it or ignore for now.
        // Client uses `/api/notifications/telegram` which relies on `ownerId`.
        // We can keep that logic on client or move here.
        // Let's keep it simple: just return success.

        return new Response(JSON.stringify({ success: true, data }), { status: 200 });

    } catch (e) {
        console.error("Comment API Error:", e);
        return new Response(JSON.stringify({ error: e.message || "Server error" }), { status: 500 });
    }
}
