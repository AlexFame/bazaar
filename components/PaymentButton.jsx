"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n-client";

export default function PaymentButton({ listingId, amount, listingTitle }) {
  const { t } = useLang();
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/payments/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          amount,
        }),
      });

      const { url, error } = await response.json();

      if (error) {
        alert("Ошибка создания платежа: " + error);
        return;
      }

      // Redirect to Stripe checkout
      window.location.href = url;
    } catch (error) {
      console.error("Payment error:", error);
      alert("Произошла ошибка при создании платежа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={loading}
      className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-semibold text-sm hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Загрузка...
        </>
      ) : (
        <>
          🔒 Безопасная оплата {amount}€
        </>
      )}
    </button>
  );
}
