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
        const { initData, conversationId } = body;
        
        if (!process.env.TG_BOT_TOKEN) return new Response('Config Error', { status: 500 });
        
        const authData = checkTelegramAuth(initData, process.env.TG_BOT_TOKEN);
        if (!authData?.user) return new Response('Unauthorized', { status: 401 });
        
        const tgUserId = authData.user.id;
        const supa = supaAdmin();
        
        // 1. Get Profile ID
        const { data: profile } = await supa.from('profiles').select('id').eq('tg_user_id', tgUserId).single();
        if (!profile) return new Response('Profile not found', { status: 404 });
        
        const userId = profile.id;

        // 2. Get Conversation (Verify access)
        const { data: conv, error: convError } = await supa
        .from("conversations")
        .select(`
          *,
          listing:listings(id, title, price, image_path),
          buyer:profiles!conversations_buyer_id_fkey(id, full_name, avatar_url),
          seller:profiles!conversations_seller_id_fkey(id, full_name, avatar_url)
        `)
        .eq("id", conversationId)
        .single();
        
        if (convError || !conv) return new Response('Conversation not found', { status: 404 });
        
        // Check participation
        if (conv.buyer_id !== userId && conv.seller_id !== userId) {
            return new Response('Forbidden', { status: 403 });
        }

        // 3. fetch messages
        const { data: msgs, error: msgsError } = await supa
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
        
        if (msgsError) throw msgsError;
        
        // 4. Mark as read (Side effect)
        // We can do this asynchronously or blocking. Blocking ensures consistency.
        const unreadIds = msgs
            ?.filter(m => !m.is_read && m.sender_id !== userId)
            .map(m => m.id);
        
        if (unreadIds?.length > 0) {
            await supa.from('messages').update({ is_read: true }).in('id', unreadIds);
        }

        return new Response(JSON.stringify({ 
            conversation: conv,
            messages: msgs,
            currentUser: profile // Send resolved user back to client
        }), {
           status: 200,
           headers: { 'Content-Type': 'application/json' }
        });

    } catch (e) {
        console.error("Chat Detail API Error:", e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
