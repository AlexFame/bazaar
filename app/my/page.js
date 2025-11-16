"use client";

import { useLang } from "@/lib/i18n-client";

const pageTranslations = {
  ru: {
    my: "Мои объявления",
    text: "Личный кабинет работает, когда ты открываешь сайт из Telegram-бота. Зайди через кнопку в боте, чтобы увидеть свои объявления.",
  },
  ua: {
    my: "Мої оголошення",
    text: "Особистий кабінет працює, коли ти відкриваєш сайт з Telegram-бота. Зайди через кнопку в боті, щоб побачити свої оголошення.",
  },
  en: {
    my: "My listings",
    text: "Your personal area works when you open the site from the Telegram bot. Use the button in the bot to see your listings.",
  },
};

export default function MyPage() {
  const { lang } = useLang();
  const t = pageTranslations[lang] || pageTranslations.ru;

  return (
    <div className="w-full flex justify-center mt-6 px-3">
      <div className="bg-white rounded-2xl shadow-sm p-4 max-w-sm w-full text-center text-xs">
        <h1 className="text-sm font-semibold mb-2">{t.my}</h1>
        <p>{t.text}</p>
      </div>
    </div>
  );
}
