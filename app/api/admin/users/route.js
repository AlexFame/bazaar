import { supaAdmin } from "@/lib/supabaseAdmin";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req) {
    try {
        const token = req.headers.get("authorization")?.replace("Bearer ", "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
        if (authErr || !user) return new Response("Unauthorized", { status: 401 });

        const supa = supaAdmin();
        const { data: profile } = await supa.from("profiles").select("is_admin").eq("id", user.id).single();
        if (!profile?.is_admin) return new Response("Forbidden", { status: 403 });

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '0', 10);
        const search = searchParams.get('search') || '';
        const PAGE_SIZE = 20;

        let query = supa
          .from('profiles')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (search) {
          query = query.or(`full_name.ilike.%${search}%,tg_username.ilike.%${search}%`);
        }

        const { data, count, error } = await query;
        if (error) throw error;

        return new Response(JSON.stringify({ users: data, count }), { status: 200, headers: { 'Content-Type': 'application/json' }});
    } catch (e) {
        console.error("Admin Users API Error:", e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
