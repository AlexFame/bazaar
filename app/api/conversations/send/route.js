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
        const { initData, conversationId, content } = body;
        
        if (!process.env.TG_BOT_TOKEN) return new Response('Config Error', { status: 500 });
        
        const authData = checkTelegramAuth(initData, process.env.TG_BOT_TOKEN);
        if (!authData?.user) return new Response('Unauthorized', { status: 401 });
        
        const tgUserId = authData.user.id;
        const supa = supaAdmin();
        
        // 1. Get Profile ID (Sender)
        const { data: senderProfile } = await supa.from('profiles').select('id').eq('tg_user_id', tgUserId).single();
        if (!senderProfile) return new Response('Profile not found', { status: 404 });
        
        const senderId = senderProfile.id;

        // 2. Verify Membership
        const { data: conv } = await supa
            .from('conversations')
            .select('buyer_id, seller_id')
            .eq('id', conversationId)
            .single();
            
        if (!conv) return new Response('Conversation not found', { status: 404 });
        
        if (conv.buyer_id !== senderId && conv.seller_id !== senderId) {
            return new Response('Forbidden', { status: 403 });
        }

        // 3. Insert Message
        const { data: newMsg, error } = await supa
            .from('messages')
            .insert({
                conversation_id: conversationId,
                sender_id: senderId,
                content: content
            })
            .select()
            .single();

        if (error) throw error;
        
        // 4. Trigger Update time on conversation (Trigger handles it but Admin bypass triggers? No, triggers run.)
        // But just in case.
        
        return new Response(JSON.stringify(newMsg), {
           status: 200,
           headers: { 'Content-Type': 'application/json' }
        });

    } catch (e) {
        console.error("Send Message API Error:", e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
