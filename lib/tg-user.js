"use client";

export function getTelegramUser() {
  if (typeof window === "undefined") return null;

  const tg = window.Telegram?.WebApp;
  if (!tg) return null;

  const user = tg.initDataUnsafe?.user || null;

  return user;
}
