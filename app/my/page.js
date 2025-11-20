// app/my/page.js
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getUserId } from "@/lib/userId";
import { useLang } from "@/lib/i18n-client";
import ListingCard from "@/components/ListingCard";
import { getTelegramUser } from "@/lib/telegram";

const pageTranslations = {
  ru: {
    my: "Мои объявления",
    mySubtitle:
      "Здесь будут собраны все объявления, опубликованные с вашего Telegram-аккаунта.",
    createBtn: "Создать объявление",
    loading: "Загружаем ваши объявления...",
    empty: "У вас пока нет объявлений.",
    hintCreate: "Нажмите кнопку выше, чтобы опубликовать первое объявление.",
    userBlockTitle: "Telegram-профиль",
    noUserText:
      "Не удалось получить данные из Telegram. Это не критично — объявления всё равно будут работать.",
    nameLabel: "Имя",
    usernameLabel: "Юзернейм",
    idLabel: "Telegram ID",
    langLabel: "Язык Telegram",
  },
  ua: {
    my: "Мої оголошення",
    mySubtitle:
      "Тут будуть зібрані всі оголошення, опубліковані з вашого Telegram-акаунта.",
    createBtn: "Створити оголошення",
    loading: "Завантажуємо твої оголошення...",
    empty: "У вас поки немає оголошень.",
    hintCreate:
      "Натисніть кнопку вище, щоб опублікувати своє перше оголошення.",
    userBlockTitle: "Telegram-профіль",
    noUserText:
      "Не вдалося отримати дані з Telegram. Це не критично — оголошення все одно працюють.",
    nameLabel: "Імʼя",
    usernameLabel: "Юзернейм",
    idLabel: "Telegram ID",
    langLabel: "Мова Telegram",
  },
  en: {
    my: "My listings",
    mySubtitle:
      "All listings published from your Telegram account will appear here.",
    createBtn: "Create listing",
    loading: "Loading your listings...",
    empty: "You don’t have any listings yet.",
    hintCreate: "Tap the button above to publish your first listing.",
    userBlockTitle: "Telegram profile",
    noUserText:
      "Could not read Telegram data. It’s not critical – listings will still work.",
    nameLabel: "Name",
    usernameLabel: "Username",
    idLabel: "Telegram ID",
    langLabel: "Telegram language",
  },
};

export default function MyPage() {
  const { lang } = useLang();
  const t = pageTranslations[lang] || pageTranslations.ru;

  const [userId, setUserId] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tgUser, setTgUser] = useState(null);

  useEffect(() => {
    // Пытаемся достать юзера из Telegram, если объект доступен
    try {
      const u = getTelegramUser();
      if (u) setTgUser(u);
    } catch (e) {
      console.warn("Не удалось прочитать Telegram user:", e);
    }

    async function load() {
      const tgUserId = getUserId();
      setUserId(tgUserId);
      
      console.log("🔍 [My Listings] Telegram User ID:", tgUserId);

      if (!tgUserId) {
        console.log("❌ [My Listings] No Telegram User ID found");
        setLoading(false);
        setListings([]);
        return;
      }

      try {
        // Сначала находим UUID пользователя в таблице profiles по его Telegram ID
        console.log("🔍 [My Listings] Looking for profile with tg_user_id:", Number(tgUserId));
        
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("tg_user_id", Number(tgUserId))
          .single();

        console.log("📊 [My Listings] Profile query result:", { profileData, profileError });

        if (profileError || !profileData) {
          console.error("❌ [My Listings] Профиль не найден:", profileError);
          setListings([]);
          setLoading(false);
          return;
        }

        console.log("✅ [My Listings] Found profile UUID:", profileData.id);

        // Теперь ищем объявления по UUID из profiles
        const { data, error } = await supabase
          .from("listings")
          .select("*")
          .eq("created_by", profileData.id)
          .order("created_at", { ascending: false });

        console.log("📊 [My Listings] Listings query result:", { count: data?.length, error });

        if (error) {
          console.error("❌ [My Listings] Ошибка загрузки моих объявлений:", error);
          setListings([]);
        } else {
          console.log("✅ [My Listings] Found listings:", data);
          setListings(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error("❌ [My Listings] Ошибка загрузки моих объявлений:", e);
        setListings([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <div className="w-full flex justify-center mt-3">
      <div className="w-full max-w-[520px] px-3">
        <h1 className="text-lg font-semibold mb-1">{t.my}</h1>
        <p className="text-sm text-gray-500 mb-3">{t.mySubtitle}</p>

        {/* Блок с данными Telegram-пользователя, только если реально что-то есть */}
        {tgUser && (
          <div className="bg-white rounded-2xl shadow-sm p-3 mb-3 text-[13px]">
            <div className="font-semibold mb-2">{t.userBlockTitle}</div>

            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold">
                {tgUser.first_name?.[0]}
                {tgUser.last_name?.[0]}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {tgUser.first_name}
                  {tgUser.last_name ? ` ${tgUser.last_name}` : ""}
                </span>
                {tgUser.username && (
                  <span className="text-xs text-gray-500">
                    @{tgUser.username}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div>
                <div className="text-[11px] text-gray-400">{t.idLabel}</div>
                <div className="text-[13px] text-gray-800 break-all">
                  {tgUser.id}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-gray-400">{t.langLabel}</div>
                <div className="text-[13px] text-gray-800">
                  {tgUser.language_code || "—"}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-gray-400">{t.nameLabel}</div>
                <div className="text-[13px] text-gray-800">
                  {tgUser.first_name}
                  {tgUser.last_name ? ` ${tgUser.last_name}` : ""}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-gray-400">
                  {t.usernameLabel}
                </div>
                <div className="text-[13px] text-gray-800">
                  {tgUser.username ? `@${tgUser.username}` : "—"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Кнопка создания */}
        <div className="mb-3">
          <Link href="/create">
            <button className="w-full py-2.5 rounded-full bg-black text-white text-sm font-semibold">
              {t.createBtn}
            </button>
          </Link>
        </div>

        {/* Состояния списка объявлений */}
        {loading && (
          <div className="bg-white rounded-2xl shadow-sm p-3 text-xs text-black/60">
            {t.loading}
          </div>
        )}

        {!loading && listings.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-3 text-xs text-black/80">
            <p>{t.empty}</p>
            <p className="mt-1 text-black/60">{t.hintCreate}</p>
          </div>
        )}

        {!loading && listings.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-3">
            <div className="grid grid-cols-2 gap-2">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
