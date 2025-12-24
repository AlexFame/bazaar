"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useLang } from "@/lib/i18n-client";
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
      .order("price", { ascending: true }); // Ordered by price directly (in cents)

    if (!error && data) {
      setServices(data);
    }
    setLoading(false);
  };

  const handlePurchase = async (service) => {
    setPurchasing(service.id);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const tg = window.Telegram?.WebApp;
      const initData = tg?.initData;

      if (!token && !initData) {
        alert(t("premium_login_alert") || "Please log in");
        setPurchasing(null);
        return;
      }

      const response = await fetch("/api/payments/create-session", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          serviceId: service.id,
          listingId,
          initData: !token ? initData : undefined
        }),
      });

      const data = await response.json();

      if (!data.success || !data.url) {
        console.error("Payment session creation failed:", data);
        alert(`${t("premium_error_create") || "Error creating payment"}: ${data.error || "Unknown error"}`);
        setPurchasing(null);
        return;
      }

      window.location.href = data.url;

    } catch (error) {
      console.error("Purchase error:", error);
      alert(t("premium_error_create") || "Error creating payment");
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
    // Cleaner, monotone or simple colored icons could be better, 
    // but emojis are reliable. Let's keep them but make container cleaner.
    const icons = {
      urgent_sticker: "🔥",
      boost_1d: "⬆️",
      boost_3d: "🚀",
      pin_7d: "📌",
      combo_7d: "⭐️",
    };
    return icons[serviceType] || "✨";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md"
          />

          <div className="fixed inset-0 z-[101] flex items-end sm:items-center justify-center pointer-events-none p-0 sm:p-4">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 350, mass: 0.8 }}
              className="w-full max-w-[440px] bg-[#F2F2F7] dark:bg-black sm:rounded-[28px] rounded-t-[28px] shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="pt-5 pb-4 px-6 bg-white dark:bg-[#1C1C1E] z-20 shrink-0 flex items-center justify-between sticky top-0">
                <div>
                  <h2 className="text-[20px] font-bold text-black dark:text-white tracking-tight leading-none">
                    {t("premium_services_title") || "Продвижение"}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-[#2C2C2E] text-gray-500 dark:text-white/60 hover:bg-gray-200 dark:hover:bg-[#3A3A3C] transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto flex-1 p-4 space-y-3 bg-[#F2F2F7] dark:bg-black">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-6 h-6 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  services.map((service) => {
                    const isRecommended = service.features?.recommended;
                    return (
                      <div
                        key={service.id}
                        onClick={() => handlePurchase(service)}
                        className={`group relative overflow-hidden rounded-[20px] transition-all duration-200 active:scale-[0.98] cursor-pointer ${
                          isRecommended
                            ? "bg-white dark:bg-[#1C1C1E] ring-2 ring-[#007AFF] z-10"
                            : "bg-white dark:bg-[#1C1C1E]"
                        }`}
                      >
                         {/* Selection Indicator on Tap */}
                         
                        <div className="p-4 flex items-center justify-between gap-4">
                            {/* Left: Icon & Text */}
                            <div className="flex items-center gap-4 flex-1">
                                <div className="w-12 h-12 shrink-0 bg-blue-50 dark:bg-[#007AFF]/10 rounded-2xl flex items-center justify-center text-2xl">
                                    {getServiceIcon(service.service_type)}
                                </div>
                                
                                <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-[17px] font-semibold text-black dark:text-white leading-tight">
                                            {getServiceName(service)}
                                        </h3>
                                        {isRecommended && (
                                            <span className="bg-[#007AFF] text-white text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-[4px]">
                                                {lang === 'en' ? 'HIT' : 'ХИТ'}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-snug">
                                        {getServiceDescription(service)}
                                    </p>
                                </div>
                            </div>

                            {/* Right: Price Button */}
                            <button
                                disabled={purchasing === service.id}
                                className={`shrink-0 h-9 px-4 rounded-full font-semibold text-[15px] transition-all flex items-center justify-center min-w-[80px] ${
                                    isRecommended
                                    ? "bg-[#007AFF] text-white"
                                    : "bg-gray-100 dark:bg-[#2C2C2E] text-black dark:text-white"
                                }`}
                            >
                                {purchasing === service.id ? (
                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                       €{(service.price / 100).toFixed(2)}
                                    </>
                                )}
                            </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Secure Footer */}
              <div className="p-4 bg-gray-50 dark:bg-[#1C1C1E] text-center shrink-0">
                <div className="flex items-center justify-center gap-1.5 opacity-60 grayscale hover:grayscale-0 transition-all">
                    <svg className="w-3 h-3 text-[#635BFF]" viewBox="0 0 32 32" fill="currentColor">
                        <path d="M27.5 16c0-6.35-5.15-11.5-11.5-11.5S4.5 9.65 4.5 16 9.65 27.5 16 27.5 27.5 22.35 27.5 16z" />
                    </svg> 
                    <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                        {t("secured_by_stripe") || "Payments by Stripe"}
                    </span>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

