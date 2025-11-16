// lib/useTelegramUser.js
"use client";

import { useEffect, useState } from "react";

export function useTelegramUser() {
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1) Telegram WebApp
    const tg = window.Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user) {
      const tUser = tg.initDataUnsafe.user;

      setUser({
        id: String(tUser.id),
        username: tUser.username || "",
        firstName: tUser.first_name || "",
        lastName: tUser.last_name || "",
        languageCode: tUser.language_code || "",
        source: "telegram",
      });
      setIsReady(true);
      return;
    }

    // 2) Обычный браузер – демо-юзер
    try {
      const stored = window.localStorage.getItem("bazaar_demo_user_id");
      let id = stored;

      if (!id) {
        if (typeof crypto !== "undefined" && crypto.randomUUID) {
          id = crypto.randomUUID();
        } else {
          id = String(Math.floor(Math.random() * 1_000_000_000));
        }
        window.localStorage.setItem("bazaar_demo_user_id", id);
      }

      setUser({
        id,
        username: "demo",
        firstName: "Demo",
        lastName: "",
        languageCode: "ru",
        source: "browser",
      });
    } catch {
      setUser({
        id: "anonymous",
        username: "anonymous",
        firstName: "",
        lastName: "",
        languageCode: "ru",
        source: "fallback",
      });
    } finally {
      setIsReady(true);
    }
  }, []);

  return { user, isReady };
}
