"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";
import { getTG } from "@/lib/telegram";

export default function TelegramThemeSync() {
  const { theme, resolvedTheme } = useTheme();

  useEffect(() => {
    const tg = getTG();
    if (!tg) return;

    const isDark = theme === "dark" || resolvedTheme === "dark";
    const color = isDark ? "#000000" : "#ffffff";

    try {
      // Устанавливаем цвет хедера
      tg.setHeaderColor(color);
      
      // Устанавливаем цвет фона самого Telegram WebApp (рамки)
      tg.setBackgroundColor(color);
      
      // Если поддерживается, можно и bottom bar покрасить (в новых версиях)
      if (tg.setBottomBarColor) {
        tg.setBottomBarColor(color);
      }
    } catch (e) {
      console.warn("Error syncing Telegram theme:", e);
    }
  }, [theme, resolvedTheme]);

  return null;
}
