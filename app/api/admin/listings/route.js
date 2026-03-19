import { supaAdmin } from "@/lib/supabaseAdmin";
import { supabase } from "@/lib/supabaseClient";

async function checkAdmin(req) {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return null;
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return null;
    const supa = supaAdmin();
    const { data: profile } = await supa.from("profiles").select("is_admin").eq("id", user.id).single();
    if (!profile?.is_admin) return null;
    return supa;
}

export async function GET(req) {
    try {
        const supa = await checkAdmin(req);
        if (!supa) return new Response("Unauthorized", { status: 401 });

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '0', 10);
        const search = searchParams.get('search') || '';
        const PAGE_SIZE = 20;

        let query = supa
          .from('listings')
          .select('*, profiles:created_by(full_name, tg_username)', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (search) query = query.ilike('title', `%${search}%`);

        const { data, error } = await query;
        if (error) throw error;

        return new Response(JSON.stringify({ listings: data }), { status: 200, headers: { 'Content-Type': 'application/json' }});
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        const supa = await checkAdmin(req);
        if (!supa) return new Response("Unauthorized", { status: 401 });

        const body = await req.json();
        const { id, status } = body;
        const { error } = await supa.from('listings').update({ status }).eq('id', id);
        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' }});
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const supa = await checkAdmin(req);
        if (!supa) return new Response("Unauthorized", { status: 401 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const { error } = await supa.from('listings').delete().eq('id', id);
        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' }});
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
