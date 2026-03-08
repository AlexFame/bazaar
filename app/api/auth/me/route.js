import { getUserFromCookie } from '@/lib/auth';
import { supaAdmin } from '@/lib/supabaseAdmin';

export async function GET(req) {
  const cookieUser = getUserFromCookie(req.headers);

  if (!cookieUser?.id) {
    return new Response(JSON.stringify({ user: null }), { status: 401 });
  }

  try {
    const supa = supaAdmin();
    const { data: profile, error } = await supa
      .from('profiles')
      .select('id, tg_user_id, tg_username, full_name, avatar_url, is_admin')
      .eq('id', cookieUser.id)
      .single();

    if (error || !profile) {
      return new Response(JSON.stringify({ user: null }), { status: 401 });
    }

    return new Response(JSON.stringify({ user: profile }), { status: 200 });
  } catch (e) {
    console.error('Auth /me error:', e);
    return new Response(JSON.stringify({ user: null }), { status: 500 });
  }
}
