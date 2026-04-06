import { supaAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';
import { withRateLimit } from '@/lib/ratelimit';

// Reusable Telegram Auth Check (should be in a lib but putting here for speed)
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

async function conversationsHandler(req) {
    try {
        const startedAt = Date.now();
        const body = await req.json();
        const { initData } = body;
        
        if (!process.env.TG_BOT_TOKEN) return new Response('Config Error', { status: 500 });
        
        const authData = checkTelegramAuth(initData, process.env.TG_BOT_TOKEN);
        if (!authData?.user) return new Response('Unauthorized', { status: 401 });
        
        const tgUserId = authData.user.id;
        const supa = supaAdmin();
        
        // 1. Get Profile
        const profileStartedAt = Date.now();
        const { data: profile } = await supa.from('profiles').select('id, full_name, avatar_url').eq('tg_user_id', tgUserId).single();
        console.info(`[api/conversations] profile lookup: ${Date.now() - profileStartedAt}ms`);
        if (!profile) return new Response(JSON.stringify([]), { status: 200 }); // Valid auth, no profile = no chats
        
        const userId = profile.id;
        
        const queryColumns = `
              id,
              updated_at,
              buyer_id,
              seller_id,
              listing:listings(id, title, main_image_path, price),
              buyer:profiles!conversations_buyer_id_fkey(id, full_name, avatar_url),
              seller:profiles!conversations_seller_id_fkey(id, full_name, avatar_url),
              deleted_by_buyer,
              deleted_by_seller,
              messages (content, created_at, sender_id)
        `;

        const conversationsStartedAt = Date.now();
        const [buyingRes, sellingRes] = await Promise.all([
            supa.from("conversations")
                .select(queryColumns)
                .eq('buyer_id', userId)
                .eq('deleted_by_buyer', false)
                .order("updated_at", { ascending: false })
                .order("created_at", { foreignTable: "messages", ascending: false })
                .limit(1, { foreignTable: "messages" })
                .limit(50),
            supa.from("conversations")
                .select(queryColumns)
                .eq('seller_id', userId)
                .eq('deleted_by_seller', false)
                .order("updated_at", { ascending: false })
                .order("created_at", { foreignTable: "messages", ascending: false })
                .limit(1, { foreignTable: "messages" })
                .limit(50)
        ]);
        console.info(`[api/conversations] conversations queries: ${Date.now() - conversationsStartedAt}ms`);

        if (buyingRes.error) throw buyingRes.error;
        if (sellingRes.error) throw sellingRes.error;

        const conversations = [...(buyingRes.data || []), ...(sellingRes.data || [])]
            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
            .slice(0, 50);

        const conversationsWithMessages = conversations.map(conv => {
             const msgs = conv.messages || [];
             delete conv.messages;
             // Sort manual since removed from query
             msgs.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
             return { ...conv, lastMessage: msgs.length > 0 ? msgs[0] : null };
        });
        
        // 4. Counts
        const unreadStartedAt = Date.now();
        const { data: unreadData } = await supa
            .from('messages')
            .select('conversation_id')
            .eq('is_read', false)
            .neq('sender_id', userId)
            .in('conversation_id', conversations.map(c => c.id));
        console.info(`[api/conversations] unread counts: ${Date.now() - unreadStartedAt}ms`);
            
        const unreadCounts = {};
        unreadData?.forEach(m => {
            unreadCounts[m.conversation_id] = (unreadCounts[m.conversation_id] || 0) + 1;
        });

        console.info(
          `[api/conversations] total: ${Date.now() - startedAt}ms conversations=${conversationsWithMessages.length}`
        );

        return new Response(JSON.stringify({ currentUser: profile, conversations: conversationsWithMessages, unreadCounts }), {
           status: 200,
           headers: { 'Content-Type': 'application/json' }
        });

    } catch (e) {
        console.error("Chats API Error:", e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export const POST = withRateLimit(conversationsHandler, { limit: 20, window: '30 s' });
