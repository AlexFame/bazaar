"use client";

// Возвращает Telegram.WebApp или null
export function getTG() {
  if (typeof window === "undefined") return null;
  if (window.Telegram && window.Telegram.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

// Проверка, что мы в Telegram (WebApp или встроенный браузер)
export function isTelegramEnv() {
  if (typeof window === "undefined") return false;

  // 1) Нормальный WebApp (идеальный вариант)
  if (window.Telegram && window.Telegram.WebApp) {
    return true;
  }

  // 2) User-Agent содержит Telegram (мобильный / desktop in-app браузер)
  const ua = navigator.userAgent || "";
  if (/Telegram/i.test(ua)) {
    return true;
  }

  // 3) Открыто из t.me / web.telegram.org (рефerrer)
  const ref = document.referrer || "";
  if (/t\.me|web\.telegram\.org/i.test(ref)) {
    return true;
  }

  // 4) В URL есть признаки WebApp (на всякий случай)
  const url = window.location.href || "";
  if (/tgWebAppData=|telegram-web-app/i.test(url)) {
    return true;
  }

  // Иначе считаем, что это обычный браузер
  return false;
}

// Берём Telegram-пользователя из initDataUnsafe.user
export function getTelegramUser() {
  if (typeof window === "undefined") return null;

  const tg = getTG();
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
