import { supaAdmin } from '@/lib/supabaseAdmin';

export async function GET(req, { params }){
  const supa = supaAdmin();
  const { id } = params;
  const { data, error } = await supa.from('listings').select('*').eq('id', id).maybeSingle();
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  if (!data) return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
  return new Response(JSON.stringify({ item: data }), { status: 200 });
}
