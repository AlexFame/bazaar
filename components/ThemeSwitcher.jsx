"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <div className="flex bg-gray-100 dark:bg-zinc-800 rounded-full p-1 relative shadow-inner w-[90px]">
      {/* Moving Background */}
      <div 
        className={`absolute top-1 bottom-1 w-[41px] rounded-full transition-all duration-300 shadow-sm ${
          isDark 
            ? "translate-x-[45px] bg-red-600" 
            : "translate-x-0 bg-white"
        }`} 
      />

      <button
        onClick={() => setTheme("light")}
        className={`flex-1 flex items-center justify-center rounded-full relative z-10 p-1.5 transition-colors ${
           !isDark ? "text-gray-900" : "text-gray-400 hover:text-white"
        }`}
      >
        <SunIcon className="w-5 h-5" />
      </button>
      
      <button
        onClick={() => setTheme("dark")}
        className={`flex-1 flex items-center justify-center rounded-full relative z-10 p-1.5 transition-colors ${
           isDark ? "text-white" : "text-gray-400 hover:text-gray-900"
        }`}
      >
        <MoonIcon className="w-5 h-5" />
      </button>
    </div>
  );
}
