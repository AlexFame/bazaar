"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { isTelegramEnv, getTG } from "@/lib/telegram";

export function TelegramThemeSync() {
  const { setTheme } = useTheme();

  useEffect(() => {
    if (!isTelegramEnv()) return;

    const tg = getTG();
    if (!tg) return;

    // Apply initial theme from Telegram
    const applyTheme = () => {
      const colorScheme = tg.colorScheme; // 'light' or 'dark'
      if (colorScheme) {
        setTheme(colorScheme);
        // Force background colors if needed, but next-themes should handle 'class' toggle
      }
    };

    applyTheme();

    // Listen for theme changes (Telegram WebApp event)
    // Unfortunately, Telegram doesn't have a direct 'themeChanged' event in older versions,
    // but we can listen to 'theme_changed' if supported, or just rely on init.
    tg.onEvent("themeChanged", applyTheme);

    return () => {
      tg.offEvent("themeChanged", applyTheme);
    };
  }, [setTheme]);

  return null;
}
