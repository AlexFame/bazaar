"use client";

import { useLang } from "@/lib/i18n-client";

export default function ListingActions({ isOwner, listing, onEdit, onDelete, onPromote, onMarkReserved, onMarkSold }) {
    const { t } = useLang();

    if (!isOwner) return null;

    return (
        <div className="mb-4">
            <button
                onClick={onPromote}
                className="w-full py-3.5 px-4 bg-[#007AFF] text-white text-[17px] font-semibold rounded-[14px] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
            >
                <span>🚀</span>
                <span>{t("promote") || "Продвинуть"}</span>
            </button>
            
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
