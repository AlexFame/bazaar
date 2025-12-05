"use client";
import BackButton from "@/components/BackButton";
import { useLang } from "@/lib/i18n-client";

export default function MyOrdersPage() {
  const { lang, t } = useLang();
  
  const translations = {
      ru: {
          title: "Мои покупки",
          empty: "Здесь будет история ваших покупок.",
          subtitle: "Пока функционал в разработке."
      },
      ua: {
          title: "Мої покупки",
          empty: "Тут буде історія ваших покупок.",
          subtitle: "Поки функціонал у розробці."
      },
      en: {
          title: "My Orders",
          empty: "Your purchase history will be here.",
          subtitle: "Feature under development."
      }
  };
  
  const local = translations[lang] || translations.ru;

  return (
    <div className="w-full flex justify-center mt-4 px-3">
        <div className="w-full max-w-md">
            <BackButton />
            <h1 className="text-xl font-bold mb-4 mt-2">{local.title}</h1>
            
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
                <div className="text-4xl mb-3">🛍️</div>
                <h3 className="text-lg font-medium mb-2">{local.empty}</h3>
                <p className="text-gray-400 text-sm">{local.subtitle}</p>
            </div>
        </div>
    </div>
  );
}
