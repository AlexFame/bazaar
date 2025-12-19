"use client";

import { useLang } from "@/lib/i18n-client";
import { useState } from "react";

export default function ListingActions({ isOwner, listing, onEdit, onDelete, onPromote, onMarkReserved, onMarkSold }) {
    const { t } = useLang();
    const [isPromoting, setIsPromoting] = useState(false);

    if (!isOwner) return null;

    const handlePromoteClick = async () => {
        if (!window.Telegram?.WebApp) {
            // Fallback for browser testing
            onPromote(); 
            return;
        }

        try {
            setIsPromoting(true);
            
            // 1. Get first active service (urgent_sticker or boost_1d for testing)
            // In a real app, this would be a selection modal
            const response = await fetch('/api/payments/create-invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serviceId: 'urgent_sticker', // This should be dynamic based on selection
                    listingId: listing?.id,
                    initData: window.Telegram.WebApp.initData
                })
            });

            const data = await response.json();

            if (data.success && data.invoiceLink) {
                // 2. Open Native Telegram Invoice
                window.Telegram.WebApp.openInvoice(data.invoiceLink, (status) => {
                    console.log("Payment status:", status);
                    if (status === 'paid') {
                        window.Telegram.WebApp.showPopup({
                            title: 'Успешно',
                            message: 'Оплата прошла успешно! Ваше объявление скоро будет обновлено.',
                            buttons: [{ type: 'ok' }]
                        });
                    } else if (status === 'cancelled') {
                        // User closed invoice
                    } else {
                        window.Telegram.WebApp.showAlert('Ошибка при оплате: ' + status);
                    }
                });
            } else {
                window.Telegram.WebApp.showAlert(data.error || 'Не удалось создать счет на оплату');
            }
        } catch (error) {
            console.error("Promote error:", error);
            window.Telegram.WebApp.showAlert('Произошла ошибка при инициализации оплаты');
        } finally {
            setIsPromoting(false);
        }
    };

    return (
        <div className="mb-4">
             {/* Promote button */}
            <div className="mt-3 pt-3 border-t border-gray-100">
            <button
                onClick={handlePromoteClick}
                disabled={isPromoting}
                className={`w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 ${isPromoting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <span>{isPromoting ? "⌛" : "🚀"}</span>
                <span>{isPromoting ? "Обработка..." : t("premium_services_title")}</span>
            </button>
            </div>
            
            {/* Status Actions */}
            <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                    onClick={onMarkReserved}
                    className="py-2.5 px-3 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-xl hover:bg-indigo-200 transition-colors"
                >
                    {t("mark_reserved") || "Забронировать"}
                </button>
                <button
                    onClick={onMarkSold}
                    className="py-2.5 px-3 bg-gray-100 text-gray-800 text-xs font-bold rounded-xl hover:bg-gray-200 transition-colors"
                >
                    {t("mark_sold") || "Продано"}
                </button>
            </div>
            
            {/* Edit/Delete buttons */}
            <div className="flex gap-2 mt-3">
            <button
                onClick={onEdit}
                className="flex-1 py-2 px-3 bg-black text-white text-xs font-semibold rounded-full hover:bg-black/80 transition-colors"
            >
                {t("edit")}
            </button>
            <button
                onClick={onDelete}
                className="flex-1 py-2 px-3 bg-red-600 text-white text-xs font-semibold rounded-full hover:bg-red-700 transition-colors"
            >
                {t("delete")}
            </button>
            </div>
        </div>
    );
}
