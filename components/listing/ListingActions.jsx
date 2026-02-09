"use client";

import { useLang } from "@/lib/i18n-client";

export default function ListingActions({ isOwner, listing, onEdit, onDelete, onPromote, onMarkReserved, onMarkSold, onPublish }) {
    const { t } = useLang();

    if (!isOwner) return null;
    const status = listing.status || 'active';

    return (
        <div className="mb-4">
            {/* DRAFT STATE */}
            {status === 'draft' && (
                <button
                    onClick={onPublish}
                    className="w-full mb-3 py-3.5 px-4 bg-green-600 text-white text-[17px] font-bold rounded-[14px] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm shadow-green-200"
                >
                    🚀 <span>{t("publish") || "Опубликовать"}</span>
                </button>
            )}

            {/* ACTIVE STATE */}
            {status === 'active' && (
                <>
                    <button
                        onClick={onPromote}
                        className="w-full mb-3 py-3.5 px-4 bg-[#007AFF] text-white text-[17px] font-semibold rounded-[14px] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                        <span>{t("promote") || "Продвинуть"}</span>
                    </button>
                    
                    <div className="grid grid-cols-2 gap-2 mb-3">
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
                </>
            )}

            {/* RESERVED STATE */}
            {status === 'reserved' && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                    <button
                        onClick={onPublish} // Re-activate
                        className="py-2.5 px-3 bg-green-100 text-green-800 text-xs font-bold rounded-xl hover:bg-green-200 transition-colors"
                    >
                        {t("activate_again") || "Вернуть"}
                    </button>
                    <button
                        onClick={onMarkSold}
                        className="py-2.5 px-3 bg-gray-100 text-gray-800 text-xs font-bold rounded-xl hover:bg-gray-200 transition-colors"
                    >
                        {t("mark_sold") || "Продано"}
                    </button>
                </div>
            )}

            {/* CLOSED STATE */}
            {status === 'closed' && (
                <button
                    onClick={onPublish} // Re-activate
                    className="w-full mb-3 py-3 px-4 bg-gray-100 text-gray-800 text-sm font-bold rounded-xl hover:bg-gray-200 transition-colors"
                >
                    {t("activate_again") || "Активировать снова"}
                </button>
            )}
            
            {/* Common Actions (Edit/Delete) */}
            <div className="flex gap-2">
                <button
                    onClick={onEdit}
                    className="flex-1 py-2 px-3 bg-white border border-gray-200 text-black text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                    {t("edit")}
                </button>
                <button
                    onClick={onDelete}
                    className="flex-1 py-2 px-3 bg-red-50 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors"
                >
                    {t("delete")}
                </button>
            </div>
        </div>
    );
}
