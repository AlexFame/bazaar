"use client";

import { useEffect, useState } from "react";
import { initTelegramUI, isTelegramEnv } from "@/lib/telegram";
import { LanguageProvider } from "@/lib/i18n-client";

import { ThemeProvider } from "next-themes";

export default function Providers({ children }) {
  const [inTG, setInTG] = useState(false);

  useEffect(() => {
    const inside = isTelegramEnv();
    setInTG(inside);
    if (inside) {
      document.body.classList.add("in-telegram");
      initTelegramUI();
    } else {
      document.body.classList.remove("in-telegram");
    }
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <LanguageProvider>{children}</LanguageProvider>
    </ThemeProvider>
  );
}
