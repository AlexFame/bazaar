// app/api/listings/route.js
import { z } from "zod";
import { supaAdmin } from "@/lib/supabaseAdmin";

// Схема валидации объявления
const schema = z.object({
  title: z.string().min(3).max(120),
  type: z.enum(["buy", "sell", "free"]),
  price: z.number().nonnegative().optional().nullable(),
  description: z.string().max(4000).optional().nullable(),
  contacts: z.string().max(200).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  // ВАЖНО: теперь принимаем массив фоток (URL или пути)
  photos: z.array(z.string()).optional().nullable(),
});

// GET /api/listings?type=sell|buy|free
export async function GET(req) {
  const supa = supaAdmin();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  let query = supa
    .from("listings")
    .select("id,title,price,location,type,created_at,image_path,status")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(50);

  if (type && ["buy", "sell", "free"].includes(type)) {
    query = query.eq("type", type);
  }

  const { data, error } = await query;

  if (error) {
    console.error("GET /api/listings error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
    });
  }

  return new Response(JSON.stringify({ items: data ?? [] }), { status: 200 });
}

// POST /api/listings
// Авторизацию сейчас не трогаем - просто создаём объявление
export async function POST(req) {
  const supa = supaAdmin();
  const body = await req.json();

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    console.error("POST /api/listings validation:", parsed.error.flatten());
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
      status: 400,
    });
  }

  // Просто вставляем данные как есть (без created_by, чтобы не ломать uuid)
  const insertData = {
    ...parsed.data,
  };

  const { data, error } = await supa
    .from("listings")
    .insert(insertData)
    .select("id")
    .single();

  if (error) {
    console.error("POST /api/listings error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
    });
  }

  return new Response(JSON.stringify({ id: data.id }), { status: 200 });
}
