import { supaAdmin } from '@/lib/supabaseAdmin';
import { banUser, unbanUser } from '@/lib/bot';

/**
 * Ban a user
 * POST /api/admin/ban-user
 * Body: { userId: string, reason: string, action: 'ban' | 'unban' }
 */
export async function POST(req) {
  try {
    const { userId, reason, action } = await req.json();
    
    if (!userId || !action) {
      return new Response(
        JSON.stringify({ error: 'userId and action are required' }),
        { status: 400 }
      );
    }
    
    const supa = supaAdmin();
    
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
