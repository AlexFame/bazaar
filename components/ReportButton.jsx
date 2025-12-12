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
        <span className="text-xs font-medium">{t("btn_report") || "Пожаловаться"}</span>
      </button>
      
      {/* Modal - Portaled */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-sm bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl p-6 ring-1 ring-black/5 dark:ring-white/10 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-4 text-center dark:text-white">
              {success ? (t("report_thanks") || "Спасибо!") : (t("report_title") || "Пожаловаться")}
            </h3>

            {success ? (
              <div className="flex flex-col items-center justify-center py-4">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    {t("report_sent") || "Ваша жалоба отправлена модераторам."}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-xs font-semibold mb-1.5 ml-1 dark:text-gray-300">
                    {t("report_reason_label") || "Причина жалобы"}
                  </label>
                  <textarea
                    required
                    rows={3}
                    className="w-full bg-gray-50 dark:bg-neutral-800 border-0 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-black dark:focus:ring-white resize-none"
                    placeholder={t("report_reason_ph") || "Опишите проблему..."}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10 transition-colors"
                  >
                    {t("cancel") || "Отмена"}
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !reason.trim()}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-red-500/20"
                  >
                    {loading ? "..." : (t("report_submit") || "Отправить")}
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
