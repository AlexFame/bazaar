import { NextResponse } from "next/server";
import { supaAdmin } from "@/lib/supabaseAdmin";
import crypto from 'crypto';
import { withRateLimit } from '@/lib/ratelimit';

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

async function listingDevHandler(req) {
  try {
    const body = await req.json();
    if (!body) {
      return NextResponse.json({ error: "Пустой запрос" }, { status: 400 });
    }

    // AUTH CHECK — require Telegram initData
    const { initData } = body;
    if (!initData || !process.env.TG_BOT_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authData = checkTelegramAuth(initData, process.env.TG_BOT_TOKEN);
    if (!authData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tgUserId = Number(authData.user.id);
    const supabase = supaAdmin();

    // Resolve profile from Telegram user
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('tg_user_id', tgUserId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Данные объявления
    const payload = {
      type: body.type || null,
      title: body.title || "",
      price: body.price ?? null,
      description: body.description || null,
      contacts: body.contacts || null,
      location_text: body.location || null,
      owner_id: profile.id, // Use verified profile ID, not user-supplied
      category_key: body.category_key || null,
    };

    // Сохраняем объявление
    const { data, error } = await supabase
      .from("listings")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("DB error:", error);
      return NextResponse.json(
        { error: "Ошибка базы данных", details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: data.id }, { status: 200 });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Непредвиденная ошибка", details: String(err) },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(listingDevHandler, { limit: 10, window: '30 s' });
