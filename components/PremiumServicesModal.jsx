"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useLang } from "@/lib/i18n-client";
import { getTG } from "@/lib/telegram";

export default function PremiumServicesModal({ listingId, isOpen, onClose }) {
  const { t, lang } = useLang();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      fetchServices();
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const fetchServices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("premium_services")
      .select("*")
      .eq("is_active", true)
      .order("price_stars", { ascending: true });

    if (!error && data) {
      setServices(data);
    }
    setLoading(false);
  };

  const handlePurchase = async (service) => {
    setPurchasing(service.id);

    try {
      // Get session for auth
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Get Telegram initData
      const tg = getTG();
      const initData = tg?.initData;

      if (!token && !initData) {
        alert("Пожалуйста, войдите в систему");
        setPurchasing(null);
        return;
      }

      // Create invoice
      const response = await fetch("/api/payments/create-invoice", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          serviceId: service.id,
          listingId,
          initData, // Send initData for verification
        }),
      });

      const data = await response.json();

      if (!data.success) {
        console.error("Payment creation failed:", data);
        alert(`Ошибка создания платежа: ${data.error}\n${data.details?.description || JSON.stringify(data.details) || ""}`);
        setPurchasing(null);
        return;
      }

      // Open Telegram payment
      // tg is already defined above
      if (tg?.openInvoice) {
        tg.openInvoice(data.invoiceLink, (status) => {
          if (status === "paid") {
            alert(t("payment_success") || "✅ Оплата успешна! Услуга активирована.");
            onClose();
          } else if (status === "cancelled") {
            console.log("Payment cancelled");
          } else if (status === "failed") {
            alert(t("payment_failed") || "❌ Оплата не удалась. Попробуйте снова.");
          }
          setPurchasing(null);
        });
      } else {
        // Fallback: open link directly
        window.open(data.invoiceLink, "_blank");
        setPurchasing(null);
      }
    } catch (error) {
      console.error("Purchase error:", error);
      alert("Ошибка при создании платежа");
      setPurchasing(null);
    }
  };

  const getServiceName = (service) => {
    if (lang === "ru") return service.name_ru;
    if (lang === "ua") return service.name_ua;
    return service.name_en;
  };

  const getServiceDescription = (service) => {
    if (lang === "ru") return service.description_ru;
    if (lang === "ua") return service.description_ua;
    return service.description_en;
  };

  const getServiceIcon = (serviceType) => {
    const icons = {
      urgent_sticker: "🔥",
      boost_1d: "⬆️",
      boost_3d: "🚀",
      pin_7d: "📌",
      combo_7d: "⭐️",
    };
    return icons[serviceType] || "✨";
  };

  const getServiceColor = (serviceType) => {
    const colors = {
      urgent_sticker: "from-red-500 to-orange-500",
      boost_1d: "from-blue-500 to-cyan-500",
      boost_3d: "from-purple-500 to-pink-500",
      pin_7d: "from-yellow-500 to-amber-500",
      combo_7d: "from-indigo-500 via-purple-500 to-pink-500",
    };
    return colors[serviceType] || "from-gray-500 to-gray-600";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 animate-fade-in overscroll-contain">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Scrollable Area */}
        <div className="overflow-y-auto flex-1 overscroll-contain">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 p-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-black dark:text-white">
            🚀 {t("premium_services_title") || "Продвижение объявления"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Services */}
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            services.map((service, index) => (
              <div
                key={service.id}
                className={`relative overflow-hidden rounded-2xl border-2 ${
                  service.features?.recommended
                    ? "border-purple-500"
                    : "border-gray-200 dark:border-gray-700"
                } transition-all hover:scale-[1.02] hover:shadow-lg`}
              >
                {/* Recommended badge */}
                {service.features?.recommended && (
                  <div className="absolute top-2 right-2 bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    ⭐️ Популярное
                  </div>
                )}

                <div className="p-4">
                  {/* Icon and name */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{getServiceIcon(service.service_type)}</span>
                      <div>
                        <h3 className="font-bold text-black dark:text-white">
                          {getServiceName(service)}
                        </h3>
                        {service.duration_days && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {service.duration_days} {service.duration_days === 1 ? "день" : service.duration_days <= 4 ? "дня" : "дней"}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-black dark:text-white">
                        {service.price_stars} ⭐️
                      </div>
                      <div className="text-xs text-gray-500">
                        ≈ €{(service.price_stars * 0.015).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                    {getServiceDescription(service)}
                  </p>

                  {/* Buy button */}
                  <button
                    onClick={() => handlePurchase(service)}
                    disabled={purchasing === service.id}
                    className={`w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r ${getServiceColor(
                      service.service_type
                    )} hover:opacity-90 transition-opacity disabled:opacity-50`}
                  >
                    {purchasing === service.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Загрузка...
                      </span>
                    ) : (
                      `${t("buy_for") || "Купить за"} ${service.price_stars} ⭐️`
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        </div>
        {/* Info - Fixed at bottom */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400 text-center">
          {t("payment_stars") || "💡 Оплата через Telegram Stars. Безопасно и мгновенно."}
        </div>
      </div>
    </div>
  );
}
