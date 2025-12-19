"use client";

import { useLang } from "@/lib/i18n-client";

export default function ListingActions({ isOwner, listing, onEdit, onDelete, onPromote, onMarkReserved, onMarkSold }) {
    const { t } = useLang();

    if (!isOwner) return null;

    return (
        <div className="mb-4">
             <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-2">
            <button
                onClick={onPromote}
                className="w-full py-3 px-4 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
                <span>⭐️</span>
                <span>Продвинуть (Telegram Stars)</span>
            </button>

            <button
                onClick={() => {
                   const url = 'https://buy.stripe.com/test_5kQ3cueKcdOj0pS15d2cg00';
                   if (window.Telegram?.WebApp) {
                       // Navigate within the WebView to keep it inside Telegram
                       window.location.href = url;
                   } else {
                       window.open(url, '_blank');
                   }
                }}
                className="w-full py-3 px-4 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
                <span>💳</span>
                <span>Оплата</span>
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
