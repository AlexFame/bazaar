import { z } from "zod";
import { supaAdmin } from "@/lib/supabaseAdmin";

// схема
const schema = z.object({
  title: z.string().min(3).max(120),
  type: z.enum(["buy", "sell", "free"]),
  price: z.number().nonnegative().optional().nullable(),
  description: z.string().max(4000).optional().nullable(),
  contacts: z.string().max(200).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
});

// POST /api/listing-dev
export async function POST(req) {
  const supa = supaAdmin();
  const body = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
      status: 400,
    });
  }

  const src = parsed.data;

  // гарантируем, что contacts не null
  const payload = {
    ...src,
    contacts: src.contacts ?? "", // если null/undefined → пустая строка
  };

  const { data, error } = await supa
    .from("listings")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
    });
  }

  return new Response(JSON.stringify({ id: data.id }), { status: 200 });
}
