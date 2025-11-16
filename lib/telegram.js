"use client";

// Возвращает Telegram.WebApp или null
export function getTG() {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp || null;
}

// Проверка, что мы в Telegram Mini App
export function isTelegramEnv() {
  return !!getTG();
}

// Берём Telegram-пользователя из initDataUnsafe.user
export function getTelegramUser() {
  if (typeof window === "undefined") return null;

  const tg = window.Telegram?.WebApp;
  if (!tg) return null;

  return tg.initDataUnsafe?.user || null;
}

// Возвращаем user.id или null
export function getUserId() {
  const user = getTelegramUser();
  return user?.id || null;
}

/**
 * Инициализация UI мини-аппки
 */
export function initTelegramUI() {
  const tg = getTG();
  if (!tg) return;

  try {
    // Сообщаем Telegram, что всё загружено
    tg.ready();

    // Растягиваем мини-аппку на весь экран
    tg.expand();

    // Применяем тему Telegram к CSS-переменным
    const theme = tg.themeParams || {};
    const root = document.documentElement;

    Object.entries(theme).forEach(([key, val]) => {
      root.style.setProperty(`--tg-${key}`, val);
    });

    // Если понадобится BackButton — он тут
    // tg.BackButton.show();
    // tg.BackButton.onClick(() => window.history.back());

    // Если понадобится MainButton — он тут
    // tg.MainButton.setText("Опубликовать");
    // tg.MainButton.onClick(() => {
    //   document.querySelector('[data-submit="publish"]')?.click();
    // });
  } catch (err) {
    console.warn("Telegram UI init error:", err);
  }
}
