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
        <span className="text-xs font-medium">{t("report_button") || "Пожаловаться"}</span>
      </button>
      
      {/* Modal - Portaled */}
      {isOpen && typeof document !== 'undefined' && createPortal(
                </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
