"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import { useLang } from "@/lib/i18n-client";

export default function ReportButton({ targetId, targetType = "listing" }) {
  const { t } = useLang();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
          setError(t("login_review") || "Войдите, чтобы отправить жалобу");
          setLoading(false);
          return;
      }

      const { error: insertError } = await supabase
        .from("reports")
        .insert({
          reporter_id: user.id,
          target_type: targetType,
          target_id: targetId,
          reason: reason.trim(),
          status: "pending"
        });

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => {
          setIsOpen(false);
          setSuccess(false);
          setReason("");
      }, 2000);

    } catch (err) {
      console.error("Report error:", err);
      setError(t("report_error") || "Ошибка отправки жалобы");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-100/80 dark:bg-white/10 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95 transition-all text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
        </svg>
        <span className="text-xs font-medium">{t("report_button")}</span>
      </button>
      
      {/* Modal - Portaled */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-sm p-4 shadow-xl relative mb-4 mx-2"
            onClick={(e) => e.stopPropagation()} 
          >
            <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-2 right-2 text-gray-400 hover:text-black"
            >
                ✕
            </button>
            <h3 className="font-semibold mb-3">{t("report_button") || "Пожаловаться"}</h3>
            
            {success ? (
                <div className="text-green-600 text-center py-4">
                    {t("report_success") || "Спасибо! Жалоба отправлена."}
                </div>
            ) : (
                <form onSubmit={handleSubmit}>
                    <textarea
                        className="w-full border border-gray-300 rounded-xl p-3 text-sm mb-3 resize-none focus:outline-none focus:border-black"
                        rows={3}
                        placeholder={t("report_reason_ph") || "Опишите причину..."}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        required
                    />
                    
                    {error && <div className="text-red-500 text-xs mb-2">{error}</div>}

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="flex-1 py-2 rounded-xl border border-gray-300 text-sm hover:bg-gray-50 dark:text-black"
                        >
                            {t("cancel") || "Отмена"}
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-medium disabled:opacity-50 hover:bg-red-600"
                        >
                            {loading ? "..." : (t("send") || "Отправить")}
                        </button>
                    </div>
                </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
