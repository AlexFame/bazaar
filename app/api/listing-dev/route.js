import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import { getUserId } from "@/lib/telegram";

export async function POST(req) {
  try {
    const body = await req.json();
    if (!body) {
      return NextResponse.json({ error: "Пустой запрос" }, { status: 400 });
    }

    // Получаем user_id из Telegram Mini App
    const owner_id = getUserId() || null;

    // Если нет owner_id — пользователь не открыл через Telegram
    if (!owner_id) {
      return NextResponse.json(
        {
          error:
            "Открой мини-аппку через нашего Telegram-бота, чтобы публиковать объявления.",
        },
        { status: 401 }
      );
    }

    // Данные объявления
    const payload = {
      type: body.type || null,
      title: body.title || "",
      price: body.price ?? null,
      description: body.description || null,
      contacts: body.contacts || null,
      location_text: body.location || null,

      // единственное новое поле:
      owner_id: owner_id,

      // категория — если есть в body, иначе null
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
