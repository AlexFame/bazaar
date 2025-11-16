"use client";

import { useEffect, useState } from "react";
import { getUserId } from "@/lib/userId";
import { useLang } from "@/lib/i18n-client";

const pageTranslations = {
  ru: {
    my: "Мои объявления",
    needBot:
      "Открой мини-аппку через Telegram-бота, чтобы увидеть свои объявления.",
  },
  ua: {
    my: "Мої оголошення",
    needBot:
      "Відкрий міні-додаток через Telegram-бота, щоб побачити свої оголошення.",
  },
  en: {
    my: "My listings",
    needBot: "Open the mini-app through the Telegram bot to see your listings.",
  },
};

export default function MyPage() {
  const { lang } = useLang();
  const t = pageTranslations[lang] || pageTranslations.ru;

  const [userId, setUserId] = useState(null);

  // DEBUG BLOCK
  const [debug, setDebug] = useState("");

  useEffect(() => {
    async function loadUser() {
      const id = await getUserId();
      setUserId(id);
    }
    loadUser();

    // DEBUG: показать initDataUnsafe
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      try {
        const raw = window.Telegram.WebApp.initDataUnsafe || {};
        setDebug(JSON.stringify(raw, null, 2));
      } catch {}
    }
  }, []);

  return (
    <div className="w-full flex flex-col items-center mt-6 px-3">
      <div className="bg-white rounded-2xl shadow-sm p-4 max-w-sm w-full text-left">
        <h1 className="text-lg font-semibold mb-3">{t.my}</h1>

        {!userId ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {t.needBot}
          </div>
        ) : (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
            Твой Telegram user_id: {userId}
          </div>
        )}

        {/* DEBUG OUTPUT */}
        {debug && (
          <pre className="mt-4 text-[10px] text-black/60 whitespace-pre-wrap break-all">
            {debug}
          </pre>
        )}
      </div>
    </div>
  );
}
