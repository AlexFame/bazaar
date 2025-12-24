import { supaAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

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

export async function POST(req) {
    try {
        const body = await req.json();
        const { initData } = body;
        
        if (!process.env.TG_BOT_TOKEN) return new Response('Config Error', { status: 500 });
        
        const authData = checkTelegramAuth(initData, process.env.TG_BOT_TOKEN);
        if (!authData?.user) return new Response('Unauthorized', { status: 401 });
        
        const tgUserId = authData.user.id;
        const supa = supaAdmin();
        
        // 1. Get Profile ID
        const { data: profile } = await supa.from('profiles').select('id').eq('tg_user_id', tgUserId).single();
        if (!profile) return new Response(JSON.stringify([]), { status: 200 }); // Valid auth, no profile = no chats
        
        const userId = profile.id;
        
        // 2. Fetch Conversations
        const { data: conversations, error } = await supa
            .from("conversations")
            .select(`
              id,
              updated_at,
              buyer_id,
              seller_id,
              listing:listings(id, title, image_path, price),
              buyer:profiles!conversations_buyer_id_fkey(id, full_name, avatar_url),
              seller:profiles!conversations_seller_id_fkey(id, full_name, avatar_url),
              deleted_by_buyer,
              deleted_by_seller
            `)
            .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
            .order("updated_at", { ascending: false });
            
        if (error) throw error;
        
        // 3. Fetch Last Messages (n+1 problem, but tolerable for paging)
        // Optimization: Fetch all messages for these conversation IDs in one go?
        // Or just iterate.
        const conversationsWithMessages = await Promise.all(conversations.map(async (conv) => {
             const { data: lastMsg } = await supa
               .from("messages")
               .select("content, created_at, sender_id")
               .eq("conversation_id", conv.id)
               .order("created_at", { ascending: false })
               .limit(1)
               .maybeSingle(); // Use maybeSingle to avoid 406 on empty
               
             return { ...conv, lastMessage: lastMsg };
        }));
        
        // 4. Counts
        const { data: unreadData } = await supa
            .from('messages')
            .select('conversation_id')
            .eq('is_read', false)
            .neq('sender_id', userId)
            .in('conversation_id', conversations.map(c => c.id));
            
        const unreadCounts = {};
        unreadData?.forEach(m => {
            unreadCounts[m.conversation_id] = (unreadCounts[m.conversation_id] || 0) + 1;
        });

        return new Response(JSON.stringify({ conversations: conversationsWithMessages, unreadCounts }), {
           status: 200,
           headers: { 'Content-Type': 'application/json' }
        });

    } catch (e) {
        console.error("Chats API Error:", e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
