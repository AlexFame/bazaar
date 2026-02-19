import { supaAdmin } from '@/lib/supabaseAdmin';
import { banUser, unbanUser } from '@/lib/bot';
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
  if (obj.user) { try { obj.user = JSON.parse(obj.user); } catch (e) {} }
  return obj;
}

/**
 * Ban a user
 * POST /api/admin/ban-user
 * Body: { userId: string, reason: string, action: 'ban' | 'unban', initData: string }
 */
export async function POST(req) {
  try {
    const { userId, reason, action, initData } = await req.json();
    
    // AUTH CHECK
    if (!initData || !process.env.TG_BOT_TOKEN) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const authData = checkTelegramAuth(initData, process.env.TG_BOT_TOKEN);
    if (!authData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const supa = supaAdmin();

    // ADMIN CHECK
    const { data: callerProfile } = await supa.from('profiles').select('id, is_admin').eq('tg_user_id', Number(authData.user.id)).single();
    if (!callerProfile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin only' }), { status: 403 });
    }

    if (!userId || !action) {
      return new Response(
        JSON.stringify({ error: 'userId and action are required' }),
        { status: 400 }
      );
    }
    
    if (action === 'ban') {
      // Update database
      const { error } = await supa
        .from('profiles')
        .update({
          is_banned: true,
          ban_reason: reason || 'Spam or abuse',
          banned_at: new Date().toISOString(),
        })
        .eq('id', userId);
      
      if (error) throw error;
      
      // Get Telegram user ID
      const { data: profile } = await supa
        .from('profiles')
        .select('tg_user_id')
        .eq('id', userId)
        .single();
      
      if (profile?.tg_user_id) {
        await banUser(profile.tg_user_id.toString(), reason);
      }
      
      return new Response(
        JSON.stringify({ success: true, message: 'User banned' }),
        { status: 200 }
      );
    } else if (action === 'unban') {
      // Update database
      const { error } = await supa
        .from('profiles')
        .update({
          is_banned: false,
          ban_reason: null,
          banned_at: null,
        })
        .eq('id', userId);
      
      if (error) throw error;
      
      // Get Telegram user ID
      const { data: profile } = await supa
        .from('profiles')
        .select('tg_user_id')
        .eq('id', userId)
        .single();
      
      if (profile?.tg_user_id) {
        await unbanUser(profile.tg_user_id.toString());
      }
      
      return new Response(
        JSON.stringify({ success: true, message: 'User unbanned' }),
        { status: 200 }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use "ban" or "unban"' }),
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Ban/unban error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
}
