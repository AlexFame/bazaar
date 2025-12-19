"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useLang } from "@/lib/i18n-client";
import { getTG } from "@/lib/telegram";
import { motion, AnimatePresence } from "framer-motion";

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
        alert(t("premium_login_alert") || "Пожалуйста, войдите в систему");
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
        alert(`${t("premium_error_create") || "Ошибка создания платежа: "}${data.error}\n${data.details?.description || JSON.stringify(data.details) || ""}`);
        setPurchasing(null);
        return;
      }

      // Open Telegram payment
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
      alert(t("premium_error_create") || "Ошибка при создании платежа");
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
      urgent_sticker: "from-orange-500 to-red-500",
      boost_1d: "from-blue-400 to-blue-600",
      boost_3d: "from-violet-500 to-purple-600",
      pin_7d: "from-amber-400 to-amber-600",
      combo_7d: "from-fuchsia-500 to-pink-600",
    };
    return colors[serviceType] || "from-gray-500 to-gray-700";
  };

  // Determine if it should interact as a bottom sheet (mobile) or modal (desktop)
  // We'll use CSS media queries in the class names for responsiveness

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container Wrapper */}
          <div className="fixed inset-0 z-[101] flex items-end sm:items-center justify-center pointer-events-none p-0 sm:p-4">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300, mass: 0.8 }}
              className="w-full max-w-lg bg-[#F2F2F7] dark:bg-black sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[85vh] sm:max-h-[90vh]"
            >
              {/* Header */}
              <div className="relative pt-3 pb-4 px-5 bg-white dark:bg-[#1C1C1E] border-b border-gray-200 dark:border-white/5 z-20 shrink-0">
                {/* Mobile Drag Handle */}
                <div className="w-10 h-1 bg-gray-300 dark:bg-white/20 rounded-full mx-auto mb-4 sm:hidden" />
                
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-[19px] font-bold text-black dark:text-white leading-tight">
                      {t("premium_services_title") || "Продвижение"}
                    </h2>
                    <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {t("premium_subtitle") || "Ускорьте продажу товара"}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto flex-1 p-4 pb-24 space-y-3 overscroll-contain bg-[#F2F2F7] dark:bg-black">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="w-8 h-8 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-gray-400 font-medium">{t("loading") || "Загрузка..."}</span>
                  </div>
                ) : (
                  services.map((service) => {
                    const isRecommended = service.features?.recommended;
                    return (
                      <div
                        key={service.id}
                        className={`group relative overflow-hidden rounded-2xl transition-all duration-300 ${
                          isRecommended
                            ? "bg-white dark:bg-[#1C1C1E] ring-[1.5px] ring-[#FF385C] shadow-lg shadow-[#FF385C]/15"
                            : "bg-white dark:bg-[#1C1C1E] shadow-sm border border-gray-200 dark:border-white/5"
                        }`}
                      >
                         {/* Recommended Badge */}
                        {isRecommended && (
                          <div className="absolute top-0 right-0 bg-[#FF385C] text-white text-[9px] uppercase font-bold px-2.5 py-1 rounded-bl-xl z-10 tracking-wider shadow-sm">
                            {lang === 'en' ? 'Best Value' : lang === 'ua' ? 'Хіт' : 'Хит продаж'}
                          </div>
                        )}

                        <div className="p-4 flex flex-col gap-3">
                            {/* Top Row: Icon + Info */}
                            <div className="flex items-start gap-3.5">
                                <div className="w-[46px] h-[46px] shrink-0 bg-gray-50 dark:bg-white/5 rounded-xl flex items-center justify-center text-2xl shadow-inner border border-black/5 dark:border-white/5">
                                    {getServiceIcon(service.service_type)}
                                </div>
                                
                                <div className="flex-1 min-w-0 pt-0.5">
                                    <div className="flex items-center gap-2 mb-1 pr-14">
                                        <h3 className="text-[15px] font-bold text-gray-900 dark:text-white leading-tight">
                                            {getServiceName(service)}
                                        </h3>
                                        {/* Duration Badge Moved Here */}
                                        {service.duration_days > 0 && (
                                            <span className="shrink-0 px-1.5 py-0.5 bg-gray-100 dark:bg-white/10 rounded-md text-[10px] font-semibold text-gray-500 dark:text-gray-400 border border-black/5 dark:border-white/5">
                                                {service.duration_days} {
                                                    lang === 'en' ? "d" :
                                                    lang === 'ua' ? "дн" :
                                                    "дн"
                                                }
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-snug">
                                        {getServiceDescription(service)}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Bottom Row: Button Only (Full Width) */}
                            <div className="flex items-center mt-1">
                                <button
                                    onClick={() => handlePurchase(service)}
                                    disabled={purchasing === service.id}
                                    className={`flex-1 relative overflow-hidden h-[42px] rounded-xl font-bold text-white shadow-md active:scale-[0.98] transition-all bg-gradient-to-r ${getServiceColor(service.service_type)} hover:brightness-110`}
                                >
                                    <div className="absolute inset-0 bg-white/0 hover:bg-white/10 transition-colors" />
                                    {purchasing === service.id ? (
                                        <div className="flex items-center justify-center gap-2 h-full">
                                            <div className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center gap-1.5 h-full relative z-10">
                                            <span className="text-[15px]">{service.price_stars} ⭐️</span>
                                            <span className="text-[12px] text-white/90 font-medium">
                                                (~€{(service.price_stars * 0.021).toFixed(2)})
                                            </span>
                                        </div>
                                    )}
                                </button>
                            </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer Info */}
              <div className="p-3 bg-gray-50 dark:bg-[#1C1C1E] border-t border-gray-200 dark:border-white/5 text-center shrink-0 safe-area-bottom">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">
                    {lang === 'en' ? 'Support Apple Pay, Cards & Telegram Stars' : 
                     lang === 'ua' ? 'Підтримка Apple Pay, карток та Telegram Stars' : 
                     'Поддержка Apple Pay, карт и Telegram Stars'}
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
