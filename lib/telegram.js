// lib/telegram.js
export function getTG() {
  // Возвращает Telegram.WebApp или null
  if (typeof window === "undefined") return null;
  return window.Telegram && window.Telegram.WebApp
    ? window.Telegram.WebApp
    : null;
}

export function isTelegramEnv() {
  return !!getTG();
}

/**
 * Инициализация: ready(), expand(), тема, обработчики
 */
export function initTelegramUI() {
  const tg = getTG();
  if (!tg) return;

  try {
    // Сообщаем Телеге, что UI готов
    tg.ready();

    // Занять всю высоту
    tg.expand();

    // Применяем тему Телеги к body через CSS-переменные
    const theme = tg.themeParams || {};
    const root = document.documentElement;
    Object.entries(theme).forEach(([k, v]) => {
      root.style.setProperty(`--tg-${k}`, v);
    });

    // Кнопка "Назад" (если нужно)
    // tg.BackButton.show();
    // tg.BackButton.onClick(() => window.history.back());

    // Главная кнопка (пример; отключена по умолчанию)
    // tg.MainButton.setText("Опубликовать");
    // tg.MainButton.onClick(() => {
    //   const btn = document.querySelector('[data-submit="publish"]');
    //   btn?.click();
    // });
  } catch (e) {
    console.warn("Telegram init error:", e);
  }
}
