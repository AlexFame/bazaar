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

    // Устанавливаем цвета хедера и фона для WebApp
    // Чтобы не было белых полос при скролле
    if (tg.colorScheme === 'dark') {
      tg.setHeaderColor('#000000');
      tg.setBackgroundColor('#000000');
    } else {
      tg.setHeaderColor('#ffffff');
      tg.setBackgroundColor('#ffffff');
    }

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

/**
 * Check if Telegram account is old enough (anti-bot measure)
 * @param {number} minDays - Minimum account age in days (default: 7)
 * @returns {object} - { allowed: boolean, reason: string }
 */
export function checkTelegramAccountAge(minDays = 7) {
  const user = getTelegramUser();
  
  if (!user || !user.id) {
    return { allowed: false, reason: "Не удалось получить данные Telegram" };
  }

  // Telegram user IDs are sequential and started from ~1 in 2013
  // Approximate creation date based on user ID
  // This is a heuristic - not 100% accurate but good enough for bot detection
  
  // Average IDs per day (very rough estimate):
  // ~2013: ID 1
  // ~2024: ID ~7,000,000,000
  // That's ~11 years = ~4000 days
  // So roughly ~1,750,000 IDs per day
  
  const TELEGRAM_START_TIMESTAMP = new Date('2013-08-14').getTime(); // Telegram launch date
  const IDS_PER_DAY = 1750000; // Rough estimate
  
  const estimatedCreationTimestamp = TELEGRAM_START_TIMESTAMP + (user.id / IDS_PER_DAY) * 24 * 60 * 60 * 1000;
  const accountAgeMs = Date.now() - estimatedCreationTimestamp;
  const accountAgeDays = accountAgeMs / (24 * 60 * 60 * 1000);
  
  if (accountAgeDays < minDays) {
    return { 
      allowed: false, 
      reason: `Аккаунт Telegram слишком новый. Требуется минимум ${minDays} дней.`
    };
  }
  
  return { allowed: true, reason: "" };
}
