// app/me/page.js
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n-client";
import { getTelegramUser, isTelegramEnv } from "@/lib/telegram";

const pageTranslations = {
  ru: {
    title: "Личный кабинет",
    subtitle: "Здесь будет управление профилем и объявлениями.",
    notInTelegramTitle: "Открой из Telegram",
    notInTelegramText:
      "Личный кабинет работает, когда ты открываешь Bazaar из Telegram-бота. Тогда мы сможем привязать твои объявления к твоему аккаунту.",
    userBlockTitle: "Telegram-профиль",
    noUserText:
      "Не удалось получить данные из Telegram. Попробуй закрыть WebApp и открыть заново из бота.",
    nameLabel: "Имя",
    usernameLabel: "Юзернейм",
    idLabel: "Telegram ID",
    langLabel: "Язык Telegram",
    goMyListings: "Мои объявления",
    goCreate: "Создать объявление",
  },
  ua: {
    title: "Особистий кабінет",
    subtitle: "Тут буде керування профілем та оголошеннями.",
    notInTelegramTitle: "Відкрий з Telegram",
    notInTelegramText:
      "Особистий кабінет працює, коли ти відкриваєш Bazaar з Telegram-бота. Тоді ми зможемо привʼязати твої оголошення до твого акаунта.",
    userBlockTitle: "Telegram-профіль",
    noUserText:
      "Не вдалося отримати дані з Telegram. Спробуй закрити WebApp і відкрити знову з бота.",
    nameLabel: "Імʼя",
    usernameLabel: "Юзернейм",
    idLabel: "Telegram ID",
    langLabel: "Мова Telegram",
    goMyListings: "Мої оголошення",
    goCreate: "Створити оголошення",
  },
  en: {
    title: "Account",
    subtitle: "Here you’ll manage your profile and listings.",
    notInTelegramTitle: "Open from Telegram",
    notInTelegramText:
      "Account works when you open Bazaar from the Telegram bot. Then we can link your listings to your Telegram account.",
    userBlockTitle: "Telegram profile",
    noUserText:
      "Could not read Telegram data. Try closing the WebApp and opening it again from the bot.",
    nameLabel: "Name",
    usernameLabel: "Username",
    idLabel: "Telegram ID",
    langLabel: "Telegram language",
    goMyListings: "My listings",
    goCreate: "Create listing",
  },
};

export default function MePage() {
  const { lang } = useLang();
  const t = pageTranslations[lang] || pageTranslations.ru;

  const [isTgEnv, setIsTgEnv] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const inTelegram = isTelegramEnv();
    setIsTgEnv(inTelegram);

    if (inTelegram) {
      const u = getTelegramUser();
      if (u) {
        setUser(u);
      }
    }
  }, []);

  return (
    <div className="w-full flex justify-center mt-3">
      <div className="w-full max-w-[520px] px-3 space-y-4">
        <div>
          <h1 className="text-lg font-semibold mb-1">{t.title}</h1>
          <p className="text-sm text-gray-500">{t.subtitle}</p>
        </div>

        {/* Предупреждение, если не в Telegram */}
        {!isTgEnv && (
          <div className="bg-yellow-50 border border-yellow-200 text-[13px] rounded-2xl p-3">
            <div className="font-semibold mb-1">{t.notInTelegramTitle}</div>
            <p className="text-gray-700 leading-snug">{t.notInTelegramText}</p>
          </div>
        )}

        {/* Блок с данными пользователя из Telegram */}
        {isTgEnv && (
          <div className="bg-white rounded-2xl shadow-sm p-3 text-[13px]">
            <div className="font-semibold mb-2">{t.userBlockTitle}</div>

            {!user && (
              <p className="text-gray-500 leading-snug">{t.noUserText}</p>
            )}

            {user && (
              <div className="space-y-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold">
                    {user.first_name?.[0]}
                    {user.last_name?.[0]}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {user.first_name}
                      {user.last_name ? ` ${user.last_name}` : ""}
                    </span>
                    {user.username && (
                      <span className="text-xs text-gray-500">
                        @{user.username}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div>
                    <div className="text-[11px] text-gray-400">{t.idLabel}</div>
                    <div className="text-[13px] text-gray-800 break-all">
                      {user.id}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-gray-400">
                      {t.langLabel}
                    </div>
                    <div className="text-[13px] text-gray-800">
                      {user.language_code || "—"}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-gray-400">
                      {t.nameLabel}
                    </div>
                    <div className="text-[13px] text-gray-800">
                      {user.first_name}
                      {user.last_name ? ` ${user.last_name}` : ""}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-gray-400">
                      {t.usernameLabel}
                    </div>
                    <div className="text-[13px] text-gray-800">
                      {user.username ? `@${user.username}` : "—"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Навигация по ЛК */}
        <div className="space-y-2">
          <Link href="/my">
            <button className="w-full rounded-2xl bg-black text-white text-sm py-3">
              {t.goMyListings}
            </button>
          </Link>

          <Link href="/create">
            <button className="w-full rounded-2xl bg-white text-black border border-gray-200 text-sm py-3">
              {t.goCreate}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
