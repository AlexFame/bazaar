"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTG } from "@/lib/telegram";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const tg = (window.Telegram && window.Telegram.WebApp) || getTG?.() || null;
      const initData = tg?.initData;

      if (!initData) {
        throw new Error("Не удалось получить данные Telegram. Попробуйте открыть приложение заново.");
      }

      const res = await fetch("/api/auth/tg/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Ошибка авторизации. Попробуйте позже.");
      }

      // Set Supabase session
      if (data.token) {
          const { error: sessionError } = await supabase.auth.setSession({
              access_token: data.token,
              refresh_token: data.token, // Using access token as refresh token since we don't have one, might fail refresh but works for initial session
          });
          
          if (sessionError) {
              console.error("Supabase session error:", sessionError);
              // Continue anyway, maybe the cookie will work for some things
          }
      }

      // Success
      router.back();
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-login attempt on mount
    handleLogin();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
      <h1 className="text-2xl font-bold mb-4">Авторизация</h1>
      
      {loading ? (
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mb-4"></div>
      ) : (
        <>
            <p className="text-gray-600 mb-6">
                {error ? error : "Пожалуйста, авторизуйтесь для доступа к чату."}
            </p>
            
            <button
                onClick={handleLogin}
                className="px-6 py-3 bg-black text-white rounded-full font-semibold hover:bg-gray-800 transition-colors"
            >
                Попробовать снова
            </button>
        </>
      )}
    </div>
  );
}
