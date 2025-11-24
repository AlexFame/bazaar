"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";
import { getTG } from "@/lib/telegram";

export default function TelegramThemeSync() {
  const { theme, resolvedTheme } = useTheme();

  useEffect(() => {
    const tg = getTG();
    if (!tg) return;

    const isDark = theme === "dark" || resolvedTheme === "dark" || tg.colorScheme === "dark";
    const color = isDark ? "#000000" : "#ffffff";

    // 1. Update Telegram WebApp
    try {
      tg.setHeaderColor(color);
      tg.setBackgroundColor(color);
      if (tg.setBottomBarColor) {
        tg.setBottomBarColor(color);
      }
    } catch (e) {
      console.warn("Error syncing Telegram theme:", e);
    }

    // 2. Update Browser Meta Tag (for PWA/Mobile Browser edges)
    try {
      let meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = "theme-color";
        document.head.appendChild(meta);
      }
      meta.content = color;
    } catch (e) {
      console.warn("Error syncing meta theme-color:", e);
    }
  }, [theme, resolvedTheme]);

  return null;
}
