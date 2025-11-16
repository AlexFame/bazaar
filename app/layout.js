import "../styles/globals.css";
import Providers from "./providers";
import AppShell from "@/components/AppShell";
import { Suspense } from "react";

export const metadata = {
  title: "Bazaar",
  description: "Мини маркетплейс Bazaar",
};

// важно для мобильной верстки и Telegram WebApp
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body className="min-h-screen">
        <Providers>
          <div className="telegram-container">
            {/* ВОТ ЭТО НОВОЕ */}
            <Suspense fallback={null}>
              <AppShell>{children}</AppShell>
            </Suspense>
          </div>
        </Providers>
      </body>
    </html>
  );
}
