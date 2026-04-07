"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getTG } from "@/lib/telegram";
import { useLang } from "@/lib/i18n-client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLang();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const nextPath = searchParams.get("next") || "/my";

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const tg = (window.Telegram && window.Telegram.WebApp) || getTG?.() || null;
      const initData = tg?.initData;

      if (!initData) {
        throw new Error(t("login_tg_fail") || "Не удалось получить данные Telegram. Попробуйте открыть приложение заново.");
      }

      const res = await fetch("/api/auth/tg/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t("login_auth_err") || "Ошибка авторизации. Попробуйте позже.");
      }

      // Cookie is set automatically by the server (HttpOnly).
      // Verify that we're authenticated by calling /api/auth/me
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();

      if (!meData.user) {
        throw new Error(t("login_session_err") || "Сессия не сохранилась. Попробуйте снова.");
      }

      // Success — go to the originally requested protected page.
      router.replace(nextPath);
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || t("login_gen_err") || "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-login attempt on mount
    handleLogin();
  }, [nextPath]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
      <h1 className="text-2xl font-bold mb-4">{t("login_title") || "Авторизация"}</h1>
      
      {loading ? (
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mb-4"></div>
      ) : (
        <>
            <p className="text-gray-600 mb-6">
                {error ? error : (t("login_prompt") || "Пожалуйста, авторизуйтесь для доступа к чату.")}
            </p>
            
            <button
                onClick={handleLogin}
                className="px-6 py-3 bg-black text-white rounded-full font-semibold hover:bg-gray-800 transition-colors"
            >
                {t("login_retry") || "Попробовать снова"}
            </button>
        </>
      )}
    </div>
  );
}
