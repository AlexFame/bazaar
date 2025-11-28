"use client";

import { useState } from "react";
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
          setError(t.login_review || "Войдите, чтобы отправить жалобу");
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
      setError(t.report_error || "Ошибка отправки жалобы");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="text-xs text-gray-400 hover:text-red-500 underline"
      >
        {t.report_button || "Пожаловаться"}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-4 shadow-xl relative">
        <button 
            onClick={() => setIsOpen(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-black"
        >
            ✕
        </button>
        <h3 className="font-semibold mb-3">{t.report_button || "Пожаловаться"}</h3>
        
        {success ? (
            <div className="text-green-600 text-center py-4">
                {t.report_success || "Спасибо! Жалоба отправлена."}
            </div>
        ) : (
            <form onSubmit={handleSubmit}>
                <textarea
                    className="w-full border border-gray-300 rounded-xl p-3 text-sm mb-3 resize-none focus:outline-none focus:border-black"
                    rows={3}
                    placeholder={t.report_reason_ph || "Опишите причину..."}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                />
                
                {error && <div className="text-red-500 text-xs mb-2">{error}</div>}

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="flex-1 py-2 rounded-xl border border-gray-300 text-sm hover:bg-gray-50"
                    >
                        {t.cancel || "Отмена"}
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-medium disabled:opacity-50 hover:bg-red-600"
                    >
                        {loading ? "..." : (t.send || "Отправить")}
                    </button>
                </div>
            </form>
        )}
      </div>
    </div>
  );
}
