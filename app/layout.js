import "../styles/globals.css";
import Providers from "./providers";
import AppShell from "@/components/AppShell";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/sonner";
import { Suspense } from "react";
import Script from "next/script";

export const metadata = {
  title: {
    default: "Bazaar - Доска объявлений",
    template: "%s | Bazaar"
  },
  description: "Покупайте и продавайте товары, находите услуги и общайтесь с продавцами в вашем городе. Бесплатная доска объявлений в Telegram.",
  keywords: ["объявления", "купить", "продать", "доска объявлений", "маркетплейс", "telegram", "bazaar"],
  authors: [{ name: "Bazaar" }],
  creator: "Bazaar",
  publisher: "Bazaar",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "Bazaar - Доска объявлений",
    description: "Покупайте и продавайте товары в вашем городе",
    url: "https://bazaar.vercel.app",
    siteName: "Bazaar",
    locale: "ru_RU",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add your verification codes when ready
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
  },
};

// важно для мобильной верстки и Telegram WebApp
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="min-h-screen">
        <ErrorBoundary>
          <Providers>
            <div className="telegram-container">
              <Suspense fallback={null}>
                <AppShell>{children}</AppShell>
              </Suspense>
              <Toaster />
            </div>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
